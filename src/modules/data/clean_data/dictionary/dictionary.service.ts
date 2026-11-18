import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import type {
  LayerRole,
  NumericValue,
  ProcessScope,
  SheetKey,
} from '../interface/clean-data.types';
import { parseCsv } from '../lib/csv';
import { scaleNumeric } from '../lib/numeric';
import { cleanText, compactKey, textKey } from '../lib/text';

export interface UnitDef {
  unit: string;
  quantity: string;
  factor: number;
  offset: number;
}

export interface PropertyDef {
  code: string;
  unit: string | null;
  alt_quantities: string[];
  valid_min: number | null;
  valid_max: number | null;
}

export interface StabilityRule {
  field: 'atmosphere' | 'light' | 'mode';
  priority: number;
  pattern: RegExp;
  value: string;
}

// Folder with the mapping CSVs - kept in git and reviewed like code
export const DICTIONARY_DIR =
  process.env.CLEAN_DATA_DICT_DIR ?? path.join(__dirname, '..', 'dictionaries');

const materialKey = (s: string) =>
  textKey(s).replace(/[·•]/g, '.').replace(/\s+/g, '');

const unitKey = (s: string) =>
  (cleanText(s) ?? '').replace(/Μ(?=[lL])/g, 'μ').replace(/[\s·⋅*]/g, '');

const VENDOR_NOISE =
  /\b(co|ltd|inc|corp|corporation|company|llc|gmbh|pty|bv|limited|plc|china|japan|taiwan|korea|australia|usa)\b/g;

