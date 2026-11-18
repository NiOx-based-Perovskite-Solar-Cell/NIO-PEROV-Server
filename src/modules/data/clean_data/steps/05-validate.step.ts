import { Injectable } from '@nestjs/common';
import { DictionaryService } from '../dictionary/dictionary.service';
import type {
  BaseRecord,
  CleanRecords,
  MeasurementRecord,
  NumericValue,
  PipelineState,
  QuarantineRow,
  ResolveData,
  ValidateData,
} from '../interface/clean-data.types';
import { siteSums } from '../lib/perovskite';
import { issuesByRow, QcCollector, rowKey } from '../lib/qc';

type Range = { min?: number; max?: number; severity: 'error' | 'warn' };

// Process parameter sanity ranges, in the base unit of each quantity
const PARAM_RANGES: Record<string, Range> = {
  spin_speed: { min: 0, max: 20000, severity: 'error' },
  stir_speed: { min: 0, max: 5000, severity: 'warn' },
  acceleration: { min: 0, max: 20000, severity: 'warn' },
  temperature: { min: -273, max: 1500, severity: 'error' },
  duration: { min: 0, severity: 'warn' },
  drip_time: { min: 0, max: 600, severity: 'warn' },
  pressure: { min: 0, max: 1e7, severity: 'error' },
  volume: { min: 0, max: 1e6, severity: 'warn' },
  rate: { min: 0, max: 100, severity: 'warn' },
  power: { min: 0, max: 10000, severity: 'warn' },
};

/**
 * 05 · VALIDATE (Silver, quality gate) - schema and range checks
 * (PCE 0-35 %, Voc 0-2 V, FF 0-100 % ...), FK checks (every LayerID exists),
 * duplicates and cross checks (PCE ≈ Voc × Jsc × FF / 100). Any row with an
 * error from any step is moved to quarantine with its raw cells
 */
@Injectable()
export class ValidateStep {
  constructor(private readonly dict: DictionaryService) {}

  run(state: PipelineState<ResolveData>): PipelineState<ValidateData> {
    const qc = new QcCollector('validate', state.file, state.issues);
    const d = state.data;

    this.layers(d, qc);
    // FK checks need the layers that survived so far
    const layerErrors = issuesByRow(
      qc.issues.filter((i) => i.severity === 'error'),
    );
    const validPositions = new Set(
      d.layers
        .filter(
          (l) =>
            !layerErrors.has(
              rowKey(l.lineage.source_sheet, l.lineage.source_row),
            ),
        )
        .map((l) => l.position),
    );
    this.ingredients(d, validPositions, qc);
    this.processes(d, validPositions, qc);
    this.vendors(d, qc);
    this.measurements(d, qc);
    this.stability(d, qc);

    return qc.state(this.gate(d, qc));
  }

  // ---------- gate ----------

  private gate(d: CleanRecords, qc: QcCollector): ValidateData {
    const byRow = issuesByRow(qc.issues);
    const quarantine: QuarantineRow[] = [];

    const split = <T extends BaseRecord>(records: T[]): T[] =>
      records.filter((r) => {
        const issues =
          byRow.get(rowKey(r.lineage.source_sheet, r.lineage.source_row)) ?? [];
        if (!issues.some((i) => i.severity === 'error')) return true;
        quarantine.push({ lineage: r.lineage, raw: r.raw, issues });
        return false;
      });

    return {
      passed: {
        layers: split(d.layers),
        ingredients: split(d.ingredients),
        processes: split(d.processes),
        vendors: split(d.vendors),
        measurements: split(d.measurements),
        stability: split(d.stability),
      },
      quarantine,
    };
  }

  private range(
    value: NumericValue,
    range: Range,
    record: BaseRecord,
    column: string,
    label: string,
    qc: QcCollector,
  ): void {
    for (const v of [value.value, value.value_min, value.value_max]) {
      if (v === null) continue;
      if (
        (range.min !== undefined && v < range.min) ||
        (range.max !== undefined && v > range.max)
      ) {
        qc.add({
          severity: range.severity,
          rule: 'out_of_range',
          lineage: record.lineage,
          column_name: column,
          raw_value: value.value_raw,
          message: `${label} = ${v} is outside ${range.min ?? '-∞'} … ${range.max ?? '∞'}`,
        });
        return;
      }
    }
  }

