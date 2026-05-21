// Source-audit log writer. Appends a `{field, source, url}` entry to an IPO's
// audit `fields[]`, idempotent on the triple key. Refreshes `fetched_at_utc`
// + `state` when an existing entry matches.

export interface AuditEntry {
  field: string;
  source: string;
  state: string;
  url: string | null;
  fetched_at_utc: string | null;
}

export interface AuditAppendResult {
  added: boolean;
  refreshed: boolean;
}

export function appendAuditEntry(fields: AuditEntry[], entry: AuditEntry): AuditAppendResult {
  const idx = fields.findIndex(
    (f) => f.field === entry.field && f.source === entry.source && f.url === entry.url
  );
  if (idx === -1) {
    fields.push(entry);
    return { added: true, refreshed: false };
  }
  const prior = fields[idx]!;
  const next = { ...prior, ...entry };
  const changed = JSON.stringify(prior) !== JSON.stringify(next);
  fields[idx] = next;
  return { added: false, refreshed: changed };
}
