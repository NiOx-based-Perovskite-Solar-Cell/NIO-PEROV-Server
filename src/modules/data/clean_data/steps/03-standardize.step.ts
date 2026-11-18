import { Injectable } from '@nestjs/common';
import { DictionaryService, UnitDef } from '../dictionary/dictionary.service';
import type {
  IngredientRecord,
  LayerRecord,
  MeasurementRecord,
  NumericValue,
  PipelineState,
  ProcessParam,
  ProcessRecord,
  PuritySpec,
  ShapedRow,
  StabilityRecord,
  StandardizeData,
  StructureData,
  UnitValue,
  VendorRecord,
} from '../interface/clean-data.types';
import { suggest } from '../lib/fuzzy';
import { parseMention, splitMentions } from '../lib/mention';
import {
  emptyNumeric,
  parseNumeric,
  ParsedNumber,
  scaleNumeric,
  toNumericValue,
} from '../lib/numeric';
import { parsePropertyName, splitRemarks } from '../lib/property-name';
import { QcCollector } from '../lib/qc';
import { parseSolvent } from '../lib/solvent';
import { splitTopLevel, splitTrailingParen } from '../lib/text';

// "g per 10 mL", "mg / 5 mL", "mg in 1 mL", "g / 2mL", "mL per 10 mL"
const COMPOSITE_UNIT =
  /^(\S+?)\s*(?:per|\/|in)\s*(\d+(?:\.\d+)?)\s*([^\s\d]+)$/i;

const emptyUnitValue = (raw: string | null = null): UnitValue => ({
  ...emptyNumeric(raw),
  unit: null,
  unit_raw: null,
  quantity: null,
});

/**
 * 03 · STANDARDIZE (Silver) - parse every cell: split "4000, 30" into
 * separate values, parse ranges / ± / < / scientific notation, convert units
 * to the canonical unit of their quantity, parse solvents, materials,
 * property names and stability environments
 */
@Injectable()
export class StandardizeStep {
  constructor(private readonly dict: DictionaryService) {}

  run(state: PipelineState<StructureData>): PipelineState<StandardizeData> {
    const qc = new QcCollector('standardize', state.file, state.issues);
    const s = state.data;

    return qc.state({
      layers: s.layer.map((r) => this.layer(r, qc)),
      ingredients: s.materials.map((r) => this.ingredient(r, qc)),
      processes: s.process.map((r) => this.process(r, qc)),
      vendors: s.vendor.map((r) => this.vendor(r, qc)),
      measurements: s.properties.map((r) => this.measurement(r, qc)),
      stability: s.stability.map((r) => this.stability(r, qc)),
    });
  }

  // ---------- shared helpers ----------

  private position(
    row: ShapedRow,
    qc: QcCollector,
    column = 'layer_id',
  ): number | null {
    const raw = row.values[column];
    const n = parseNumeric(raw);
    if (
      raw !== null &&
      (!n.ok ||
        n.rest ||
        n.value === null ||
        !Number.isInteger(n.value) ||
        n.value < 1)
    ) {
      qc.error({
        rule: `${column}_invalid`,
        lineage: row.lineage,
        column_name: column,
        raw_value: raw,
        message: `${column} must be a whole number >= 1`,
      });
      return null;
    }
    return n.value;
  }

  private unitOrIssue(
    raw: string | null,
    row: ShapedRow,
    column: string,
    qc: QcCollector,
  ): UnitDef | undefined {
    const def = this.dict.unit(raw);
    if (raw !== null && !def) {
      qc.error({
        rule: 'unit_unmapped',
        lineage: row.lineage,
        column_name: column,
        raw_value: raw,
        message: `Unit "${raw}" is not in unit_alias.csv`,
        suggestion: suggest(raw, this.dict.unitCodes(), 0.5),
      });
    }
    return def;
  }

  // Convert to the base unit of the quantity (s, °C, Pa, μL, mg, mg/mL, mol/L ...)
  private toBase(
    n: NumericValue,
    def: UnitDef,
    unitRaw: string | null,
  ): UnitValue {
    const base = this.dict.baseUnit(def.quantity) ?? def;
    return {
      ...this.dict.convert(n, def, base),
      unit: base.unit,
      unit_raw: unitRaw,
      quantity: def.quantity,
    };
  }

