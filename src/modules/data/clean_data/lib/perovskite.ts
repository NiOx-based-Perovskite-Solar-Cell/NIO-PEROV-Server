import type { IonFraction } from '../interface/clean-data.types';

// Longest first so "FA" is not read as "F" + "A"
const IONS: [string, IonFraction['site']][] = [
  ['DMA', 'A'],
  ['GA', 'A'],
  ['FA', 'A'],
  ['MA', 'A'],
  ['EA', 'A'],
  ['Cs', 'A'],
  ['Rb', 'A'],
  ['K', 'A'],
  ['Pb', 'B'],
  ['Sn', 'B'],
  ['Ge', 'B'],
  ['Br', 'X'],
  ['Cl', 'X'],
  ['I', 'X'],
];

type Counts = Map<string, number>;

class FormulaParser {
  private i = 0;
  constructor(private readonly s: string) {}

  parse(): Counts | null {
    const counts = this.sequence();
    return counts && this.i === this.s.length ? counts : null;
  }

  private sequence(): Counts | null {
    const counts: Counts = new Map();
    let any = false;
    while (this.i < this.s.length && this.s[this.i] !== ')') {
      const item = this.item();
      if (!item) return null;
      for (const [ion, n] of item) counts.set(ion, (counts.get(ion) ?? 0) + n);
      any = true;
    }
    return any ? counts : null;
  }

  private item(): Counts | null {
    let counts: Counts | null = null;
    if (this.s[this.i] === '(') {
      this.i++;
      counts = this.sequence();
      if (!counts || this.s[this.i] !== ')') return null;
      this.i++;
    } else {
      const hit = IONS.find(([ion]) => this.s.startsWith(ion, this.i));
      if (!hit) return null;
      this.i += hit[0].length;
      counts = new Map([[hit[0], 1]]);
    }
    const n = this.number();
    if (n !== null) for (const [ion, c] of counts) counts.set(ion, c * n);
    return counts;
  }

  private number(): number | null {
    const m = /^(\d+(?:\.\d+)?|\.\d+)/.exec(this.s.slice(this.i));
    if (!m) return null;
    this.i += m[0].length;
    return Number(m[0]);
  }
}

/**
 * Parse an ABX3 formula into site fractions, e.g.
 * "Cs0.05(MA0.15FA0.85)0.95Pb(I0.85Br0.15)3" -> A: Cs .05 MA .1425 FA .8075 | B: Pb 1 | X: I 2.55 Br .45
 * Returns null when the text is not a pure formula
 */
export function parsePerovskite(name: string): IonFraction[] | null {
  const s = name.replace(/\[/g, '(').replace(/\]/g, ')').replace(/\s+/g, '');
  if (!/Pb|Sn|Ge/.test(s)) return null;

  const counts = new FormulaParser(s).parse();
  if (!counts) return null;

  const site = new Map(IONS);
  const result: IonFraction[] = [];
  for (const [ion, fraction] of counts) {
    result.push({
      site: site.get(ion)!,
      ion,
      fraction: Number(fraction.toFixed(5)),
    });
  }
  const has = (x: IonFraction['site']) => result.some((r) => r.site === x);
  // PbI2 / PbBr2 are precursor salts, not perovskites
  if (!has('A') || !has('B') || !has('X')) return null;

  const order = { A: 0, B: 1, X: 2 };
  return result.sort((a, b) => order[a.site] - order[b.site]);
}

export function siteSums(
  composition: IonFraction[],
): Record<'A' | 'B' | 'X', number> {
  const sums = { A: 0, B: 0, X: 0 };
  for (const c of composition) sums[c.site] += c.fraction;
  for (const k of Object.keys(sums) as (keyof typeof sums)[]) {
    sums[k] = Number(sums[k].toFixed(5));
  }
  return sums;
}
