import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Snapshots } from '@/lib/loadSnapshots';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatCr, formatTimes } from '@/lib/format';
import { totalSubscriptionTimes } from '@/lib/derive';
import { CompletenessChip } from '@/components/ipo/CompletenessChip';
import { Search, ChevronUp, ChevronDown } from 'lucide-react';
import type { Ipo } from '@/types/ipo';

type SortKey = 'name' | 'open_date' | 'issue_size_cr' | 'subscription';

export function Screener() {
  const [q, setQ] = useState('');
  const [segment, setSegment] = useState<'all' | 'mainboard' | 'sme'>('all');
  const [status, setStatus] = useState<'all' | Ipo['status']>('all');
  const [sortKey, setSortKey] = useState<SortKey>('open_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const rows = useMemo(() => {
    const all = Snapshots.master.ipos.filter((i) => {
      if (segment !== 'all' && i.segment !== segment) return false;
      if (status !== 'all' && i.status !== status) return false;
      if (q && !i.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
    const sorted = [...all].sort((a, b) => {
      let av: number | string = '';
      let bv: number | string = '';
      switch (sortKey) {
        case 'name': av = a.name; bv = b.name; break;
        case 'open_date': av = a.open_date ?? ''; bv = b.open_date ?? ''; break;
        case 'issue_size_cr': av = a.issue_size_cr ?? 0; bv = b.issue_size_cr ?? 0; break;
        case 'subscription':
          av = totalSubscriptionTimes(Snapshots.subscriptions.by_ipo[a.id]) ?? 0;
          bv = totalSubscriptionTimes(Snapshots.subscriptions.by_ipo[b.id]) ?? 0;
          break;
      }
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return sorted;
  }, [q, segment, status, sortKey, sortDir]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('desc'); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">IPO Screener</h1>
        <p className="mt-1 text-sm text-slate-400">Filter and sort across every IPO in the current snapshot. Client-side, no backend.</p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              type="search"
              placeholder="Search IPO name…"
              className="w-full rounded-md border border-slate-800 bg-slate-900/60 py-1.5 pl-8 pr-3 text-sm text-slate-200 placeholder:text-slate-600 focus:border-slate-700 focus:outline-none"
            />
          </div>
          <Pills label="Segment" value={segment} onChange={(v) => setSegment(v as any)} options={['all', 'mainboard', 'sme']} />
          <Pills label="Status" value={status} onChange={(v) => setStatus(v as any)} options={['all', 'upcoming', 'open', 'closed', 'listed']} />
          <div className="ml-auto text-xs text-slate-500">{rows.length} result{rows.length === 1 ? '' : 's'}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
          <CardDescription>Click any name to open the IPO detail page.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-slate-500">
                <tr className="border-b border-slate-800/60">
                  <Th label="Company" k="name" {...{ sortKey, sortDir, toggleSort }} />
                  <th className="px-3 py-2 text-left font-medium">Segment</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-left font-medium">Sector</th>
                  <Th label="Open" k="open_date" align="left" {...{ sortKey, sortDir, toggleSort }} />
                  <Th label="Issue size" k="issue_size_cr" align="right" {...{ sortKey, sortDir, toggleSort }} />
                  <Th label="Subscribed" k="subscription" align="right" {...{ sortKey, sortDir, toggleSort }} />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {rows.map((ipo) => {
                  const sub = totalSubscriptionTimes(Snapshots.subscriptions.by_ipo[ipo.id]);
                  return (
                    <tr key={ipo.id} className="hover:bg-slate-900/40">
                      <td className="px-3 py-2 text-slate-200">
                        <Link to={`/ipo/${ipo.slug}`} className="hover:underline">{ipo.short_name ?? ipo.name}</Link>
                        <div className="mt-1">
                          <CompletenessChip ipo={ipo} audit={Snapshots.sourceAudit.by_ipo[ipo.id]} />
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Badge tone={ipo.segment === 'mainboard' ? 'info' : 'accent'}>{ipo.segment}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Badge tone={ipo.status === 'open' ? 'live' : ipo.status === 'upcoming' ? 'awaiting' : ipo.status === 'closed' ? 'info' : 'manual'}>{ipo.status}</Badge>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-400">{ipo.sector?.industry ?? '—'}</td>
                      <td className="px-3 py-2 num text-slate-300">{ipo.open_date ? formatDate(ipo.open_date) : '—'}</td>
                      <td className="px-3 py-2 num text-right text-slate-200">{formatCr(ipo.issue_size_cr)}</td>
                      <td className="px-3 py-2 num text-right text-slate-200">{sub != null ? formatTimes(sub) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Pills({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
      <div className="flex items-center gap-1 rounded-md border border-slate-800 bg-slate-900/40 p-0.5">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={`rounded-sm px-2 py-0.5 text-[11px] capitalize ${value === o ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function Th({ label, k, align = 'left', sortKey, sortDir, toggleSort }: { label: string; k: SortKey; align?: 'left' | 'right'; sortKey: SortKey; sortDir: 'asc' | 'desc'; toggleSort: (k: SortKey) => void }) {
  const active = sortKey === k;
  return (
    <th className={`px-3 py-2 ${align === 'right' ? 'text-right' : 'text-left'} font-medium`}>
      <button onClick={() => toggleSort(k)} className={`inline-flex items-center gap-1 ${active ? 'text-slate-200' : ''}`}>
        {label}
        {active && (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </button>
    </th>
  );
}
