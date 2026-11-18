import { Injectable } from '@nestjs/common';
import { DictionaryService } from '../dictionary/dictionary.service';
import type {
  BaseRecord,
  CleanRecords,
  GoldDocument,
  LayerRecord,
  LayerRole,
  LoadData,
  MeasurementRecord,
  NumericValue,
  PipelineState,
  ValidateData,
} from '../interface/clean-data.types';
import { QcCollector } from '../lib/qc';

const source = (r: BaseRecord) => ({
  source_sheet: r.lineage.source_sheet,
  source_row: r.lineage.source_row,
});

const numeric = (prefix: string, v: NumericValue) => ({
  [prefix]: v.value,
  [`${prefix}_min`]: v.value_min,
  [`${prefix}_max`]: v.value_max,
  [`${prefix}_qualifier`]: v.qualifier,
  [`${prefix}_raw`]: v.value_raw,
});

/**
 * 06 · LOAD (Gold) - shape the rows that passed the gate like the
 * PostgreSQL tables (paper -> sample -> layer -> step -> param ...) and
 * build the v_device_summary row. For now the result is returned as JSON;
 * the DB upsert keyed on (doi, sample_no) plugs in here later
 */
@Injectable()
export class LoadStep {
  constructor(private readonly dict: DictionaryService) {}

  run(state: PipelineState<ValidateData>): PipelineState<LoadData> {
    const qc = new QcCollector('load', state.file, state.issues);
    const d = state.data.passed;
    const f = state.file;

    const gold: GoldDocument = {
      paper: {
        doi: f.doi,
        file_prefix: f.file_prefix,
      },
      sample: {
        sample_no: f.sample_no,
        architecture: this.architecture(d.layers),
        source_file: f.file_name,
        file_sha256: f.sha256,
      },
      layers: d.layers.map((l) => this.layer(l)),
      layer_ingredients: d.ingredients.map((r) => ({
        layer_position: r.position,
        material: r.material?.material ?? null,
        material_known: r.material?.known ?? false,
        material_raw: r.material?.raw ?? null,
        form: r.material?.form ?? null,
        notes: r.material?.notes ?? [],
        role: r.role ?? null,
        role_raw: r.role_raw,
        solvent_system: r.solvent
          ? {
              label: r.solvent.label,
              basis: r.solvent.basis,
              components: r.solvent.components.map((c) => ({
                material: c.material,
                fraction: c.fraction,
                known: c.known,
              })),
              notes: r.solvent.notes,
              raw: r.solvent.raw,
            }
          : null,
        amount: r.amount.value,
        amount_min: r.amount.value_min,
        amount_max: r.amount.value_max,
        amount_qualifier: r.amount.qualifier,
        unit: r.amount.unit,
        conc_mg_per_ml: r.conc_mg_per_ml,
        amount_raw: r.amount.value_raw,
        unit_raw: r.amount.unit_raw,
        unit_note: r.unit_note,
        ...source(r),
      })),
      process_steps: d.processes.map((p) => ({
        layer_position: p.position,
        scope: p.scope,
        step_order: p.step_order,
        process_type: p.process_type,
        category: p.category,
        process_type_raw: p.process_type_raw,
        description: p.description,
        remarks: p.remarks,
        params: p.params.map((x) => ({
          seq: x.seq,
          param: x.param,
          value: x.value,
          value_min: x.value_min,
          value_max: x.value_max,
          qualifier: x.qualifier,
          unit: x.unit,
          value_raw: x.value_raw,
          unit_raw: x.unit_raw,
        })),
        ...source(p),
      })),
      material_sources: d.vendors.flatMap((v) => {
        const vendors = v.vendors?.length
          ? v.vendors
          : [{ vendor: null, known: false }];
        return v.materials.flatMap((m) =>
          vendors.map((vendor) => ({
            material: m.material,
            material_known: m.known ?? false,
            material_raw: m.raw,
            vendor: vendor.vendor,
            vendor_known: vendor.known,
            purity_pct: v.purity_pct,
            purity_min: v.purity_min,
            purity_max: v.purity_max,
            purity_qualifier: v.purity_qualifier,
            grade: v.grade,
            purity_raw: v.purity_raw,
            spec: v.spec,
            ...source(v),
          })),
        );
      }),
      measurements: d.measurements.map((m) => ({
        property: m.property,
        statistic: m.statistic,
        scan: m.scan,
        context: m.context,
        value: m.value.value,
        value_min: m.value.value_min,
        value_max: m.value.value_max,
        error: m.value.error,
        qualifier: m.value.qualifier,
        unit: m.value.unit,
        value_raw: m.value.value_raw,
        unit_raw: m.value.unit_raw,
        property_raw: m.property_raw,
        source_ref: m.source_ref,
        remarks: m.remarks,
        ...source(m),
      })),
      stability_tests: d.stability.map((s) => ({
        atmosphere: s.atmosphere,
        light: s.light,
        mode: s.mode,
        isos_code: s.isos_code,
        encapsulated: s.encapsulated,
        ...numeric('temperature_c', s.temperature_c),
        ...numeric('rh_pct', s.rh_pct),
        ...numeric('duration_h', s.duration_h),
        ...numeric('retention_pct', s.retention_pct),
        ...numeric('t80_h', s.t80_h),
        initial_pce: s.initial_pce.value,
        final_pce: s.final_pce.value,
        environment_raw: s.environment_raw,
        ...source(s),
      })),
      v_device_summary: {},
    };
    gold.v_device_summary = this.summary(gold, d);

    return qc.state({ gold, quarantine: state.data.quarantine });
  }