const vendorKey = (s: string) =>
  textKey(s)
    .replace(/\./g, '')
    .replace(/xi['’\-]?an/g, 'xian')
    .replace(/\btechnol\b\.?/g, 'technology')
    .replace(/\(([^()]*)\)/g, ' $1 ')
    .replace(/[^\p{L}\p{N}&\s]/gu, ' ')
    .replace(VENDOR_NOISE, ' ')
    .replace(/\b\d+\b/g, ' ')
    .replace(/\s+/g, '');

@Injectable()
export class DictionaryService {
  private readonly papers = new Map<
    string,
    { doi: string; verified: boolean }
  >();
  private readonly sheets = new Map<
    string,
    { sheet: SheetKey; scope: ProcessScope | null }
  >();
  private readonly headers = new Map<string, string>();
  private readonly layerRoles = new Map<string, LayerRole>();
  private readonly units = new Map<string, UnitDef>();
  private readonly unitAliases = new Map<string, string>();
  private readonly unitAliasesLower = new Map<string, Set<string>>();
  private readonly baseUnits = new Map<string, UnitDef>();
  private readonly processTypes = new Map<string, string>(); // code -> category
  private readonly processAliases = new Map<string, string>();
  private readonly paramNames = new Map<string, string>();
  private readonly ingredientRoles = new Map<string, string>();
  private readonly properties = new Map<string, PropertyDef>();
  private readonly propertyAliases = new Map<string, string>();
  private readonly materials = new Map<string, string>(); // canonical -> category
  private readonly materialAliases = new Map<
    string,
    { material: string; form: string | null }
  >();
  private readonly solventAliases = new Map<
    string,
    { solvent: string; grade: string | null }
  >();
  private readonly vendors = new Map<string, string>();
  readonly stabilityRules: StabilityRule[] = [];

  constructor() {
    this.load(DICTIONARY_DIR);
  }

  private read(dir: string, file: string): Record<string, string>[] {
    return parseCsv(fs.readFileSync(path.join(dir, file), 'utf-8'));
  }

  private load(dir: string): void {
    for (const r of this.read(dir, 'paper_registry.csv')) {
      this.papers.set(r.file_prefix, {
        doi: r.doi.toLowerCase(),
        verified: r.verified.toLowerCase() === 'true',
      });
    }
    for (const r of this.read(dir, 'sheet_alias.csv')) {
      this.sheets.set(compactKey(r.alias), {
        sheet: r.sheet as SheetKey,
        scope: (r.scope || null) as ProcessScope | null,
      });
    }
    for (const r of this.read(dir, 'header_alias.csv')) {
      this.headers.set(`${r.sheet}:${compactKey(r.alias)}`, r.canonical);
    }
    for (const r of this.read(dir, 'layer_type_alias.csv')) {
      this.layerRoles.set(compactKey(r.alias), r.role as LayerRole);
    }

    for (const r of this.read(dir, 'unit.csv')) {
      const def: UnitDef = {
        unit: r.unit,
        quantity: r.quantity,
        factor: Number(r.factor),
        offset: Number(r.offset || 0),
      };
      this.units.set(r.unit, def);
      if (
        def.factor === 1 &&
        def.offset === 0 &&
        !this.baseUnits.has(def.quantity)
      ) {
        this.baseUnits.set(def.quantity, def);
      }
      this.addUnitAlias(r.unit, r.unit);
    }
    for (const r of this.read(dir, 'unit_alias.csv')) {
      this.addUnitAlias(r.alias, r.unit);
    }

    for (const r of this.read(dir, 'process_type.csv')) {
      this.processTypes.set(r.code, r.category);
      this.processAliases.set(compactKey(r.code), r.code);
    }
    for (const r of this.read(dir, 'process_alias.csv')) {
      this.processAliases.set(compactKey(r.alias), r.process_type);
    }
    for (const r of this.read(dir, 'param_name.csv')) {
      this.paramNames.set(`${r.quantity}:${r.process_type}`, r.param);
    }
    for (const r of this.read(dir, 'ingredient_role_alias.csv')) {
      this.ingredientRoles.set(compactKey(r.alias), r.role);
    }

    for (const r of this.read(dir, 'property.csv')) {
      const num = (v: string) => (v === '' ? null : Number(v));
      this.properties.set(r.code, {
        code: r.code,
        unit: r.unit || null,
        alt_quantities: r.alt_quantities ? r.alt_quantities.split('|') : [],
        valid_min: num(r.valid_min),
        valid_max: num(r.valid_max),
      });
      this.propertyAliases.set(compactKey(r.code), r.code);
    }
    for (const r of this.read(dir, 'property_alias.csv')) {
      this.propertyAliases.set(compactKey(r.alias), r.property);
    }

    for (const r of this.read(dir, 'material.csv')) {
      this.materials.set(r.name, r.category);
      this.materialAliases.set(materialKey(r.name), {
        material: r.name,
        form: null,
      });
    }
    for (const r of this.read(dir, 'material_alias.csv')) {
      this.materialAliases.set(materialKey(r.alias), {
        material: r.material,
        form: r.form || null,
      });
    }
    for (const r of this.read(dir, 'solvent_alias.csv')) {
      this.solventAliases.set(materialKey(r.alias), {
        solvent: r.solvent,
        grade: r.grade || null,
      });
    }

    for (const r of this.read(dir, 'vendor_alias.csv')) {
      this.vendors.set(vendorKey(r.alias), r.vendor);
      this.vendors.set(vendorKey(r.vendor), r.vendor);
    }

    for (const r of this.read(dir, 'stability_keyword.csv')) {
      this.stabilityRules.push({
        field: r.field as StabilityRule['field'],
        priority: Number(r.priority),
        pattern: new RegExp(r.pattern, 'i'),
        value: r.value,
      });
    }
    this.stabilityRules.sort((a, b) => a.priority - b.priority);
  }

  private addUnitAlias(alias: string, unit: string): void {
    const key = unitKey(alias);
    this.unitAliases.set(key, unit);
    const lower = key.toLowerCase();
    this.unitAliasesLower.set(
      lower,
      (this.unitAliasesLower.get(lower) ?? new Set()).add(unit),
    );
  }

  // ---------- lookups ----------

  paper(prefix: string | null) {
    return prefix === null ? undefined : this.papers.get(prefix);
  }

  sheet(name: string) {
    const key = compactKey(name);
    return (
      this.sheets.get(key) ??
      (key.endsWith('synthesis')
        ? {
            sheet: 'process' as SheetKey,
            scope: 'material_synthesis' as ProcessScope,
          }
        : undefined)
    );
  }

  header(sheet: SheetKey, raw: string): string | undefined {
    return this.headers.get(`${sheet}:${compactKey(raw)}`);
  }

  layerRole(type: string): LayerRole | undefined {
    return this.layerRoles.get(compactKey(type));
  }

  unit(raw: string | null): UnitDef | undefined {
    if (raw === null) return undefined;
    const key = unitKey(raw);
    const code =
      this.unitAliases.get(key) ??
      (() => {
        const hits = this.unitAliasesLower.get(key.toLowerCase());
        return hits && hits.size === 1 ? [...hits][0] : undefined;
      })();
    return code === undefined ? undefined : this.units.get(code);
  }

  unitByCode(code: string): UnitDef | undefined {
    return this.units.get(code);
  }

  baseUnit(quantity: string): UnitDef | undefined {
    return this.baseUnits.get(quantity);
  }

  convert<T extends NumericValue>(v: T, from: UnitDef, to: UnitDef): T {
    if (from.unit === to.unit) return v;
    // to base, then from base to target
    const factor = from.factor / to.factor;
    const offset = (from.offset - to.offset) / to.factor;
    return scaleNumeric(v, factor, offset);
  }

  processType(raw: string): { code: string; category: string } | undefined {
    const code = this.processAliases.get(compactKey(raw));
    return code === undefined
      ? undefined
      : { code, category: this.processTypes.get(code) ?? 'other' };
  }

  paramName(quantity: string, processType: string | null): string {
    return (
      (processType && this.paramNames.get(`${quantity}:${processType}`)) ||
      this.paramNames.get(`${quantity}:*`) ||
      quantity
    );
  }

  ingredientRole(raw: string): string | undefined {
    return this.ingredientRoles.get(compactKey(raw));
  }

  property(name: string): PropertyDef | undefined {
    const code = this.propertyAliases.get(compactKey(name));
    return code === undefined ? undefined : this.properties.get(code);
  }

  propertyByCode(code: string): PropertyDef | undefined {
    return this.properties.get(code);
  }

  material(
    name: string,
  ): { material: string; form: string | null } | undefined {
    const key = materialKey(name);
    const hit = this.materialAliases.get(key);
    if (hit) return hit;
    const solvent = this.solventAliases.get(key);
    return solvent ? { material: solvent.solvent, form: null } : undefined;
  }

  isKnownMaterial = (name: string): boolean =>
    this.material(name) !== undefined;

  materialCategory(name: string): string | null {
    return this.materials.get(name) ?? null;
  }

  solvent(name: string): { solvent: string; grade: string | null } | undefined {
    const key = materialKey(name);
    const hit = this.solventAliases.get(key);
    if (hit) return hit;
    const material = this.materialAliases.get(key);
    return material ? { solvent: material.material, grade: null } : undefined;
  }

  vendor(name: string): string | undefined {
    return this.vendors.get(vendorKey(name));
  }

  // ---------- candidates for fuzzy suggestions ----------

  materialNames(): string[] {
    return [...this.materials.keys()];
  }

  vendorNames(): string[] {
    return [...new Set(this.vendors.values())];
  }

  processCodes(): string[] {
    return [...this.processTypes.keys()];
  }

  propertyCodes(): string[] {
    return [...this.properties.keys()];
  }

  unitCodes(): string[] {
    return [...this.units.keys()];
  }

  layerRoleNames(): string[] {
    return [...new Set(this.layerRoles.values())];
  }

  ingredientRoleNames(): string[] {
    return [...new Set(this.ingredientRoles.values())];
  }
}
