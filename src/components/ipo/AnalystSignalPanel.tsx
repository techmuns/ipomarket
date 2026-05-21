import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Snapshots } from '@/lib/loadSnapshots';
import { subscriptionQualityScore } from '@/lib/derive';
import { Sparkles, TrendingUp, Coins, ShieldAlert } from 'lucide-react';

interface Props {
  ipoId: string;
}

export function AnalystSignalPanel({ ipoId }: Props) {
  const sub = Snapshots.subscriptions.by_ipo[ipoId];
  const fin = Snapshots.financials.by_ipo[ipoId];
  const quality = subscriptionQualityScore(sub);

  const signals: Array<{ label: string; value: string; tone: 'live' | 'manual'; icon: typeof Sparkles; hint: string }> = [
    {
      label: 'Subscription Quality',
      value: quality != null ? `${quality}/100` : '—',
      tone: quality != null ? 'live' : 'manual',
      icon: TrendingUp,
      hint: 'QIB depth · NII demand · Retail spread',
    },
    {
      label: 'Anchor concentration (top-3)',
      value: '—',
      tone: 'manual',
      icon: ShieldAlert,
      hint: 'Anchor PDF parsing arrives in Phase 5 (P-18)',
    },
    {
      label: 'Listing-gain-fade score',
      value: '—',
      tone: 'manual',
      icon: Sparkles,
      hint: 'Post-listing only — Phase 5/6 deliverable',
    },
    {
      label: 'Valuation vs peers',
      value: fin?.derived.pe_at_upper_band ? `${fin.derived.pe_at_upper_band.toFixed(1)}× P/E` : '—',
      tone: fin?.derived.pe_at_upper_band ? 'manual' : 'manual',
      icon: Coins,
      hint: 'Sector-peer scatter — Phase 5 (curated peers DB)',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-400" />
          Analyst signals
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {signals.map((s) => (
            <div
              key={s.label}
              className={`flex items-start gap-3 rounded-lg border p-3 ${
                s.tone === 'live' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-violet-500/20 bg-violet-500/5'
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${
                  s.tone === 'live'
                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                    : 'border-violet-500/40 bg-violet-500/15 text-violet-300'
                }`}
              >
                <s.icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <div className="text-xs text-slate-400">{s.label}</div>
                <div className={`num mt-0.5 text-lg font-semibold ${s.tone === 'live' ? 'text-emerald-200' : 'text-slate-300'}`}>{s.value}</div>
                <div className="mt-1 text-[10px] text-slate-500">{s.hint}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
