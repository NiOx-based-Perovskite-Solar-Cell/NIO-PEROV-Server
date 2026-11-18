import { Injectable } from '@nestjs/common';
import { DictionaryService, UnitDef } from '../dictionary/dictionary.service';
import type {
  BaseRecord,
  IngredientRecord,
  LayerRecord,
  MaterialMention,
  MeasurementRecord,
  PipelineState,
  ProcessRecord,
  ResolveData,
  SolventSystem,
  StandardizeData,
  VendorRecord,
} from '../interface/clean-data.types';
import { suggest } from '../lib/fuzzy';
import { parseMention } from '../lib/mention';
import { scaleNumeric } from '../lib/numeric';
import { siteSums } from '../lib/perovskite';
import { QcCollector } from '../lib/qc';
import { cleanText, compactKey, splitTrailingParen } from '../lib/text';

/**
 * 04 · RESOLVE (Silver) - map names to canonical dictionary entries:
 * layer role, material, solvent, vendor, process type, parameter name and
 * property (+ conversion to the property's unit). Closed vocabularies
 * (layer type, process type, property, unit) fail the row when unmapped;
 * open ones (material, vendor, solvent) keep the cleaned name and warn so a
 * reviewer can add the alias
 */
@Injectable()
export class ResolveStep {
  constructor(private readonly dict: DictionaryService) {}

  run(state: PipelineState<StandardizeData>): PipelineState<ResolveData> {
    const qc = new QcCollector('resolve', state.file, state.issues);
    const d = state.data;

    return qc.state({
      layers: d.layers.map((r) => this.layer(r, qc)),
      ingredients: d.ingredients.map((r) => this.ingredient(r, qc)),
      processes: d.processes.map((r) => this.process(r, qc)),
      vendors: d.vendors.map((r) => this.vendor(r, qc)),
      measurements: d.measurements.map((r) => this.measurement(r, qc)),
      stability: d.stability,
    });
  }

  // ---------- materials ----------

