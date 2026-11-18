import { compactKey } from './text';

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[b.length];
}

export function similarity(a: string, b: string): number {
  const x = compactKey(a);
  const y = compactKey(b);
  const longest = Math.max(x.length, y.length);
  if (longest === 0) return 0;
  return 1 - levenshtein(x, y) / longest;
}

/**
 * Suggest the closest dictionary entry for an unmapped term (like rapidfuzz).
 * It is only a hint for the reviewer - nothing is auto-mapped from it
 */
export function suggest(
  query: string,
  candidates: Iterable<string>,
  threshold = 0.75,
): string | undefined {
  let best: string | undefined;
  let bestScore = threshold;
  for (const candidate of candidates) {
    const score = similarity(query, candidate);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}