  private numericOrIssue(
    row: ShapedRow,
    column: string,
    qc: QcCollector,
    opts: { roomTemperature?: boolean; allowUnit?: string } = {},
  ): NumericValue {
    const raw = row.values[column] ?? null;
    const n = parseNumeric(raw, { roomTemperature: opts.roomTemperature });
    const restIsUnit =
      n.rest !== null &&
      opts.allowUnit !== undefined &&
      this.dict.unit(n.rest)?.unit === opts.allowUnit;
    if (!n.ok || (n.rest !== null && !restIsUnit)) {
      qc.error({
        rule: 'value_unparseable',
        lineage: row.lineage,
        column_name: column,
        raw_value: raw,
        message: `Cannot read "${raw}" as a number`,
      });
      return emptyNumeric(raw);
    }
    return toNumericValue(n);
  }

  // ---------- Layer ----------

  private layer(row: ShapedRow, qc: QcCollector): LayerRecord {
    const v = row.values;
    const type = v.layer_type;
    const suffix = type ? /^(.*?)\s*(?:\((\d+)\)|(\d+))$/.exec(type) : null;

    const components = splitMentions(v.material, this.dict.isKnownMaterial);
    // A row with neither material nor thickness is just an unused slot (e.g. no HTL treatment)
    if (components.length === 0 && v.thickness_nm !== null) {
      qc.warn({
        rule: 'layer_material_missing',
        lineage: row.lineage,
        column_name: 'material',
        raw_value: row.values.material,
        message: 'Layer has no material',
      });
    }

    const { thickness, perComponent } = this.thickness(
      row,
      components.length,
      qc,
    );

    return {
      lineage: row.lineage,
      raw: row.raw,
      position: this.position(row, qc),
      sub_order: suffix ? Number(suffix[2] ?? suffix[3]) : 1,
      layer_type_raw: type,
      layer_type: suffix ? suffix[1] : type,
      material_raw: v.material,
      components,
      thickness,
      component_thickness_nm: perComponent,
    };
  }

  private thickness(
    row: ShapedRow,
    componentCount: number,
    qc: QcCollector,
  ): { thickness: UnitValue; perComponent: (number | null)[] | null } {
    const raw = row.values.thickness_nm;
    if (raw === null)
      return { thickness: emptyUnitValue(), perComponent: null };

    const nm = this.dict.unitByCode('nm')!;
    const parts = raw
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    const parsed: UnitValue[] = [];

    for (const part of parts) {
      const n = parseNumeric(part);
      const def = n.rest ? this.dict.unit(n.rest) : nm;
      if (!n.ok || n.value === null || !def || def.quantity !== 'length') {
        qc.error({
          rule: 'thickness_unparseable',
          lineage: row.lineage,
          column_name: 'thickness_nm',
          raw_value: raw,
          message: `Cannot read thickness "${raw}" as nm (or Å / μm with the unit typed in)`,
        });
        return { thickness: emptyUnitValue(raw), perComponent: null };
      }
      parsed.push(this.toBase(toNumericValue(n), def, n.rest ?? 'nm'));
    }

    if (parsed.length === 1) {
      return {
        thickness: { ...parsed[0], value_raw: raw },
        perComponent: null,
      };
    }

    // "4, 100" -> one thickness per stacked component; the layer keeps the total
    if (parsed.length !== componentCount) {
      qc.warn({
        rule: 'thickness_count_mismatch',
        lineage: row.lineage,
        column_name: 'thickness_nm',
        raw_value: raw,
        message: `${parsed.length} thickness values for ${componentCount} material(s); stored as total`,
      });
    }
    const total = parsed.reduce((sum, p) => sum + (p.value ?? 0), 0);
    return {
      thickness: {
        ...emptyUnitValue(raw),
        value: total,
        unit: 'nm',
        quantity: 'length',
        unit_raw: 'nm',
      },
      perComponent:
        parsed.length === componentCount ? parsed.map((p) => p.value) : null,
    };
  }

  // ---------- Materials ----------

