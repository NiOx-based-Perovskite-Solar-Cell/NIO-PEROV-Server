/* eslint-disable no-console -- CLI output */
/**
 * Run the clean pipeline on local xlsx files and write the JSON results.
 *
 *   npm run clean:data -- <file.xlsx | folder>... [--out <dir>] [--until <step>] [--steps]
 *
 * Writes
 *   <out>/clean/<file>.json        gold JSON of every file that produced output
 *   <out>/quarantine/<file>.json   errors + raw rows that did not pass (only when there are errors)
 *   <out>/steps/<nn-step>/<file>.json   state after every step (with --steps)
 *   <out>/summary.json             status per file and issue counts by rule
 */
import * as fs from 'fs';
import * as path from 'path';
import { createCleanDataService } from '../clean-data.module';
import { PIPELINE_STEPS } from '../interface/clean-data.types';
import type { PipelineState, StepName } from '../interface/clean-data.types';

function parseArgs(argv: string[]) {
  const inputs: string[] = [];
  let out = 'clean-output';
  let until: StepName | undefined;
  let steps = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--out') out = argv[++i];
    else if (arg === '--until') until = argv[++i] as StepName;
    else if (arg === '--steps') steps = true;
    else inputs.push(arg);
  }
  if (until && !PIPELINE_STEPS.includes(until)) {
    throw new Error(`--until must be one of ${PIPELINE_STEPS.join(', ')}`);
  }
  if (!inputs.length) {
    throw new Error(
      'Usage: npm run clean:data -- <file.xlsx | folder>... [--out dir] [--until step] [--steps]',
    );
  }
  return { inputs, out, until, steps };
}

function listXlsx(inputs: string[]): string[] {
  return inputs
    .flatMap((p) =>
      fs.statSync(p).isDirectory()
        ? fs.readdirSync(p).map((f) => path.join(p, f))
        : [p],
    )
    .filter((f) => /\.xlsx$/i.test(f) && !path.basename(f).startsWith('~$'))
    .sort();
}

function write(file: string, data: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function main() {
  const { inputs, out, until, steps } = parseArgs(process.argv.slice(2));
  const service = createCleanDataService();
  const files = listXlsx(inputs);

  const { summary, results } = service.runBatch(
    files.map((f) => ({
      fileName: path.basename(f),
      buffer: fs.readFileSync(f),
    })),
    {
      until,
      onStep: steps
        ? (state: PipelineState<unknown>) => {
            const n = String(PIPELINE_STEPS.indexOf(state.step) + 1).padStart(
              2,
              '0',
            );
            write(
              path.join(
                out,
                'steps',
                `${n}-${state.step}`,
                `${state.file.file_name}.json`,
              ),
              state,
            );
          }
        : undefined,
    },
  );

  for (const r of results) {
    const name = `${r.file.file_name}.json`;
    if (r.clean) {
      write(path.join(out, 'clean', name), {
        file: r.file,
        status: r.status,
        stats: r.stats,
        clean: r.clean,
        warnings: r.warnings,
      });
    }
    if (r.quarantine) {
      write(path.join(out, 'quarantine', name), {
        file: r.file,
        status: r.status,
        passed: false,
        errors: r.quarantine.errors,
        rows: r.quarantine.rows,
      });
    }
    if (until && r.state)
      write(path.join(out, `until-${until}`, name), r.state);
  }

  write(path.join(out, 'summary.json'), {
    ...summary,
    files_detail: results.map((r) => ({
      file: r.file.file_name,
      status: r.status,
      ...r.stats,
    })),
  });

  console.log(`Processed ${summary.files} file(s) -> ${path.resolve(out)}`);
  console.log('Status:', summary.by_status);
  console.log(
    'Top errors:',
    Object.entries(summary.errors_by_rule).slice(0, 10),
  );
}

main();
