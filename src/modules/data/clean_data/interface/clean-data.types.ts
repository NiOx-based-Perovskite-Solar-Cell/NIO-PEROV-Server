// Shared types for the raw-xlsx -> gold clean pipeline
// Bronze: 01 ingest | Silver: 02 structure, 03 standardize, 04 resolve, 05 validate | Gold: 06 load

export const PIPELINE_STEPS = [
  'ingest',
  'structure',
  'standardize',
  'resolve',
  'validate',
  'load',
] as const;
export type StepName = (typeof PIPELINE_STEPS)[number];

export type Severity = 'error' | 'warn';
export type Qualifier = 'eq' | 'lt' | 'gt' | 'le' | 'ge' | 'approx';
export type ProcessScope = 'layer' | 'material_synthesis';
export type StatKind = 'champion' | 'average' | 'single';
export type ScanDirection = 'RS' | 'FS' | 'NA';
export type LayerRole =
  | 'anode'
  | 'htl'
  | 'htl_treatment'
  | 'psk'
  | 'psk_treatment'
  | 'etl'
  | 'etl_treatment'
  | 'cathode';

export type SheetKey =
  | 'layer'
  | 'vendor'
  | 'materials'
  | 'process'
  | 'properties'
  | 'stability';

export interface QcIssue {
  step: StepName;
  severity: Severity;
  rule: string;
  message: string;
  source_file: string;
  sheet?: string;
  row_no?: number;
  column_name?: string;
  raw_value?: string | null;
  suggestion?: string;
  // File-level error that stops the pipeline (unreadable file, no Layer sheet ...)
  fatal?: boolean;
}

// Every row keeps where it came from so a value can be traced back to the Excel cell
export interface Lineage {
  source_file: string;
  source_sheet: string;
  source_row: number;
}

export interface FileRegistry {
  file_name: string;
  file_prefix: string | null;
  doi: string | null;
  doi_verified: boolean;
  sample_no: number | null;
  sha256: string;
  size_bytes: number;
  ingested_at: string;
}

/**
 * What every step receives and returns. Steps only ever append to `issues`,
 * so the JSON from one step can be fed straight into the next one
 */
export interface PipelineState<T> {
  step: StepName;
  file: FileRegistry;
  issues: QcIssue[];
  data: T;
}

// ---------- 01 ingest ----------

export interface RawRow {
  row_no: number; // 1-based Excel row number (header is row 1)
  cells: (string | null)[];
}

export interface RawSheet {
  name: string;
  header: (string | null)[];
  rows: RawRow[];
}

export interface IngestData {
  sheets: RawSheet[];
}

// ---------- 02 structure ----------

export interface ShapedRow {
  lineage: Lineage;
  raw: Record<string, string | null>; // original header -> cell text
  values: Record<string, string | null>; // canonical column -> cell text
  scope?: ProcessScope;
}

export type StructureData = Record<SheetKey, ShapedRow[]>;

// ---------- 03 standardize ----------

export interface NumericValue {
  value: number | null;
  value_min: number | null;
  value_max: number | null;
  qualifier: Qualifier;
  error: number | null;
  value_raw: string | null;
}

export interface UnitValue extends NumericValue {
  unit: string | null;
  unit_raw: string | null;
  quantity: string | null;
}

export interface IonFraction {
  site: 'A' | 'B' | 'X';
  ion: string;
  fraction: number;
}

export interface MaterialMention {
  raw: string;
  name: string; // cleaned name before dictionary lookup
  form: string | null;
  notes: string[];
  composition: IonFraction[] | null; // set when the name parses as a perovskite formula
  // filled by 04 resolve
  material?: string | null;
  known?: boolean;
}

export interface BaseRecord {
  lineage: Lineage;
  raw: Record<string, string | null>;
}

export interface LayerRecord extends BaseRecord {
  position: number | null;
  sub_order: number;
  layer_type_raw: string | null;
  layer_type: string | null; // type without the sub-order suffix
  material_raw: string | null;
  components: MaterialMention[];
  thickness: UnitValue; // nm
  component_thickness_nm: (number | null)[] | null; // "4, 100" -> one value per component
  role?: LayerRole | null;
}

export interface SolventComponent {
  raw: string;
  fraction: number | null;
  material?: string | null;
  known?: boolean;
}

export interface SolventSystem {
  raw: string;
  basis: string | null;
  components: SolventComponent[];
  notes: string[];
  label?: string;
}

