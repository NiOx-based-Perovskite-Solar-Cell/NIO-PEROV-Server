import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  FileResult,
  IngestData,
  LoadData,
  PipelineState,
  QcIssue,
  StepName,
} from './interface/clean-data.types';
import { PIPELINE_STEPS } from './interface/clean-data.types';
import { QcCollector } from './lib/qc';
import { IngestInput, IngestStep } from './steps/01-ingest.step';
import { StructureStep } from './steps/02-structure.step';
import { StandardizeStep } from './steps/03-standardize.step';
import { ResolveStep } from './steps/04-resolve.step';
import { ValidateStep } from './steps/05-validate.step';
import { LoadStep } from './steps/06-load.step';

export interface RunOptions {
  // Stop after this step and return its state (to inspect one step at a time)
  until?: StepName;
  // Called with the state after every step (the CLI uses it to dump each step)
  onStep?: (state: PipelineState<unknown>) => void;
}

export interface BatchSummary {
  files: number;
  by_status: Record<string, number>;
  errors_by_rule: Record<string, number>;
  warnings_by_rule: Record<string, number>;
}

type AnyState = PipelineState<any>;

/**
 * Runs the clean flow one step at a time:
 * 01 ingest -> 02 structure -> 03 standardize -> 04 resolve -> 05 validate -> 06 load
 * Every step is its own component; this service only chains them
 */
@Injectable()
export class CleanDataService {
  private readonly next: Record<
    Exclude<StepName, 'ingest'>,
    (s: AnyState) => AnyState
  >;

  constructor(
    private readonly ingestStep: IngestStep,
    structureStep: StructureStep,
    standardizeStep: StandardizeStep,
    resolveStep: ResolveStep,
    validateStep: ValidateStep,
    loadStep: LoadStep,
  ) {
    this.next = {
      structure: (s) => structureStep.run(s),
      standardize: (s) => standardizeStep.run(s),
      resolve: (s) => resolveStep.run(s),
      validate: (s) => validateStep.run(s),
      load: (s) => loadStep.run(s),
    };
  }

  /** Run one step on the JSON state returned by the previous step */
  runStep(step: StepName, state: AnyState): AnyState {
    if (step === 'ingest') {
      throw new BadRequestException(
        'ingest takes an xlsx file - use POST /clean-data/run?until=ingest',
      );
    }
    const previous = PIPELINE_STEPS[PIPELINE_STEPS.indexOf(step) - 1];
    if (!state || state.step !== previous) {
      throw new BadRequestException(
        `${step} expects the state returned by ${previous}`,
      );
    }
    return this.next[step](state);
  }

  runFile(input: IngestInput, opts: RunOptions = {}): FileResult {
    const ingested = this.ingestStep.run(input);
    return this.continueFrom(ingested, opts);
  }

  /**
   * Run many files. The same file uploaded twice (same sha256) is skipped;
   * the same (doi, sample_no) with different content is a conflict
   */
  runBatch(
    inputs: IngestInput[],
    opts: RunOptions = {},
  ): { summary: BatchSummary; results: FileResult[] } {
    const byHash = new Map<string, string>();
    const byKey = new Map<string, { file: string; sha256: string }>();
    const results: FileResult[] = [];

    for (const input of inputs) {
      const ingested = this.ingestStep.run(input);
      const { file } = ingested;
      const key =
        file.doi && file.sample_no !== null
          ? `${file.doi}#${file.sample_no}`
          : null;

      const sameFile = byHash.get(file.sha256);
      if (sameFile) {
        const qc = new QcCollector('ingest', file, ingested.issues);
        qc.warn({
          rule: 'duplicate_file',
          message: `Same content (sha256) as ${sameFile}; skipped`,
          raw_value: file.file_name,
        });
        results.push({
          ...this.result(qc.state(ingested.data), opts),
          status: 'duplicate',
          clean: null,
        });
        continue;
      }
      byHash.set(file.sha256, file.file_name);

      const other = key ? byKey.get(key) : undefined;
      if (other) {
        const qc = new QcCollector('ingest', file, ingested.issues);
        qc.error({
          rule: 'sample_key_conflict',
          message: `${other.file} has the same doi + sample_no (${key}) but different content`,
          raw_value: file.file_name,
          fatal: true,
        });
        results.push(this.result(qc.state(ingested.data), opts));
        continue;
      }
      if (key) byKey.set(key, { file: file.file_name, sha256: file.sha256 });

      results.push(this.continueFrom(ingested, opts));
    }

    return { summary: this.summarize(results), results };
  }

  private continueFrom(
    state: PipelineState<IngestData>,
    opts: RunOptions,
  ): FileResult {
    let current: AnyState = state;
    opts.onStep?.(current);

    for (const step of PIPELINE_STEPS.slice(1) as Exclude<
      StepName,
      'ingest'
    >[]) {
      if (current.issues.some((i: QcIssue) => i.fatal)) break;
      if (opts.until && current.step === opts.until) break;
      current = this.next[step](current);
      opts.onStep?.(current);
    }
    return this.result(current, opts);
  }

  private result(state: AnyState, opts: RunOptions): FileResult {
    const errors = state.issues.filter((i: QcIssue) => i.severity === 'error');
    const warnings = state.issues.filter((i: QcIssue) => i.severity === 'warn');
    const fatal = state.issues.some((i: QcIssue) => i.fatal);
    const finished = state.step === 'load';

    const load = finished ? (state.data as LoadData) : null;
    const gold = load?.gold ?? null;
    const rows = load?.quarantine ?? [];
    const rowsClean = gold
      ? gold.layers.length +
        gold.layer_ingredients.length +
        gold.process_steps.length +
        new Set(
          gold.material_sources.map((m) => `${m.source_sheet}#${m.source_row}`),
        ).size +
        gold.measurements.length +
        gold.stability_tests.length
      : 0;

    const result: FileResult = {
      file: state.file,
      status: fatal ? 'failed' : errors.length ? 'partial' : 'passed',
      stats: {
        rows_in: rowsClean + rows.length,
        rows_clean: rowsClean,
        rows_quarantined: rows.length,
        errors: errors.length,
        warnings: warnings.length,
      },
      clean: fatal ? null : gold,
      quarantine: errors.length ? { errors, rows } : null,
      warnings,
    };
    if (!finished && !fatal) {
      result.stopped_at = state.step;
      result.state = opts.until ? state : undefined;
    }
    return result;
  }

  private summarize(results: FileResult[]): BatchSummary {
    const count = (acc: Record<string, number>, key: string) => {
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    };
    const sortDesc = (o: Record<string, number>) =>
      Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]));

    return {
      files: results.length,
      by_status: results.map((r) => r.status).reduce(count, {}),
      errors_by_rule: sortDesc(
        results
          .flatMap((r) => r.quarantine?.errors ?? [])
          .map((i) => i.rule)
          .reduce(count, {}),
      ),
      warnings_by_rule: sortDesc(
        results
          .flatMap((r) => r.warnings)
          .map((i) => i.rule)
          .reduce(count, {}),
      ),
    };
  }
}