  // ---------- per sheet ----------

  private layers(d: CleanRecords, qc: QcCollector): void {
    const seen = new Set<string>();
    for (const l of d.layers) {
      const key = `${l.position}:${l.sub_order}`;
      if (l.position !== null && seen.has(key)) {
        qc.error({
          rule: 'layer_duplicate',
          lineage: l.lineage,
          column_name: 'layer_id',
          raw_value: String(l.position),
          message: `LayerID ${l.position} (sub-order ${l.sub_order}) appears twice`,
        });
      }
      seen.add(key);

      this.range(
        l.thickness,
        { min: 0, max: 2000, severity: 'warn' },
        l,
        'thickness_nm',
        'thickness (nm)',
        qc,
      );

      for (const c of l.components) {
        if (!c.composition) continue;
        const sums = siteSums(c.composition);
        const off =
          Math.abs(sums.A - 1) > 0.05 ||
          Math.abs(sums.B - 1) > 0.05 ||
          Math.abs(sums.X - 3) > 0.1;
        if (off) {
          qc.warn({
            rule: 'perovskite_stoichiometry',
            lineage: l.lineage,
            column_name: 'material',
            raw_value: c.raw,
            message: `Site sums A=${sums.A} B=${sums.B} X=${sums.X} (expected 1 / 1 / 3)`,
          });
        }
      }
    }

    if (!d.layers.some((l) => l.role === 'psk')) {
      qc.warn({
        rule: 'psk_missing',
        message: 'No PSK (perovskite) layer in this device',
      });
    }
  }

  private ingredients(
    d: CleanRecords,
    positions: Set<number | null>,
    qc: QcCollector,
  ): void {
    for (const r of d.ingredients) {
      if (r.position !== null && !positions.has(r.position)) {
        qc.error({
          rule: 'fk_layer_missing',
          lineage: r.lineage,
          column_name: 'layer_id',
          raw_value: String(r.position),
          message: `LayerID ${r.position} does not exist (or was quarantined) in the Layer sheet`,
        });
      }
      this.range(
        r.amount,
        { min: 0, severity: 'error' },
        r,
        'amount',
        'amount',
        qc,
      );
    }
  }

  private processes(
    d: CleanRecords,
    positions: Set<number | null>,
    qc: QcCollector,
  ): void {
    const seen = new Set<string>();
    for (const p of d.processes) {
      if (p.position !== null && !positions.has(p.position)) {
        qc.error({
          rule: 'fk_layer_missing',
          lineage: p.lineage,
          column_name: 'layer_id',
          raw_value: String(p.position),
          message: `LayerID ${p.position} does not exist (or was quarantined) in the Layer sheet`,
        });
      }
      const key = `${p.position}:${p.scope}:${p.step_order}`;
      if (p.step_order !== null && seen.has(key)) {
        qc.warn({
          rule: 'step_order_duplicate',
          lineage: p.lineage,
          column_name: 'step_order',
          raw_value: String(p.step_order),
          message: `StepOrder ${p.step_order} is used twice for LayerID ${p.position}`,
        });
      }
      seen.add(key);

      for (const param of p.params) {
        const range = param.param ? PARAM_RANGES[param.param] : undefined;
        if (range)
          this.range(
            { ...param, error: null },
            range,
            p,
            'parameter',
            `${param.param} (${param.unit})`,
            qc,
          );
      }
    }
  }

  private vendors(d: CleanRecords, qc: QcCollector): void {
    for (const v of d.vendors) {
      if (v.purity_pct === null) continue;
      this.range(
        {
          value: v.purity_pct,
          value_min: v.purity_min,
          value_max: v.purity_max,
          qualifier: 'eq',
          error: null,
          value_raw: v.purity_raw,
        },
        { min: 0, max: 100, severity: 'error' },
        v,
        'purity',
        'purity (%)',
        qc,
      );
    }
  }

