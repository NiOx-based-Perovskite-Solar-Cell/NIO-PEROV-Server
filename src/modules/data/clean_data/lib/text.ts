const NULL_TOKENS = /^(nan|none|null|n\/a|na|-|—)$/i;

/**
 * Rules shared by every sheet: Unicode NFKC, unify dashes / minus to "-",
 * "×" to "x", collapse whitespace and treat empty-like tokens as NULL
 */
export function cleanText(input: unknown): string | null {
  if (input === null || input === undefined) return null;
  const s = String(input)
    .normalize('NFKC')
    .replace(/[‐-―−﹣－]/g, '-')
    .replace(/×/g, 'x')
    .replace(/[  -​　﻿]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (s === '' || NULL_TOKENS.test(s)) return null;
  return s;
}

// Case-insensitive key with whitespace collapsed
export function textKey(input: unknown): string {
  return (cleanText(input) ?? '').toLowerCase();
}

// Only letters and digits, used for names typed many ways ("Thermal Evaporation" / "ThermalEvaporation")
export function compactKey(input: unknown): string {
  return textKey(input).replace(/[^\p{L}\p{N}]/gu, '');
}

/**
 * Split on separators that are not inside brackets, so formulas like
 * "Pb(I0.85Br0.15)3" or "Ni(NO3)2" are never cut apart
 */
export function splitTopLevel(input: string, separator: RegExp): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  let i = 0;
  const sticky = new RegExp(
    separator.source,
    `y${separator.flags.replace(/[gy]/g, '')}`,
  );

  while (i < input.length) {
    const ch = input[i];
    if (ch === '(' || ch === '[') depth++;
    if ((ch === ')' || ch === ']') && depth > 0) depth--;

    if (depth === 0) {
      sticky.lastIndex = i;
      const match = sticky.exec(input);
      if (match && match[0].length > 0) {
        parts.push(current);
        current = '';
        i += match[0].length;
        continue;
      }
    }
    current += ch;
    i++;
  }
  parts.push(current);
  return parts.map((p) => p.trim()).filter((p) => p !== '');
}

/**
 * Peel one trailing "(...)" group that follows a space, respecting nested
 * brackets: "Nickel nitrate (Ni(NO3)2·6H2O)" -> ["Nickel nitrate", "Ni(NO3)2·6H2O"].
 * A group glued to the name ("Zr(acac)4", "Pb(I0.8Br0.2)3") is left alone
 */
export function splitTrailingParen(
  input: string,
): { head: string; inner: string } | null {
  const s = input.trim();
  // Broken input like "SnOx (" - drop the dangling bracket
  if (/\s\($/.test(s)) return { head: s.slice(0, -1).trim(), inner: '' };
  if (!s.endsWith(')')) return null;

  let depth = 0;
  for (let i = s.length - 1; i >= 0; i--) {
    if (s[i] === ')') depth++;
    if (s[i] === '(') depth--;
    if (depth === 0) {
      const head = s.slice(0, i);
      const inner = s.slice(i + 1, -1).trim();
      if (i > 0 && /\s$/.test(head)) return { head: head.trim(), inner };
      // "...I(with MACl 0.3M additive)" - glued, but clearly prose
      if (/^with\s/i.test(inner)) return { head: head.trim(), inner };
      return null;
    }
  }
  return null;
}
