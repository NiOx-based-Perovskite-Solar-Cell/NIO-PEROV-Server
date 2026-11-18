export interface ParsedFileName {
  file_prefix: string;
  sample_no: number;
  doi_guess: string | null;
}

/**
 * "<DOI>_Sample<n>.xlsx" where the DOI was typed 3 ways:
 *   10.1002_solr.202400534   -> "_" stands for "/"
 *   10_1002_solr_202400534   -> every "." and "/" became "_"
 *   10.1016j.nanoen.2021.106285 / 10.1016.jpowsour... -> "/" dropped or became "."
 * The guess is only a fallback - paper_registry.csv is the source of truth
 */
export function parseFileName(fileName: string): ParsedFileName | null {
  const base = fileName.replace(/^.*[\\/]/, '');
  const match = /^(.+?)_Sample\s*(\d+)\.(xlsx|xlsm|xls)$/i.exec(base);
  if (!match) return null;

  const prefix = match[1].trim();
  return {
    file_prefix: prefix,
    sample_no: Number(match[2]),
    doi_guess: guessDoi(prefix),
  };
}

export function guessDoi(prefix: string): string | null {
  const underscored = /^10_(\d{4,9})_?(.+)$/.exec(prefix);
  if (underscored) {
    return normalizeDoi(
      `10.${underscored[1]}/${underscored[2].replace(/_/g, '.')}`,
    );
  }
  const dotted = /^10\.(\d{4,9})[._/]?(.+)$/.exec(prefix);
  if (dotted) return normalizeDoi(`10.${dotted[1]}/${dotted[2]}`);
  return null;
}

export function normalizeDoi(doi: string): string {
  return doi
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '')
    .toLowerCase();
}

/**
 * DOI as stored in paper.doi: normalized, and a file-name style DOI
 * (10_1002_advs_202309111, no "/") is turned back into a real one
 */
export function canonicalDoi(input: string): string {
  const doi = normalizeDoi(input);
  if (!doi.includes('/')) return guessDoi(doi) ?? doi;
  return doi;
}