  private ingredient(row: ShapedRow, qc: QcCollector): IngredientRecord {
    const v = row.values;
    const material = v.material ? parseMention(v.material) : null;
    if (!material) {
      qc.error({
        rule: 'ingredient_material_missing',
        lineage: row.lineage,
        column_name: 'material',
        message: 'Row has amount / type but no material',
      });
    }

    const { system, problem } = parseSolvent(v.solvent);
    if (problem) {
      qc.error({
        rule: 'solvent_ratio_mismatch',
        lineage: row.lineage,
        column_name: 'solvent',
        raw_value: v.solvent,
        message: problem,
      });
    } else if (
      system &&
      system.components.length > 1 &&
      system.components.some((c) => c.fraction === null)
    ) {
      qc.warn({
        rule: 'solvent_ratio_missing',
        lineage: row.lineage,
        column_name: 'solvent',
        raw_value: v.solvent,
        message: 'Mixed solvent without a ratio; fractions left empty',
      });
    }

    const { amount, conc, note } = this.amount(row, qc);

    return {
      lineage: row.lineage,
      raw: row.raw,
      position: this.position(row, qc),
      material,
      role_raw: v.type ?? null,
      solvent: system,
      amount,
      conc_mg_per_ml: conc,
      unit_note: note,
    };
  }

  private amount(
    row: ShapedRow,
    qc: QcCollector,
  ): { amount: UnitValue; conc: number | null; note: string | null } {
    const rawAmount = row.values.amount ?? null;
    let rawUnit = row.values.unit ?? null;
    const n = parseNumeric(rawAmount, { ratio: true });
    const fail = (
      rule: string,
      message: string,
      column = 'amount',
      raw = rawAmount,
    ) => {
      qc.error({
        rule,
        lineage: row.lineage,
        column_name: column,
        raw_value: raw,
        message,
      });
      return {
        amount: { ...emptyUnitValue(rawAmount), unit_raw: rawUnit },
        conc: null,
        note: null,
      };
    };

    if (!n.ok)
      return fail('amount_unparseable', `Cannot read amount "${rawAmount}"`);
    if (n.rest) {
      // "2.62 mg / 10 mL" typed into the Amount cell
      if (rawUnit !== null)
        return fail(
          'amount_unparseable',
          `Amount "${rawAmount}" has text after the number`,
        );
      rawUnit = n.rest;
    }
    if (rawUnit === null) {
      if (n.value !== null) {
        qc.warn({
          rule: 'unit_missing',
          lineage: row.lineage,
          column_name: 'unit',
          raw_value: rawAmount,
          message: 'Amount without a unit',
        });
      }
      return {
        amount: { ...emptyUnitValue(), ...toNumericValue(n) },
        conc: null,
        note: null,
      };
    }

    let unitText = rawUnit;
    let note: string | null = null;
    const paren = splitTrailingParen(unitText);
    if (paren) {
      unitText = paren.head;
      note = paren.inner || null;
    }

    const composite = COMPOSITE_UNIT.exec(unitText);
    if (composite) {
      const top = this.dict.unit(composite[1]);
      const bottom = this.dict.unit(composite[3]);
      const per = Number(composite[2]);
      if (top && bottom && bottom.quantity === 'volume' && per > 0) {
        const volumeUl = per * bottom.factor;
        if (top.quantity === 'mass') {
          // mg / mL = amount * mg-per-unit / (μL / 1000)
          const scaled = scaleNumeric(
            toNumericValue(n),
            (top.factor * 1000) / volumeUl,
          );
          const amount = {
            ...scaled,
            unit: 'mg/mL',
            unit_raw: rawUnit,
            quantity: 'concentration_mass',
          };
          return { amount, conc: amount.value, note };
        }
        if (top.quantity === 'volume') {
          const scaled = scaleNumeric(
            toNumericValue(n),
            (top.factor * 100) / volumeUl,
          );
          return {
            amount: {
              ...scaled,
              unit: 'vol%',
              unit_raw: rawUnit,
              quantity: 'volume_fraction',
            },
            conc: null,
            note,
          };
        }
      }
    }

    const def = this.dict.unit(unitText);
    if (!def) {
      qc.error({
        rule: 'unit_unmapped',
        lineage: row.lineage,
        column_name: 'unit',
        raw_value: rawUnit,
        message: `Unit "${rawUnit}" is not in unit_alias.csv`,
        suggestion: suggest(unitText, this.dict.unitCodes(), 0.5),
      });
      return {
        amount: {
          ...emptyUnitValue(rawAmount),
          ...toNumericValue(n),
          unit_raw: rawUnit,
        },
        conc: null,
        note,
      };
    }

    const amount = this.toBase(toNumericValue(n), def, rawUnit);
    return {
      amount,
      conc: def.quantity === 'concentration_mass' ? amount.value : null,
      note,
    };
  }

  // ---------- Process / NiOx synthesis ----------

