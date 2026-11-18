import type { SolventSystem } from '../interface/clean-data.types';
import { cleanText, splitTopLevel, splitTrailingParen } from './text';

const RATIO =
  /^(\d+(?:\.\d+)?(?:\s*[:/]\s*\d+(?:\.\d+)?)+)\s*(μL|µL|uL|mL|ml)?\s*([vw](?:\s*[/:]\s*[vw])+)?$/i;

/**
 * "DMF/DMSO (4/1 V/V)", "DMSO:DMF (1:4 v/v)", "DMF/DMSO (800/200 µL)",
 * "DCB (anhydrous)" -> components + fractions + basis.
 * Names stay raw here; 04 resolve maps them and sorts the system
 */
export function parseSolvent(input: unknown): {
  system: SolventSystem | null;
  problem: string | null;
} {
  const raw = cleanText(input);
  if (raw === null) return { system: null, problem: null };

  let names = raw;
  const notes: string[] = [];
  let ratio: number[] | null = null;
  let basis: string | null = null;

  const paren = splitTrailingParen(raw);
  if (paren) {
    const m = RATIO.exec(paren.inner);
    if (m) {
      ratio = m[1].split(/[:/]/).map((n) => Number(n.trim()));
      if (m[2]) basis = 'v/v';
      if (m[3]) basis = m[3].toLowerCase().startsWith('w') ? 'w/w' : 'v/v';
    } else if (paren.inner) {
      notes.push(paren.inner);
    }
    names = paren.head;
  }

  const parts = splitTopLevel(names, /\s*[:/+,]\s*|\s+and\s+/);
  const components = parts.map((p) => ({
    raw: p,
    fraction: null as number | null,
  }));
  let problem: string | null = null;

  if (ratio && ratio.length !== components.length) {
    problem = `${components.length} solvent name(s) but ${ratio.length} ratio values`;
  } else if (components.length === 1) {
    components[0].fraction = 1;
  } else if (ratio) {
    const total = ratio.reduce((a, b) => a + b, 0);
    components.forEach(
      (c, i) => (c.fraction = Number((ratio[i] / total).toFixed(4))),
    );
  }

  return { system: { raw, basis, components, notes }, problem };
}
