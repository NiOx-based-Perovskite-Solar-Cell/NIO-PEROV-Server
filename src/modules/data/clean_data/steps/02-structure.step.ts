import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { DictionaryService } from '../dictionary/dictionary.service';
import type {
  IngestData,
  PipelineState,
  ProcessScope,
  RawSheet,
  SheetKey,
  ShapedRow,
  StructureData,
} from '../interface/clean-data.types';
import { QcCollector } from '../lib/qc';
import { cleanText } from '../lib/text';

const REQUIRED_COLUMNS: Record<SheetKey, string[]> = {
  layer: ['layer_id', 'layer_type', 'material'],
  vendor: ['material'],
  materials: ['layer_id', 'material'],
  process: ['layer_id', 'process_type'],
  properties: ['property', 'value'],
  stability: ['environment'],
};

// Columns that only identify a row - a row with nothing else is empty
const KEY_COLUMNS = new Set(['layer_id', 'step_order']);

/**
 * 02 · STRUCTURE (Silver) - find sheets by name (not by position), rename
 * headers with header_alias.csv, drop unnamed columns and empty rows,
 * forward-fill LayerID
 */
@Injectable()
export class StructureStep {
  constructor(private readonly dict: DictionaryService) {}

  run(state: PipelineState<IngestData>): PipelineState<StructureData> {
    const qc = new QcCollector('structure', state.file, state.issues);
    const data: StructureData = {
      layer: [],
      vendor: [],
      materials: [],
      process: [],
      properties: [],
      stability: [],
    };
    const found = new Set<SheetKey>();

    for (const sheet of state.data.sheets) {
      const target = this.dict.sheet(sheet.name);
      if (!target) {
        qc.warn({
          rule: 'sheet_unknown',
          sheet: sheet.name,
          message: `Sheet "${sheet.name}" is not in sheet_alias.csv and was skipped`,
        });
        continue;
      }
      found.add(target.sheet);
      const scope: ProcessScope | undefined =
        target.sheet === 'process' ? (target.scope ?? 'layer') : undefined;
      data[target.sheet].push(
        ...this.shape(sheet, target.sheet, scope, state.file.file_name, qc),
      );
    }

    if (!found.has('layer')) {
      qc.error({
        rule: 'sheet_missing',
        sheet: 'Layer',
        message:
          'No Layer sheet - every other sheet links to it through LayerID',
        fatal: true,
      });
    }
    for (const key of [
      'vendor',
      'materials',
      'process',
      'properties',
      'stability',
    ] as SheetKey[]) {
      if (!found.has(key)) {
        qc.warn({
          rule: 'sheet_missing',
          sheet: key,
          message: `No ${key} sheet in this file`,
        });
      }
    }

    return qc.state(data);
  }

  private shape(
    sheet: RawSheet,
    key: SheetKey,
    scope: ProcessScope | undefined,
    sourceFile: string,
    qc: QcCollector,
  ): ShapedRow[] {
    const columns: { index: number; raw: string; canonical: string }[] = [];
    const unnamed: number[] = [];
    const taken = new Set<string>();

    sheet.header.forEach((h, index) => {
      const text = cleanText(h);
      if (text === null) {
        unnamed.push(index);
        return;
      }
      const canonical = this.dict.header(key, text);
      if (!canonical) {
        qc.warn({
          rule: 'header_unmapped',
          sheet: sheet.name,
          row_no: 1,
          column_name: text,
          message: `Header "${text}" is not in header_alias.csv; column ignored`,
        });
        return;
      }
      if (taken.has(canonical)) {
        qc.warn({
          rule: 'header_duplicate',
          sheet: sheet.name,
          row_no: 1,
          column_name: text,
          message: `Second column mapped to ${canonical}; only the first is used`,
        });
        return;
      }
      taken.add(canonical);
      columns.push({ index, raw: text, canonical });
    });

    const missing = REQUIRED_COLUMNS[key].filter((c) => !taken.has(c));
    if (missing.length) {
      qc.error({
        rule: 'column_missing',
        sheet: sheet.name,
        message: `Required column(s) ${missing.join(', ')} not found; sheet skipped`,
        fatal: key === 'layer',
      });
      return [];
    }

    const rows: ShapedRow[] = [];
    let lastLayerId: string | null = null;

    for (const row of sheet.rows) {
      const raw: Record<string, string | null> = {};
      const values: Record<string, string | null> = {};
      for (const col of columns) {
        raw[col.raw] = row.cells[col.index] ?? null;
        values[col.canonical] = cleanText(row.cells[col.index]);
      }

      const hasData = Object.entries(values).some(
        ([k, v]) => v !== null && !KEY_COLUMNS.has(k),
      );
      if (!hasData) continue; // blank row, or a row with only LayerID

      for (const index of unnamed) {
        const value = cleanText(row.cells[index]);
        if (value === null) continue;
        const letter = XLSX.utils.encode_col(index);
        raw[`(column ${letter})`] = row.cells[index];
        qc.warn({
          rule: 'unnamed_column_data',
          sheet: sheet.name,
          row_no: row.row_no,
          column_name: letter,
          raw_value: value,
          message: `Value in column ${letter} which has no header; not used`,
        });
      }

      if ('layer_id' in values && key !== 'layer') {
        if (values.layer_id === null) values.layer_id = lastLayerId;
        else lastLayerId = values.layer_id;
      }

      rows.push({
        lineage: {
          source_file: sourceFile,
          source_sheet: sheet.name,
          source_row: row.row_no,
        },
        raw,
        values,
        ...(scope ? { scope } : {}),
      });
    }
    return rows;
  }
}
