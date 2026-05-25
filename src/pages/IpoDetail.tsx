import { Link, useParams } from 'react-router-dom';
import type { IpoNarrative, IpoFinancials } from '@/types/ipo';
import { Snapshots, findIpoBySlug } from '@/lib/loadSnapshots';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HeroHeader } from '@/components/ipo/HeroHeader';
import { PriorityReadCard } from '@/components/ipo/PriorityReadCard';
import { IssueTermsGrid } from '@/components/ipo/IssueTermsGrid';
import { TimelineRail } from '@/components/ipo/TimelineRail';
import { SubscriptionBlock } from '@/components/ipo/SubscriptionBlock';
import { FinancialsChart } from '@/components/ipo/FinancialsChart';
import { StrengthsCard, RisksCard, ObjectivesCard } from '@/components/ipo/StrengthsRisksObjectives';
import { DocumentsList } from '@/components/ipo/DocumentsList';
import { RegistrarBrlmCard } from '@/components/ipo/RegistrarBrlmCard';
import { SourceAuditPanel } from '@/components/ipo/SourceAuditPanel';
import { AnalystSignalPanel } from '@/components/ipo/AnalystSignalPanel';
import { Badge } from '@/components/ui/badge';
import { StateBadge } from '@/components/chrome/StateBadge';

export function IpoDetail() {
  const { slug } = useParams();
  const ipo = slug ? findIpoBySlug(slug) : undefined;

  if (!ipo) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">IPO not found</h1>
        <p className="text-sm text-slate-400">
          We don't have a record for slug “{slug}”. Try the{' '}
          <Link to="/screener" className="text-indigo-300 hover:underline">screener</Link> or{' '}
          <Link to="/open" className="text-indigo-300 hover:underline">open list</Link>.
        </p>
      </div>
    );
  }

  const tl = Snapshots.master.timelines.find((t) => t.ipo_id === ipo.id);
  const sub = Snapshots.subscriptions.by_ipo[ipo.id];
  const fin = Snapshots.financials.by_ipo[ipo.id];
  const nar = Snapshots.narrative.by_ipo[ipo.id];
  const docs = Snapshots.documents.by_ipo[ipo.id];
  const audit = Snapshots.sourceAudit.by_ipo[ipo.id];

  return (
    <div className="space-y-6">
      <HeroHeader ipo={ipo} />
      <PriorityReadCard ipo={ipo} sub={sub} timeline={tl} audit={audit} />

      <Tabs defaultValue="about">
        <TabsList>
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="about">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <IssueTermsGrid ipo={ipo} audit={audit} />
              {tl ? <TimelineRail tl={tl} /> : null}
              <CompanyOverviewCard nar={nar} />
            </div>
            <div className="space-y-4">
              <SourceAuditPanel audit={audit} />
              {docs && <RegistrarBrlmCard docs={docs} />}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analysis">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <FinancialsChart fin={fin} />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <StrengthsCard n={nar} />
                <RisksCard n={nar} />
              </div>
              <ObjectivesCard n={nar} />
              <PromoterCard nar={nar} />
            </div>
            <div className="space-y-4">
              <AnalystSignalPanel ipoId={ipo.id} />
              <QualityRiskChecklist nar={nar} fin={fin} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="subscription">
          <SubscriptionBlock sub={sub} />
        </TabsContent>

        <TabsContent value="documents">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <DocumentsList docs={docs} />
            </div>
            <div>
              {docs && <RegistrarBrlmCard docs={docs} />}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CompanyOverviewCard({ nar }: { nar: IpoNarrative | undefined }) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>About the company</CardTitle>
        <StateBadge state={nar?.state ?? 'manual'} />
      </CardHeader>
      <CardContent>
        {nar?.company_overview ? (
          <p className="text-sm leading-relaxed text-slate-300">{nar.company_overview}</p>
        ) : (
          <p className="text-sm text-slate-500">
            Company overview is a manual seed at v1. RHP narrative parser arrives in Phase 5.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function PromoterCard({ nar }: { nar: IpoNarrative | undefined }) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Promoter & shareholding</CardTitle>
        <StateBadge state="manual" />
      </CardHeader>
      <CardContent>
        {!nar || (!nar.promoters && nar.promoter_holding_pre_pct == null) ? (
          <p className="text-sm text-slate-500">Promoter & shareholding seed is a v1.5 / Phase 5 deliverable.</p>
        ) : (
          <div className="space-y-4">
            {nar.promoters && nar.promoters.length > 0 && (
              <div>
                <div className="label-muted">Promoters</div>
                <div className="mt-1 text-sm text-slate-200">{nar.promoters.join(' · ')}</div>
              </div>
            )}
            {(nar.promoter_holding_pre_pct != null || nar.promoter_holding_post_pct != null) && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="label-muted">Pre-IPO holding</div>
                  <div className="num mt-1 text-base text-slate-100">{nar.promoter_holding_pre_pct ?? '—'}%</div>
                </div>
                <div>
                  <div className="label-muted">Post-IPO holding</div>
                  <div className="num mt-1 text-base text-slate-100">{nar.promoter_holding_post_pct ?? '—'}%</div>
                </div>
              </div>
            )}
            {nar.shares_pledged_pct != null && (
              <div>
                <div className="label-muted">Shares pledged</div>
                <div className="num mt-1 text-sm text-slate-200">{nar.shares_pledged_pct}%</div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QualityRiskChecklist({ nar, fin }: { nar: IpoNarrative | undefined; fin: IpoFinancials | undefined }) {
  const items: Array<{ category: 'Quality' | 'Risk'; label: string; pass: boolean | null; hint: string }> = [
    { category: 'Quality', label: 'Revenue growth', pass: (fin?.derived.revenue_3y_cagr_pct ?? 0) > 15, hint: '3Y revenue CAGR > 15%' },
    { category: 'Quality', label: 'PAT expansion', pass: (fin?.derived.pat_3y_cagr_pct ?? 0) > 15, hint: '3Y PAT CAGR > 15%' },
    { category: 'Quality', label: 'Reasonable P/E', pass: fin?.derived.pe_at_upper_band != null ? fin.derived.pe_at_upper_band < 50 : null, hint: 'P/E < 50× at upper band' },
    { category: 'Risk',    label: 'Low D/E ratio', pass: fin?.derived.d_to_e != null ? fin.derived.d_to_e < 1 : null, hint: 'Debt/Equity < 1×' },
    { category: 'Risk',    label: 'Promoter holding', pass: nar?.promoter_holding_post_pct != null ? nar.promoter_holding_post_pct > 30 : null, hint: 'Post-issue promoter > 30%' },
    { category: 'Risk',    label: 'No shares pledged', pass: nar?.shares_pledged_pct != null ? nar.shares_pledged_pct === 0 : null, hint: 'Pledged % = 0' },
  ];
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Quality / Risk checklist</CardTitle>
        <StateBadge state="manual" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-1.5">
          {items.map((it, i) => (
            <div key={i} className="flex items-center justify-between gap-2 rounded-md border border-slate-800/80 bg-slate-900/40 px-3 py-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge tone={it.category === 'Quality' ? 'live' : 'unavailable'}>{it.category}</Badge>
                  <span className="text-sm text-slate-200">{it.label}</span>
                </div>
                <div className="mt-0.5 text-[10px] text-slate-500">{it.hint}</div>
              </div>
              {it.pass == null ? (
                <span className="text-xs text-slate-500">—</span>
              ) : it.pass ? (
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">✓</span>
              ) : (
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/20 text-rose-300">✗</span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