  private process(row: ShapedRow, qc: QcCollector): ProcessRecord {
    const v = row.values;
    const stepOrder = parseNumeric(v.step_order);
    if (
      v.step_order !== null &&
      (!stepOrder.ok || stepOrder.rest || !Number.isInteger(stepOrder.value))
    ) {
      qc.warn({
        rule: 'step_order_invalid',
        lineage: row.lineage,
        column_name: 'step_order',
        raw_value: v.step_order,
        message: 'StepOrder is not a whole number',
      });
    }

    return {
      lineage: row.lineage,
      raw: row.raw,
      position: this.position(row, qc),
      scope: row.scope ?? 'layer',
      step_order:
        stepOrder.ok && Number.isInteger(stepOrder.value)
          ? stepOrder.value
          : null,
      process_type_raw: v.process_type,
      description: v.description ?? null,
      remarks: v.remarks ?? null,
      params: this.params(row, qc),
    };
  }

  /**
   * Pair "Parameter" and "Unit" by position: "4000, 30" + "RPM, sec" ->
   * spin_speed 4000 rpm, duration 30 s. A count mismatch goes to quarantine
   */
  private params(row: ShapedRow, qc: QcCollector): ProcessParam[] {
    const rawParam = row.values.parameter ?? null;
    const rawUnit = row.values.unit ?? null;
    if (rawParam === null && rawUnit === null) return [];

    const split = (s: string | null) =>
      s === null ? [] : s.split(',').map((t) => t.trim());
    const valueTokens = split(rawParam);
    const unitTokens = split(rawUnit).filter(Boolean);

    if (valueTokens.some((t) => t === '')) {
      qc.warn({
        rule: 'param_empty_token',
        lineage: row.lineage,
        column_name: 'parameter',
        raw_value: rawParam,
        message: 'Empty value between commas was dropped',
      });
    }

    type Slot = {
      parsed: ParsedNumber;
      valueRaw: string;
      unitRaw: string | null;
    };
    const needUnit: Slot[] = [];
    const ready: Slot[] = [];

    for (const token of valueTokens.filter(Boolean)) {
      const parsed = parseNumeric(token);
      // "100 C" - unit typed into the Parameter cell
      if (parsed.ok && parsed.rest && this.dict.unit(parsed.rest)) {
        ready.push({ parsed, valueRaw: token, unitRaw: parsed.rest });
      } else {
        needUnit.push({ parsed, valueRaw: token, unitRaw: null });
      }
    }
    const pureUnits: string[] = [];
    for (const token of unitTokens) {
      const parsed = parseNumeric(token);
      // "30 min" - value typed into the Unit cell
      if (
        parsed.ok &&
        parsed.value !== null &&
        parsed.rest &&
        this.dict.unit(parsed.rest)
      ) {
        ready.push({ parsed, valueRaw: token, unitRaw: parsed.rest });
      } else {
        pureUnits.push(token);
      }
    }

    if (ready.length) {
      qc.warn({
        rule: 'param_unit_inline',
        lineage: row.lineage,
        column_name: 'parameter',
        raw_value: `${rawParam ?? ''} | ${rawUnit ?? ''}`,
        message: 'Value and unit typed in the same cell; split automatically',
      });
    }

    if (needUnit.length !== pureUnits.length) {
      const lostComma =
        needUnit.length === 1 &&
        pureUnits.length > 1 &&
        /^\d{5,}$/.test(needUnit[0].valueRaw);
      qc.error({
        rule: 'param_unit_mismatch',
        lineage: row.lineage,
        column_name: 'parameter',
        raw_value: `${rawParam ?? ''} | ${rawUnit ?? ''}`,
        message: `${needUnit.length} value(s) but ${pureUnits.length} unit(s)${
          lostComma
            ? ' - Excel probably read "a,b" as one number and dropped the comma'
            : ''
        }`,
      });
      return [];
    }
    needUnit.forEach((slot, i) => (slot.unitRaw = pureUnits[i]));

    const params: ProcessParam[] = [];
    for (const slot of [...needUnit, ...ready]) {
      const { parsed } = slot;
      if (
        !parsed.ok ||
        parsed.value === null ||
        (parsed.rest && slot.unitRaw !== parsed.rest)
      ) {
        qc.error({
          rule: 'param_unparseable',
          lineage: row.lineage,
          column_name: 'parameter',
          raw_value: slot.valueRaw,
          message: `Cannot read parameter "${slot.valueRaw}" as a number`,
        });
        continue;
      }
      const def = this.unitOrIssue(slot.unitRaw, row, 'unit', qc);
      if (!def) continue;

      const value = this.toBase(toNumericValue(parsed), def, slot.unitRaw);
      params.push({
        seq: params.length + 1,
        quantity: def.quantity,
        value: value.value,
        value_min: value.value_min,
        value_max: value.value_max,
        qualifier: value.qualifier,
        unit: value.unit,
        value_raw: slot.valueRaw,
        unit_raw: slot.unitRaw,
      });
    }
    return params;
  }

