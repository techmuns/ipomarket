import type { Ipo } from '@/types/ipo';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { SourceAuditChip } from '@/components/chrome/SourceAuditChip';
import { formatCr, formatPriceBand, formatRupee } from '@/lib/format';
import { minInvestment } from '@/lib/derive';

export function IssueTermsGrid({ ipo }: { ipo: Ipo }) {
  const rows: Array<{ label: string; value: string; mono?: boolean }> = [
    { label: 'Price band', value: formatPriceBand(ipo.price_band?.low ?? null, ipo.price_band?.high ?? null), mono: true },
    { label: 'Lot size', value: ipo.lot_size != null ? `${ipo.lot_size} shares` : '—', mono: true },
    { label: 'Min investment', value: formatRupee(minInvestment(ipo)), mono: true },
    { label: 'Issue size', value: formatCr(ipo.issue_size_cr), mono: true },
    { label: 'Fresh issue', value: formatCr(ipo.fresh_cr), mono: true },
    { label: 'Offer for Sale', value: formatCr(ipo.ofs_cr), mono: true },
    { label: 'Face value', value: ipo.face_value != null ? `₹${ipo.face_value}` : '—', mono: true },
    { label: 'Listing exchange', value: ipo.listing_exchange.join(' + ') || '—' },
  ];

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Issue terms</CardTitle>
        <SourceAuditChip
          source={ipo.segment === 'sme' ? 'BSE' : 'NSE'}
          fetchedAt={'2026-05-20T11:30:00Z'}
          state={ipo.state}
          url={null}
        />
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
          {rows.map((r) => (
            <div key={r.label}>
              <dt className="label-muted">{r.label}</dt>
              <dd className={`mt-0.5 text-sm font-medium text-slate-100 ${r.mono ? 'num' : ''}`}>{r.value}</dd>
            </div>
          ))}
        </dl>
        {ipo.reservation && (
          <div className="mt-5 border-t border-slate-800/60 pt-4">
            <div className="label-muted mb-2">Reservation</div>
            <div className="flex h-2 overflow-hidden rounded-full">
              <div className="bg-indigo-500" style={{ width: `${ipo.reservation.qib_pct}%` }} />
              <div className="bg-violet-500" style={{ width: `${ipo.reservation.nii_pct}%` }} />
              <div className="bg-emerald-500" style={{ width: `${ipo.reservation.retail_pct}%` }} />
              {ipo.reservation.emp_pct > 0 && (
                <div className="bg-amber-500" style={{ width: `${ipo.reservation.emp_pct}%` }} />
              )}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-slate-400 md:grid-cols-4">
              <Legend dot="bg-indigo-500" label={`QIB ${ipo.reservation.qib_pct}%`} />
              <Legend dot="bg-violet-500" label={`NII ${ipo.reservation.nii_pct}%`} />
              <Legend dot="bg-emerald-500" label={`Retail ${ipo.reservation.retail_pct}%`} />
              {ipo.reservation.emp_pct > 0 && <Legend dot="bg-amber-500" label={`Employee ${ipo.reservation.emp_pct}%`} />}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      <span>{label}</span>
    </div>
  );
}
