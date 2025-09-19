export type PRMeta = { id: string; number: number; title: string; state: string; draft: boolean; reviewers: string[]; labels: string[]; checks: string[]; headRef: string; baseRef: string; author: string; updatedAt: string };

export function groupByPrefix<T extends { title: string; branch: string }>(items: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = derivePrefix(item.title || item.branch);
    const k = key || 'Other';
    const arr = groups.get(k) || [];
    arr.push(item);
    groups.set(k, arr);
  }
  return groups;
}

export function derivePrefix(text: string): string {
  const t = (text || '').toLowerCase();
  if (!t) return '';
  const stopAtSpace = t.split(' ')[0];
  const splitOn = stopAtSpace.split(/[:/]|-(?=[^\s]+)/)[0];
  const prefix = splitOn.slice(0, Math.max(3, splitOn.length));
  return prefix.length >= 3 ? splitOn : '';
}