  // ---------- Vender ----------

  private vendor(row: ShapedRow, qc: QcCollector): VendorRecord {
    const v = row.values;
    const materials = splitMentions(
      v.material,
      this.dict.isKnownMaterial,
      /\s*,\s*/,
    );

    let vendorText = v.vendor ?? null;
    if (vendorText && /^not (provided|reported|available)$/i.test(vendorText))
      vendorText = null;
    const vendorsRaw = vendorText
      ? splitTopLevel(vendorText, /\s*\/\s*|\s+or\s+|\s+and\s+/i)
      : [];

    const purity = this.purity(row, qc);
    if (
      purity.grade === null &&
      /anhydrous/i.test(`${v.vendor ?? ''} ${v.material ?? ''}`)
    ) {
      purity.grade = 'anhydrous';
    }

    return {
      lineage: row.lineage,
      raw: row.raw,
      materials,
      vendors_raw: vendorsRaw,
      ...purity,
    };
  }

  private purity(row: ShapedRow, qc: QcCollector) {
    const raw = row.values.purity ?? null;
    const result = {
      purity_pct: null as number | null,
      purity_min: null as number | null,
      purity_max: null as number | null,
      purity_qualifier: null as VendorRecord['purity_qualifier'],
      purity_raw: raw,
      grade: null as string | null,
      spec: null as PuritySpec | null,
    };
    if (raw === null || /^not (provided|reported|available)$/i.test(raw))
      return result;
    if (/^anhydrous$/i.test(raw)) return { ...result, grade: 'anhydrous' };

    const n = parseNumeric(raw);

    // "9 - 15 Ω □-1" is the sheet resistance of FTO, "57 wt%" a concentration - not a purity
    if (/Ω|ohm|\bsq\b|□/i.test(raw) || /wt/i.test(n.rest ?? '')) {
      const kind: PuritySpec['kind'] = /wt/i.test(raw)
        ? 'concentration'
        : 'sheet_resistance';
      return {
        ...result,
        spec: {
          kind,
          value: n.value,
          value_min: n.value_min,
          value_max: n.value_max,
          unit: kind === 'concentration' ? 'wt%' : 'Ω/sq',
          raw,
        },
      };
    }

    if (!n.ok || n.value === null || (n.rest !== null && n.rest !== '%')) {
      qc.error({
        rule: 'purity_unparseable',
        lineage: row.lineage,
        column_name: 'purity',
        raw_value: raw,
        message: `Cannot read purity "${raw}"`,
      });
      return result;
    }
    return {
      ...result,
      purity_pct: n.value,
      purity_min: n.value_min,
      purity_max: n.value_max,
      purity_qualifier: n.qualifier,
    };
  }

  // ---------- Properties ----------

  private measurement(row: ShapedRow, qc: QcCollector): MeasurementRecord {
    const v = row.values;
    const name = parsePropertyName(v.property);
    if (!name) {
      qc.error({
        rule: 'property_missing',
        lineage: row.lineage,
        column_name: 'property',
        message: 'Row has a value but no property name',
      });
    }

    const n = parseNumeric(v.value);
    let unitRaw = v.unit ?? null;
    let value: UnitValue = emptyUnitValue(v.value);

    if (v.value === null) {
      qc.error({
        rule: 'value_missing',
        lineage: row.lineage,
        column_name: 'value',
        message: `${v.property ?? 'Property'} has no value`,
      });
    } else if (!n.ok || (n.rest && unitRaw !== null)) {
      qc.error({
        rule: 'value_unparseable',
        lineage: row.lineage,
        column_name: 'value',
        raw_value: v.value,
        message: `Cannot read "${v.value}" as a number`,
      });
    } else {
      if (n.rest) unitRaw = n.rest;
      const def = this.unitOrIssue(unitRaw, row, 'unit', qc);
      value = {
        ...toNumericValue(n),
        unit: def?.unit ?? null,
        unit_raw: unitRaw,
        quantity: unitRaw === null ? 'dimensionless' : (def?.quantity ?? null),
      };

      const err = parseNumeric(v.error ?? null);
      if (!err.ok || err.rest) {
        qc.warn({
          rule: 'error_unparseable',
          lineage: row.lineage,
          column_name: 'error',
          raw_value: v.error,
          message: `Cannot read error "${v.error}"; ignored`,
        });
      } else if (err.value !== null) {
        value.error = Math.abs(err.value);
      }
    }

    const { source_ref, remarks } = splitRemarks(v.remarks);
    return {
      lineage: row.lineage,
      raw: row.raw,
      property_raw: v.property,
      property_name: name?.name ?? null,
      statistic: name?.statistic ?? 'single',
      scan: name?.scan ?? 'NA',
      context: name?.context ?? [],
      value,
      source_ref,
      remarks,
    };
  }