export interface IngredientRecord extends BaseRecord {
  position: number | null;
  material: MaterialMention | null;
  role_raw: string | null;
  solvent: SolventSystem | null;
  amount: UnitValue;
  conc_mg_per_ml: number | null;
  unit_note: string | null;
  role?: string | null;
}

export interface ProcessParam {
  seq: number;
  quantity: string | null;
  value: number | null;
  value_min: number | null;
  value_max: number | null;
  qualifier: Qualifier;
  unit: string | null;
  value_raw: string | null;
  unit_raw: string | null;
  param?: string;
}

export interface ProcessRecord extends BaseRecord {
  position: number | null;
  scope: ProcessScope;
  step_order: number | null;
  process_type_raw: string | null;
  description: string | null;
  remarks: string | null;
  params: ProcessParam[];
  process_type?: string | null;
  category?: string | null;
}

export interface PuritySpec {
  kind: 'sheet_resistance' | 'concentration';
  value: number | null;
  value_min: number | null;
  value_max: number | null;
  unit: string | null;
  raw: string;
}

export interface VendorRecord extends BaseRecord {
  materials: MaterialMention[];
  vendors_raw: string[];
  purity_pct: number | null;
  purity_min: number | null;
  purity_max: number | null;
  purity_qualifier: Qualifier | null;
  purity_raw: string | null;
  grade: string | null;
  spec: PuritySpec | null;
  vendors?: { vendor: string; known: boolean }[];
}

export interface MeasurementRecord extends BaseRecord {
  property_raw: string | null;
  property_name: string | null; // name with statistic/scan/context removed
  statistic: StatKind;
  scan: ScanDirection;
  context: string[];
  value: UnitValue;
  source_ref: string | null;
  remarks: string | null;
  property?: string | null;
}

export interface StabilityRecord extends BaseRecord {
  environment_raw: string | null;
  atmosphere: string | null;
  light: string | null;
  mode: string | null;
  isos_code: string | null;
  encapsulated: boolean | null;
  temperature_c: NumericValue;
  rh_pct: NumericValue;
  duration_h: NumericValue;
  retention_pct: NumericValue;
  t80_h: NumericValue;
  initial_pce: NumericValue;
  final_pce: NumericValue;
}

export interface CleanRecords {
  layers: LayerRecord[];
  ingredients: IngredientRecord[];
  processes: ProcessRecord[];
  vendors: VendorRecord[];
  measurements: MeasurementRecord[];
  stability: StabilityRecord[];
}

export type StandardizeData = CleanRecords;
export type ResolveData = CleanRecords;

// ---------- 05 validate ----------

export interface QuarantineRow {
  lineage: Lineage;
  raw: Record<string, string | null>;
  issues: QcIssue[];
}

export interface ValidateData {
  passed: CleanRecords;
  quarantine: QuarantineRow[];
}

// ---------- 06 load (gold JSON, same shape as the PostgreSQL tables) ----------

export interface GoldDocument {
  paper: {
    doi: string | null;
    file_prefix: string | null;
    doi_verified: boolean;
  };
  sample: {
    sample_no: number | null;
    architecture: 'nip' | 'pin' | null;
    source_file: string;
    file_sha256: string;
  };
  layers: Record<string, unknown>[];
  layer_ingredients: Record<string, unknown>[];
  process_steps: Record<string, unknown>[];
  material_sources: Record<string, unknown>[];
  measurements: Record<string, unknown>[];
  stability_tests: Record<string, unknown>[];
  v_device_summary: Record<string, unknown>;
}

export interface LoadData {
  gold: GoldDocument;
  quarantine: QuarantineRow[];
}

// ---------- pipeline result ----------

export type FileStatus = 'passed' | 'partial' | 'failed' | 'duplicate';

export interface FileResult {
  file: FileRegistry;
  status: FileStatus;
  stats: {
    rows_in: number;
    rows_clean: number;
    rows_quarantined: number;
    errors: number;
    warnings: number;
  };
  clean: GoldDocument | null;
  // The "did not pass" block: every error plus the raw rows that were held back
  quarantine: {
    errors: QcIssue[];
    rows: QuarantineRow[];
  } | null;
  warnings: QcIssue[];
  // Present when the run was stopped early with `until`
  stopped_at?: StepName;
  state?: PipelineState<unknown>;
}