  private measurements(d: CleanRecords, qc: QcCollector): void {
    const seen = new Set<string>();
    for (const m of d.measurements) {
      if (!m.property) continue;
      const prop = this.dict.propertyByCode(m.property);
      if (prop && m.value.unit === prop.unit) {
        this.range(
          m.value,
          {
            min: prop.valid_min ?? undefined,
            max: prop.valid_max ?? undefined,
            severity: 'error',
          },
          m,
          'value',
          `${m.property} (${prop.unit ?? '-'})`,
          qc,
        );
      }
      const key = [m.property, m.statistic, m.scan, ...m.context].join('|');
      if (seen.has(key)) {
        qc.warn({
          rule: 'measurement_duplicate',
          lineage: m.lineage,
          column_name: 'property',
          raw_value: m.property_raw,
          message: `${m.property} (${m.statistic}, ${m.scan}) reported more than once`,
        });
      }
      seen.add(key);
    }
    this.pceConsistency(d.measurements, qc);
  }

  // PCE ≈ Voc × Jsc × FF / 100 within the same statistic / scan
  private pceConsistency(
    measurements: MeasurementRecord[],
    qc: QcCollector,
  ): void {
    const groups = new Map<string, Map<string, MeasurementRecord>>();
    for (const m of measurements) {
      if (
        !m.property ||
        !['PCE', 'Voc', 'Jsc', 'FF'].includes(m.property) ||
        m.value.value === null
      )
        continue;
      const key = [m.statistic, m.scan, ...m.context].join('|');
      const group = groups.get(key) ?? new Map<string, MeasurementRecord>();
      if (!group.has(m.property)) group.set(m.property, m);
      groups.set(key, group);
    }

    for (const group of groups.values()) {
      const [pce, voc, jsc, ff] = ['PCE', 'Voc', 'Jsc', 'FF'].map(
        (p) => group.get(p)?.value.value,
      );
      if (pce == null || voc == null || jsc == null || ff == null || pce === 0)
        continue;
      const expected = (voc * jsc * ff) / 100;
      const diff = Math.abs(expected - pce) / pce;
      if (diff > 0.05) {
        const m = group.get('PCE')!;
        qc.warn({
          rule: 'pce_inconsistent',
          lineage: m.lineage,
          column_name: 'value',
          raw_value: m.value.value_raw,
          message: `PCE ${pce} % but Voc × Jsc × FF / 100 = ${expected.toFixed(2)} % (${(diff * 100).toFixed(1)} % off)`,
        });
      }
    }
  }

  private stability(d: CleanRecords, qc: QcCollector): void {
    for (const s of d.stability) {
      this.range(
        s.temperature_c,
        { min: -50, max: 200, severity: 'error' },
        s,
        'temperature_c',
        'temperature (°C)',
        qc,
      );
      this.range(
        s.rh_pct,
        { min: 0, max: 100, severity: 'error' },
        s,
        'rh_pct',
        'RH (%)',
        qc,
      );
      this.range(
        s.duration_h,
        { min: 0, severity: 'error' },
        s,
        'duration_h',
        'time (h)',
        qc,
      );
      this.range(
        s.retention_pct,
        { min: 0, max: 150, severity: 'error' },
        s,
        'retention_pct',
        'retention (%)',
        qc,
      );
      this.range(
        s.t80_h,
        { min: 0, severity: 'error' },
        s,
        't80_h',
        'T80 (h)',
        qc,
      );

      const init = s.initial_pce.value;
      const fin = s.final_pce.value;
      if (init && fin !== null) {
        const derived = Number(((fin / init) * 100).toFixed(2));
        if (s.retention_pct.value === null) {
          s.retention_pct = { ...s.retention_pct, value: derived };
          qc.warn({
            rule: 'retention_derived',
            lineage: s.lineage,
            column_name: 'retention_pct',
            message: `Retention computed from final / initial PCE = ${derived} %`,
          });
        } else if (Math.abs(s.retention_pct.value - derived) > 5) {
          qc.warn({
            rule: 'retention_inconsistent',
            lineage: s.lineage,
            column_name: 'retention_pct',
            raw_value: s.retention_pct.value_raw,
            message: `Retention ${s.retention_pct.value} % but final / initial PCE = ${derived} %`,
          });
        }
      }
      if (s.encapsulated === null) {
        qc.warn({
          rule: 'encapsulation_missing',
          lineage: s.lineage,
          column_name: 'encapsulation',
          message: 'Encapsulation not reported',
        });
      }
    }
  }
}