  // ---------- Stability ----------

  private stability(row: ShapedRow, qc: QcCollector): StabilityRecord {
    const v = row.values;
    const env = this.environment(v.environment ?? null);
    if (
      v.environment !== null &&
      !env.atmosphere &&
      !env.light &&
      !env.mode &&
      !env.isos_code
    ) {
      qc.warn({
        rule: 'environment_unparsed',
        lineage: row.lineage,
        column_name: 'environment',
        raw_value: v.environment,
        message: 'No atmosphere / light / mode / ISOS keyword recognised',
      });
    }

    let encapsulated: boolean | null = null;
    const enc = v.encapsulation ?? null;
    if (enc !== null) {
      if (/^(y|yes|true|encapsulated)$/i.test(enc)) encapsulated = true;
      else if (/^(n|no|false|none|unencapsulated)$/i.test(enc))
        encapsulated = false;
      else {
        qc.error({
          rule: 'encapsulation_invalid',
          lineage: row.lineage,
          column_name: 'encapsulation',
          raw_value: enc,
          message: 'Encapsulation must be Y or N',
        });
      }
    }

    const num = (
      column: string,
      opts: { roomTemperature?: boolean; allowUnit?: string } = {},
    ) =>
      v[column] === undefined
        ? emptyNumeric()
        : this.numericOrIssue(row, column, qc, opts);

    return {
      lineage: row.lineage,
      raw: row.raw,
      environment_raw: v.environment ?? null,
      ...env,
      encapsulated,
      temperature_c: num('temperature_c', {
        roomTemperature: true,
        allowUnit: '°C',
      }),
      rh_pct: num('rh_pct', { allowUnit: '%' }),
      duration_h: num('duration_h', { allowUnit: 'h' }),
      retention_pct: num('retention_pct', { allowUnit: '%' }),
      t80_h: num('t80_h', { allowUnit: 'h' }),
      initial_pce: num('initial_pce', { allowUnit: '%' }),
      final_pce: num('final_pce', { allowUnit: '%' }),
    };
  }

  /**
   * "MPP tracking, 1 Sun, ambient air (ISOS-L-2)" -> air / 1-sun / MPPT / ISOS-L-2
   * using stability_keyword.csv; the ISOS code fills whatever is still missing
   */
  private environment(raw: string | null) {
    const out = {
      atmosphere: null as string | null,
      light: null as string | null,
      mode: null as string | null,
      isos_code: null as string | null,
    };
    if (raw === null) return out;

    for (const rule of this.dict.stabilityRules) {
      if (out[rule.field] === null && rule.pattern.test(raw))
        out[rule.field] = rule.value;
    }

    const isos = /ISOS\s*-?\s*([DLTO])\s*-?\s*(\d)([A-Za-z]?)/i.exec(raw);
    if (isos) {
      const kind = isos[1].toUpperCase();
      out.isos_code = `ISOS-${kind}-${isos[2]}${isos[3].toUpperCase()}`;
      if (kind === 'D') {
        out.light ??= 'dark';
        out.mode ??= 'storage';
      } else if (kind === 'L') {
        out.light ??= '1-sun';
        out.mode ??= 'light_soaking';
      } else if (kind === 'T') {
        out.mode ??= 'thermal';
      } else if (kind === 'O') {
        out.light ??= 'outdoor';
      }
    }
    if (out.mode === 'MPPT') out.light ??= '1-sun';
    if (out.mode === null && out.atmosphere !== null && out.light === null)
      out.mode = 'storage';
    return out;
  }
}
