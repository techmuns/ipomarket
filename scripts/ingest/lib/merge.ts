// Generic merge-by-stable-key for ingest snapshots.
//
// Semantics:
// - rows present only in `incoming` → added (count: stats.added)
// - rows present in both → combineFn produces the merged row; if the result
//   differs from the prior row by deep JSON equality, counted as stats.updated
// - rows present only in `existing` → preserved as-is (count: stats.preserved)
//   This is the safe-merge guarantee: a source returning a subset never wipes
//   the rest of the snapshot.

export interface MergeStats {
  added: number;
  updated: number;
  preserved: number;
}

export interface MergeResult<T> {
  merged: T[];
  stats: MergeStats;
}

export function mergeByKey<T>(
  existing: T[],
  incoming: T[],
  keyFn: (item: T) => string,
  combineFn: (prior: T, fresh: T) => T
): MergeResult<T> {
  const byKey = new Map<string, T>();
  for (const e of existing) byKey.set(keyFn(e), e);

  let added = 0;
  let updated = 0;
  const seenIncoming = new Set<string>();

  for (const i of incoming) {
    const key = keyFn(i);
    seenIncoming.add(key);
    const prior = byKey.get(key);
    if (!prior) {
      byKey.set(key, i);
      added++;
    } else {
      const combined = combineFn(prior, i);
      if (JSON.stringify(combined) !== JSON.stringify(prior)) {
        updated++;
      }
      byKey.set(key, combined);
    }
  }

  const preserved = existing.filter((e) => !seenIncoming.has(keyFn(e))).length;
  return {
    merged: Array.from(byKey.values()),
    stats: { added, updated, preserved },
  };
}
