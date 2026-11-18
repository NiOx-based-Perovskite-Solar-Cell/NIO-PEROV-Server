import type { MaterialMention } from '../interface/clean-data.types';
import { parsePerovskite } from './perovskite';
import { cleanText, splitTopLevel, splitTrailingParen } from './text';

const FORM_SUFFIX: [RegExp, string][] = [
  [/\s+(nps?|nanoparticles?|nanoparticle ink|nps ink|ink)$/i, 'NP'],
  [/\s+(qds?|peqds?|quantum dots?)$/i, 'QD'],
  [/\s+(powder)$/i, 'powder'],
  [/\s+(sputtering target|target)(\s*\(.*\))?$/i, 'target'],
  [/\s+(coated glass|glass substrates?|glass|substrates?)$/i, 'substrate'],
  [/\s+SAM$/, 'SAM'],
];

const FORM_NOTE: [RegExp, string][] = [
  [/sputter/i, 'sputtered'],
  [/thin film/i, 'film'],
  [/nanoparticle|^nps?$/i, 'NP'],
  [/powder/i, 'powder'],
];

// "EMIMI-1%", "BN 2 vol%", "CsI 5 mg/mL" -> amount note at the end
const AMOUNT_SUFFIX =
  /^(.*?)[\s-]+(\d+(?:\.\d+)?\s*(?:vol%|wt%|mol%|%|mg\/mL|M))$/i;
// "10% MACl"
const AMOUNT_PREFIX = /^(\d+(?:\.\d+)?\s*%)\s+(.+)$/;

/**
 * Parse one material name into a cleaned name, its form (NP, film ...),
 * notes and - for perovskite formulas - the A/B/X composition.
 * No dictionary is used here; 04 resolve maps `name` to a canonical material
 */
export function parseMention(input: string): MaterialMention {
  const raw = input.trim();
  let name = cleanText(raw) ?? '';
  const notes: string[] = [];
  let form: string | null = null;

  name = name.replace(/^\[\s*(.*?)\s*\]$/, '$1');

  for (
    let paren = splitTrailingParen(name);
    paren;
    paren = splitTrailingParen(name)
  ) {
    name = paren.head;
    if (paren.inner) notes.unshift(paren.inner);
  }

  const prefix = AMOUNT_PREFIX.exec(name);
  if (prefix) {
    notes.push(prefix[1]);
    name = prefix[2];
  }
  const suffix = AMOUNT_SUFFIX.exec(name);
  if (suffix && !parsePerovskite(name)) {
    name = suffix[1];
    notes.push(suffix[2]);
  }

  for (const [pattern, f] of FORM_SUFFIX) {
    if (pattern.test(name)) {
      name = name.replace(pattern, '').trim();
      form = f;
      break;
    }
  }
  if (!form) {
    for (const note of notes) {
      const hit = FORM_NOTE.find(([pattern]) => pattern.test(note));
      if (hit) {
        form = hit[1];
        break;
      }
    }
  }

  let composition = parsePerovskite(name);
  if (!composition) {
    // "KI-Cs0.04FA0.83MA0.12Pb(I0.88Br0.12)3" - additive glued in front
    const glued = /^([A-Za-z0-9]+)-(.+)$/.exec(name);
    const inner = glued ? parsePerovskite(glued[2]) : null;
    if (glued && inner) {
      notes.push(`${glued[1]} additive`);
      name = glued[2];
      composition = inner;
    }
  }

  return { raw, name, form, notes, composition };
}

/**
 * Split a layer cell that names several materials: "LiF / C60 / BCP",
 * "PTAA + Al2O3", "Cs...Pb(I0.8Br0.2)3 + 5C7A". `isKnown` lets a full alias such
 * as "Cs/FA/MA" win over splitting
 */
export function splitMentions(
  input: string | null,
  isKnown: (name: string) => boolean,
  // "/" splits a stack, but not inside a unit such as "mg/mL"
  separator: RegExp = /\s*\/\s*(?![mμ]?[lL]\b)|\s*\+\s*/,
): MaterialMention[] {
  const s = cleanText(input);
  if (s === null) return [];
  if (isKnown(s)) return [parseMention(s)];

  const parts = splitTopLevel(s, separator);
  if (parts.length <= 1) return [parseMention(s)];
  return parts.map((p) => parseMention(p));
}