  private layer(l: LayerRecord) {
    const main = l.components[0];
    return {
      position: l.position,
      sub_order: l.sub_order,
      role: l.role,
      layer_type_raw: l.layer_type_raw,
      material: l.components.length === 1 ? (main?.material ?? null) : null,
      material_raw: l.material_raw,
      form: l.components.length === 1 ? (main?.form ?? null) : null,
      components: l.components.map((c, i) => ({
        seq: i + 1,
        material: c.material,
        known: c.known ?? false,
        form: c.form,
        notes: c.notes,
        thickness_nm: l.component_thickness_nm?.[i] ?? null,
        category: c.composition
          ? 'perovskite'
          : this.dict.materialCategory(c.material ?? ''),
        perovskite_composition: c.composition,
      })),
      thickness_nm: l.thickness.value,
      thickness_min_nm: l.thickness.value_min,
      thickness_max_nm: l.thickness.value_max,
      thickness_qualifier: l.thickness.qualifier,
      thickness_raw: l.thickness.value_raw,
      ...source(l),
    };
  }

  // Layers go from the substrate up: HTL below the perovskite = p-i-n (inverted)
  private architecture(layers: LayerRecord[]): 'nip' | 'pin' | null {
    const first = (role: LayerRole) =>
      Math.min(
        ...layers
          .filter((l) => l.role === role && l.position !== null)
          .map((l) => l.position!),
      );
    const htl = first('htl');
    const etl = first('etl');
    if (!Number.isFinite(htl) || !Number.isFinite(etl)) return null;
    return htl < etl ? 'pin' : 'nip';
  }

  /** One row per device for ML / analysis (materialized view v_device_summary) */
  private summary(
    gold: GoldDocument,
    d: CleanRecords,
  ): Record<string, unknown> {
    const layerName = (role: LayerRole) => {
      const names = d.layers
        .filter((l) => l.role === role)
        .flatMap((l) => l.components.map((c) => c.material))
        .filter(Boolean);
      return names.length ? names.join(' / ') : null;
    };
    const psk = d.layers.find((l) => l.role === 'psk');

    // Champion RS first, then any champion, then a single value
    const best = (code: string, statistic: 'champion' | 'average') => {
      const rank = (m: MeasurementRecord) =>
        (m.statistic === statistic ? 0 : m.statistic === 'single' ? 2 : 4) +
        (m.scan === 'RS' ? 0 : m.scan === 'NA' ? 0.5 : 1) +
        (m.context.length ? 0.1 : 0);
      const hits = d.measurements
        .filter((m) => m.property === code && m.value.value !== null)
        .filter((m) => statistic === 'champion' || m.statistic === 'average')
        .sort((a, b) => rank(a) - rank(b));
      return hits[0]?.value.value ?? null;
    };
    const stab = d.stability.find((s) => s.retention_pct.value !== null);

    return {
      doi: gold.paper.doi,
      sample_no: gold.sample.sample_no,
      architecture: gold.sample.architecture,
      anode: layerName('anode'),
      htl: layerName('htl'),
      htl_treatment: layerName('htl_treatment'),
      psk: layerName('psk'),
      psk_composition:
        psk?.components.find((c) => c.composition)?.composition ?? null,
      psk_thickness_nm: psk?.thickness.value ?? null,
      psk_treatment: layerName('psk_treatment'),
      etl: layerName('etl'),
      etl_treatment: layerName('etl_treatment'),
      cathode: layerName('cathode'),
      pce_champion: best('PCE', 'champion'),
      voc_champion: best('Voc', 'champion'),
      jsc_champion: best('Jsc', 'champion'),
      ff_champion: best('FF', 'champion'),
      pce_average: best('PCE', 'average'),
      stability_retention_pct: stab?.retention_pct.value ?? null,
      stability_duration_h: stab?.duration_h.value ?? null,
      stability_atmosphere: stab?.atmosphere ?? null,
      stability_mode: stab?.mode ?? null,
    };
  }
}
