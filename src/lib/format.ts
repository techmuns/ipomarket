import { formatDistanceToNowStrict, parseISO, format } from 'date-fns';

export function formatCr(amount: number | null | undefined, opts: { unit?: boolean } = { unit: true }): string {
  if (amount == null) return '—';
  const v = amount.toFixed(amount >= 100 ? 0 : 2);
  return opts.unit !== false ? `₹${v}Cr` : v;
}

export function formatRupee(amount: number | null | undefined): string {
  if (amount == null) return '—';
  if (amount >= 1_00_000) {
    const lakh = amount / 1_00_000;
    return `₹${lakh.toFixed(lakh >= 10 ? 1 : 2)}L`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatPriceBand(low: number | null, high: number | null): string {
  if (low == null || high == null) return '—';
  return `₹${low} – ₹${high}`;
}

export function formatPct(v: number | null | undefined, opts: { sign?: boolean } = {}): string {
  if (v == null) return '—';
  const sign = opts.sign && v > 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}%`;
}

export function formatTimes(t: number | null | undefined): string {
  if (t == null) return '—';
  return `${t.toFixed(2)}×`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), 'd MMM yyyy');
  } catch {
    return iso;
  }
}

export function formatDateRange(open: string | null, close: string | null): string {
  if (!open || !close) return '—';
  try {
    const o = parseISO(open);
    const c = parseISO(close);
    if (o.getFullYear() === c.getFullYear() && o.getMonth() === c.getMonth()) {
      return `${format(o, 'd')}–${format(c, 'd MMM yyyy')}`;
    }
    return `${format(o, 'd MMM')} – ${format(c, 'd MMM yyyy')}`;
  } catch {
    return `${open} – ${close}`;
  }
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return `${formatDistanceToNowStrict(parseISO(iso))} ago`;
  } catch {
    return iso;
  }
}

export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  try {
    const target = parseISO(iso);
    const now = new Date();
    const ms = target.getTime() - now.getTime();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}
