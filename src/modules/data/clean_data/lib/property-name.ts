import type { ScanDirection, StatKind } from '../interface/clean-data.types';
import { cleanText } from './text';

export interface ParsedPropertyName {
  name: string;
  statistic: StatKind;
  scan: ScanDirection;
  context: string[];
}

/**
 * "Champion PCE (RS)" -> PCE / champion / RS
 * "Average  Jsc"      -> Jsc / average / NA
 * "VBM (NiOx)"        -> VBM / single / NA / context NiOx
 */
export function parsePropertyName(input: unknown): ParsedPropertyName | null {
  let s = cleanText(input);
  if (s === null) return null;

  let scan: ScanDirection = 'NA';
  let statistic: StatKind = 'single';
  const context: string[] = [];

  // Bare RS / FS only in capitals - "Rs" is the series resistance, not a scan
  s = s.replace(/\(\s*(RS|FS)\s*\)/gi, (_m, dir: string) => {
    scan = dir.toUpperCase() as ScanDirection;
    return ' ';
  });
  s = s.replace(/\b(RS|FS)\b/g, (_m, dir: string) => {
    scan = dir as ScanDirection;
    return ' ';
  });
  s = s.replace(/\breverse scan\b/i, () => ((scan = 'RS'), ' '));
  s = s.replace(/\bforward scan\b/i, () => ((scan = 'FS'), ' '));

  s = s.replace(/\(([^()]*)\)/g, (_m, inner: string) => {
    if (inner.trim()) context.push(inner.trim());
    return ' ';
  });

  const stat =
    /^(champion|best|max(?:imum)?|average|avg\.?|mean|certified|verified)\s*/i.exec(
      s.trim(),
    );
  if (stat) {
    const word = stat[1].toLowerCase();
    if (/^(average|avg|mean)/.test(word)) statistic = 'average';
    else if (/^(certified|verified)/.test(word)) context.push(word);
    else statistic = 'champion';
    s = s.trim().slice(stat[0].length);
  }

  const name = cleanText(s);
  if (name === null) return null;
  return { name, statistic, scan, context };
}

const SOURCE_REF =
  /\b(?:Table\s*S?\d+[a-z]?|(?:Fig(?:ure)?s?\.?)\s*S?\d+(?:\s*[a-z](?:[-/][a-z0-9]+)*)?)/gi;

// Pull "Table S4" / "Figure 3e-i" into source_ref and keep the rest as remarks
export function splitRemarks(input: unknown): {
  source_ref: string | null;
  remarks: string | null;
} {
  const s = cleanText(input);
  if (s === null) return { source_ref: null, remarks: null };

  const refs = (s.match(SOURCE_REF) ?? []).map((r) =>
    r.replace(/^Fig(?:ure)?s?\.?\s*/i, 'Fig. ').replace(/^Table\s*/i, 'Table '),
  );
  const rest = cleanText(
    s.replace(SOURCE_REF, ' ').replace(/^[\s,;/]+|[\s,;/]+$/g, ''),
  );
  return {
    source_ref: refs.length ? refs.join('; ') : null,
    remarks: rest,
  };
}
