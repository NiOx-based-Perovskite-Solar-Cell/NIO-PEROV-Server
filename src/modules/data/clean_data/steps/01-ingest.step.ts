import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import * as XLSX from 'xlsx';
import type {
  FileRegistry,
  IngestData,
  PipelineState,
  RawSheet,
} from '../interface/clean-data.types';
import { parseFileName } from '../lib/doi';
import { QcCollector } from '../lib/qc';

export interface IngestInput {
  fileName: string;
  buffer: Buffer;
}

/**
 * 01 · INGEST (Bronze) - read every sheet as text exactly as typed, never edit
 * values. Registers the file: doi + sample_no from the file name, sha256, size
 */
@Injectable()
export class IngestStep {
  run({ fileName, buffer }: IngestInput): PipelineState<IngestData> {
    const parsed = parseFileName(fileName);

    const file: FileRegistry = {
      file_name: fileName.replace(/^.*[\\/]/, ''),
      file_prefix: parsed?.file_prefix ?? null,
      doi: parsed?.doi_guess ?? null,
      sample_no: parsed?.sample_no ?? null,
      sha256: createHash('sha256').update(buffer).digest('hex'),
      size_bytes: buffer.length,
      ingested_at: new Date().toISOString(),
    };
    const qc = new QcCollector('ingest', file);

    if (!parsed) {
      qc.error({
        rule: 'file_name_unparsed',
        message:
          'File name is not "<DOI>_Sample<n>.xlsx", so doi and sample_no are unknown',
        raw_value: file.file_name,
      });
    } else if (!file.doi) {
      qc.warn({
        rule: 'doi_unparsed',
        message: `Cannot read a DOI from file prefix "${parsed.file_prefix}"`,
        raw_value: parsed.file_prefix,
      });
    }

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: 'buffer' });
    } catch (error: unknown) {
      qc.error({
        rule: 'file_unreadable',
        message: `Cannot read workbook: ${error instanceof Error ? error.message : String(error)}`,
        fatal: true,
      });
      return qc.state({ sheets: [] });
    }

    const sheets = workbook.SheetNames.map((name) =>
      this.readSheet(name, workbook.Sheets[name]),
    );
    return qc.state({ sheets });
  }

  private readSheet(name: string, ws: XLSX.WorkSheet): RawSheet {
    if (!ws || !ws['!ref']) return { name, header: [], rows: [] };

    const firstRow = XLSX.utils.decode_range(ws['!ref']).s.r;
    const grid = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      raw: true,
      defval: null,
      blankrows: true,
    });
    const asText = (v: unknown): string | null =>
      v === null || v === undefined ? null : String(v);

    const [header = [], ...body] = grid;
    const rows = body
      .map((cells, i) => ({
        row_no: firstRow + i + 2,
        cells: cells.map(asText),
      }))
      // Most sheets carry ~1000 empty formatted rows - they hold nothing to keep
      .filter((r) => r.cells.some((c) => c !== null && c.trim() !== ''));

    return { name, header: header.map(asText), rows };
  }
}
