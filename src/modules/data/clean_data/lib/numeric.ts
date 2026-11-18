import type { NumericValue, Qualifier } from '../interface/clean-data.types';
import { cleanText } from './text';

// 12 | 1.5 | .05 | 1.2E+16 | 10e-3 | 4x10-6 | 1.01x10^-3
const NUM = String.raw`[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:\s*[eE]\s*[-+]?\s*\d+|\s*x\s*10\s*\^?\s*[-+]?\s*\d+)?`;

const QUALIFIERS: [RegExp, Qualifier][] = [
  [/^(<=|≤|=<)\s*/, 'le'],
  [/^(>=|≥|=>)\s*/, 'ge'],
  [/^up\s+to\s+/i, 'le'],
  [/^</, 'lt'],
  [/^>/, 'gt'],
  [/^(~|≈|ca\.?\s|approx\.?\s*)\s*/i, 'approx'],
];

const PLUS_MINUS = new RegExp(
  String.raw`^(${NUM})\s*(?:±|\+/-|\+-)\s*(${NUM})(.*)$`,
);
const RANGE = new RegExp(
  String.raw`^(${NUM})\s*(?:-|~|to)\s*(${NUM})(.*)$`,
  'i',
);
const SINGLE = new RegExp(String.raw`^(${NUM})(.*)$`);
const RATIO = /^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/;

export interface ParsedNumber extends NumericValue {
  ok: boolean;
  rest: string | null; // trailing text, usually a unit typed into the value cell ("400 Å")
}

export function toNumber(token: string): number {
  const compact = token.replace(/\s+/g, '').replace(/x10\^?/i, 'e');
  return Number(compact);
}

export function emptyNumeric(raw: string | null = null): NumericValue {
  return {
    value: null,
    value_min: null,
    value_max: null,
    qualifier: 'eq',
    error: null,
    value_raw: raw,
  };
}

const round = (n: number) => Number(n.toPrecision(12));

/**
 * Parse a numeric cell into value / value_min / value_max / qualifier and
 * always keep value_raw. Handles "30 ± 5", "400-450", "<50", "≥99.5",
 * "1.24E+16", "4x10-6", "up to 500" and (optionally) "RT"
 */
export function parseNumeric(
  input: unknown,
  opts: { roomTemperature?: boolean; ratio?: boolean } = {},
): ParsedNumber {
  const raw = cleanText(input);
  const result: ParsedNumber = { ...emptyNumeric(raw), ok: true, rest: null };
  if (raw === null) return result;

  let s = raw;

  if (opts.roomTemperature && /^(rt|r\.t\.|room temp(erature)?)$/i.test(s)) {
    return { ...result, value: 25, qualifier: 'approx' };
  }

  if (opts.ratio) {
    const ratio = RATIO.exec(s);
    if (ratio) {
      return { ...result, value: round(Number(ratio[1]) / Number(ratio[2])) };
    }
  }

  for (const [pattern, qualifier] of QUALIFIERS) {
    if (pattern.test(s)) {
      result.qualifier = qualifier;
      s = s.replace(pattern, '').trim();
      break;
    }
  }

  const pm = PLUS_MINUS.exec(s);
  if (pm) {
    const value = toNumber(pm[1]);
    const error = Math.abs(toNumber(pm[2]));
    return {
      ...result,
      value,
      error,
      value_min: round(value - error),
      value_max: round(value + error),
      rest: cleanText(pm[3]),
    };
  }

  const range = RANGE.exec(s);
  if (range) {
    const a = toNumber(range[1]);
    const b = toNumber(range[2]);
    // "-10" or "1E-5" alone also matches the first half, so require two real numbers
    if (Number.isFinite(a) && Number.isFinite(b) && b > a) {
      return {
        ...result,
        value: round((a + b) / 2),
        value_min: a,
        value_max: b,
        rest: cleanText(range[3]),
      };
    }
  }

  const single = SINGLE.exec(s);
  if (single) {
    const value = toNumber(single[1]);
    if (Number.isFinite(value)) {
      return { ...result, value, rest: cleanText(single[2]) };
    }
  }

  return { ...result, ok: false };
}

export function toNumericValue(parsed: ParsedNumber): NumericValue {
  const { ok: _ok, rest: _rest, ...value } = parsed;
  return value;
}

export function scaleNumeric<T extends NumericValue>(
  v: T,
  factor: number,
  offset = 0,
): T {
  const f = (n: number | null) =>
    n === null ? null : round(n * factor + offset);
  return {
    ...v,
    value: f(v.value),
    value_min: f(v.value_min),
    value_max: f(v.value_max),
    error: v.error === null ? null : round(v.error * Math.abs(factor)),
  };
}