  private mention(
    m: MaterialMention,
    row: BaseRecord,
    column: string,
    qc: QcCollector,
  ): MaterialMention {
    const direct = this.dict.material(m.name);
    if (direct) {
      // "CsFAMAPb(IBrCl)3" parses, but without fractions; keep a composition only if it adds up
      const sums = m.composition ? siteSums(m.composition) : null;
      const valid =
        sums &&
        Math.abs(sums.A - 1) <= 0.05 &&
        Math.abs(sums.B - 1) <= 0.05 &&
        Math.abs(sums.X - 3) <= 0.1;
      return {
        ...m,
        material: direct.material,
        form: m.form ?? direct.form,
        composition: valid ? m.composition : null,
        known: true,
      };
    }
    if (m.composition) return { ...m, material: m.name, known: true };

    const stem = cleanText(m.raw.replace(/\s*\(.*$/, '')) ?? m.name;
    const candidates = [m.name, stem, ...m.notes];
    for (const candidate of candidates) {
      const hit = this.dict.material(candidate);
      if (hit)
        return {
          ...m,
          material: hit.material,
          form: m.form ?? hit.form,
          known: true,
        };
    }

    qc.warn({
      rule: 'material_unmapped',
      lineage: row.lineage,
      column_name: column,
      raw_value: m.raw,
      message: `Material "${m.name}" is not in material_alias.csv; kept as typed`,
      suggestion: suggest(m.name, this.dict.materialNames(), 0.7),
    });
    return { ...m, material: m.name, known: false };
  }

  private layer(r: LayerRecord, qc: QcCollector): LayerRecord {
    const role = r.layer_type ? this.dict.layerRole(r.layer_type) : undefined;
    if (!role) {
      qc.error({
        rule: 'layer_type_unmapped',
        lineage: r.lineage,
        column_name: 'layer_type',
        raw_value: r.layer_type_raw,
        message: `LayerType "${r.layer_type_raw ?? ''}" is not one of the 8 layer roles`,
        suggestion: r.layer_type
          ? suggest(r.layer_type, this.dict.layerRoleNames(), 0.5)
          : undefined,
      });
    }
    return {
      ...r,
      role: role ?? null,
      components: r.components.map((m) => this.mention(m, r, 'material', qc)),
    };
  }

  // ---------- Materials sheet ----------

  private ingredient(r: IngredientRecord, qc: QcCollector): IngredientRecord {
    let role: string | null = null;
    if (r.role_raw) {
      const stripped = splitTrailingParen(r.role_raw)?.head ?? r.role_raw;
      role =
        this.dict.ingredientRole(r.role_raw) ??
        this.dict.ingredientRole(stripped) ??
        null;
      if (!role) {
        qc.warn({
          rule: 'ingredient_role_unmapped',
          lineage: r.lineage,
          column_name: 'type',
          raw_value: r.role_raw,
          message: `Type "${r.role_raw}" is not in ingredient_role_alias.csv; kept as typed`,
          suggestion: suggest(stripped, this.dict.ingredientRoleNames(), 0.6),
        });
        role = compactKey(stripped);
      }
    }

    return {
      ...r,
      role,
      material: r.material ? this.mention(r.material, r, 'material', qc) : null,
      solvent: r.solvent ? this.solvent(r.solvent, r, qc) : null,
    };
  }

  /**
   * Map every component, merge duplicates and sort by fraction so that
   * "DMSO:DMF (1:4)" and "DMF/DMSO (4/1 V/V)" become the same system
   */
  private solvent(
    system: SolventSystem,
    r: BaseRecord,
    qc: QcCollector,
  ): SolventSystem {
    const notes = [...system.notes];
    const merged = new Map<string, SolventSystem['components'][number]>();

    for (const c of system.components) {
      const hit =
        this.dict.solvent(c.raw) ?? this.dict.solvent(parseMention(c.raw).name);
      if (hit?.grade && !notes.includes(hit.grade)) notes.push(hit.grade);
      if (!hit) {
        qc.warn({
          rule: 'solvent_unmapped',
          lineage: r.lineage,
          column_name: 'solvent',
          raw_value: c.raw,
          message: `Solvent "${c.raw}" is not in solvent_alias.csv; kept as typed`,
          suggestion: suggest(c.raw, this.dict.materialNames(), 0.7),
        });
      }
      const material = hit?.solvent ?? c.raw;
      const prev = merged.get(material);
      merged.set(material, {
        ...c,
        material,
        known: !!hit,
        fraction:
          prev && prev.fraction !== null && c.fraction !== null
            ? prev.fraction + c.fraction
            : c.fraction,
      });
    }

    const components = [...merged.values()].sort(
      (a, b) =>
        (b.fraction ?? 0) - (a.fraction ?? 0) ||
        (a.material ?? '').localeCompare(b.material ?? ''),
    );
    const label =
      components
        .map((c) =>
          components.length > 1 && c.fraction !== null
            ? `${c.material} ${c.fraction.toFixed(2)}`
            : c.material,
        )
        .join(' + ') +
      (system.basis && components.length > 1 ? ` (${system.basis})` : '');

    return { ...system, components, notes, label };
  }

  // ---------- Process ----------

  private process(r: ProcessRecord, qc: QcCollector): ProcessRecord {
    const type = r.process_type_raw
      ? this.dict.processType(r.process_type_raw)
      : undefined;
    if (!type) {
      qc.error({
        rule: 'process_type_unmapped',
        lineage: r.lineage,
        column_name: 'process_type',
        raw_value: r.process_type_raw,
        message: `ProcessType "${r.process_type_raw ?? ''}" is not in process_alias.csv`,
        suggestion: r.process_type_raw
          ? suggest(r.process_type_raw, this.dict.processCodes(), 0.5)
          : undefined,
      });
    }
    const code = type?.code ?? null;
    return {
      ...r,
      process_type: code,
      category: type?.category ?? null,
      params: r.params.map((p) => ({
        ...p,
        param: p.quantity ? this.dict.paramName(p.quantity, code) : 'unknown',
      })),
    };
  }

  // ---------- Vender ----------

  private vendor(r: VendorRecord, qc: QcCollector): VendorRecord {
    let grade = r.grade;
    // "1 Materials, Nano Clean Tech" - split on commas only when every part is a known vendor,
    // because names like "Laiyan Technology Co., Ltd." contain commas too
    const names = r.vendors_raw.flatMap((raw) => {
      if (this.dict.vendor(raw)) return [raw];
      const parts = raw
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
      return parts.length > 1 && parts.every((p) => this.dict.vendor(p))
        ? parts
        : [raw];
    });
    const vendors = names.map((raw) => {
      const paren = splitTrailingParen(raw);
      const hit =
        this.dict.vendor(raw) ??
        (paren ? this.dict.vendor(paren.head) : undefined);
      if (paren && /anhydrous/i.test(paren.inner)) grade ??= 'anhydrous';
      if (!hit) {
        qc.warn({
          rule: 'vendor_unmapped',
          lineage: r.lineage,
          column_name: 'vendor',
          raw_value: raw,
          message: `Vendor "${raw}" is not in vendor_alias.csv; kept as typed`,
          suggestion: suggest(raw, this.dict.vendorNames(), 0.6),
        });
      }
      return { vendor: hit ?? raw, known: !!hit };
    });

    const materials = r.materials.map((m) =>
      this.mention(m, r, 'material', qc),
    );
    for (const m of materials) {
      if (m.notes.some((n) => /anhydrous/i.test(n))) grade ??= 'anhydrous';
    }
    return { ...r, vendors, materials, grade };
  }

  // ---------- Properties ----------

  private measurement(
    r: MeasurementRecord,
    qc: QcCollector,
  ): MeasurementRecord {
    if (!r.property_name) return { ...r, property: null };

    const prop =
      this.dict.property(r.property_name) ??
      this.dict.property(`${r.property_name} ${r.context.join(' ')}`.trim());
    if (!prop) {
      qc.error({
        rule: 'property_unmapped',
        lineage: r.lineage,
        column_name: 'property',
        raw_value: r.property_raw,
        message: `Property "${r.property_name}" is not in property_alias.csv`,
        suggestion: suggest(r.property_name, this.dict.propertyCodes(), 0.5),
      });
      return { ...r, property: null };
    }

    const out: MeasurementRecord = { ...r, property: prop.code };
    if (r.value.value === null) return out;

    const target: UnitDef | null = prop.unit
      ? (this.dict.unitByCode(prop.unit) ?? null)
      : null;
    const measured = r.value.unit
      ? this.dict.unitByCode(r.value.unit)
      : undefined;

    if (!measured && r.value.unit_raw !== null) return out; // unit_unmapped already reported in 03

    if (!measured) {
      if (target) {
        qc.warn({
          rule: 'unit_assumed',
          lineage: r.lineage,
          column_name: 'unit',
          message: `${prop.code} has no unit; assumed ${target.unit}`,
        });
        out.value = {
          ...r.value,
          unit: target.unit,
          quantity: target.quantity,
        };
      }
    } else if (target && measured.quantity === target.quantity) {
      out.value = {
        ...this.dict.convert(r.value, measured, target),
        unit: target.unit,
        unit_raw: r.value.unit_raw,
        quantity: target.quantity,
      };
    } else if (prop.alt_quantities.includes(measured.quantity)) {
      const base = this.dict.baseUnit(measured.quantity) ?? measured;
      out.value = {
        ...this.dict.convert(r.value, measured, base),
        unit: base.unit,
        unit_raw: r.value.unit_raw,
        quantity: base.quantity,
      };
    } else {
      qc.error({
        rule: 'unit_incompatible',
        lineage: r.lineage,
        column_name: 'unit',
        raw_value: r.value.unit_raw,
        message: `${prop.code} cannot be in "${r.value.unit_raw}" (expected ${prop.unit ?? 'no unit'})`,
      });
      return out;
    }

    // FF typed as a fraction (0.81) instead of a percent
    if (
      prop.code === 'FF' &&
      out.value.value !== null &&
      out.value.value > 0 &&
      out.value.value <= 1
    ) {
      qc.warn({
        rule: 'ff_fraction_scaled',
        lineage: r.lineage,
        column_name: 'value',
        raw_value: r.value.value_raw,
        message: 'FF looks like a fraction; multiplied by 100',
      });
      out.value = { ...out.value, ...scaleNumeric(out.value, 100) };
    }
    return out;
  }
}
