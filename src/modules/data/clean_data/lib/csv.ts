/**
 * Minimal RFC 4180 CSV reader for the mapping dictionaries.
 * Lines starting with "#" are comments; the first row is the header
 */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const src = text.replace(/^﻿/, '');

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const content = rows.filter(
    (r) => !(r.length === 1 && r[0].trim() === '') && !r[0].startsWith('#'),
  );
  if (content.length === 0) return [];

  const header = content[0].map((h) => h.trim());
  return content.slice(1).map((r) => {
    const record: Record<string, string> = {};
    header.forEach((h, i) => (record[h] = (r[i] ?? '').trim()));
    return record;
  });
}
