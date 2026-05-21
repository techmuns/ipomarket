import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { StateBadge } from '@/components/chrome/StateBadge';
import { Snapshots } from '@/lib/loadSnapshots';

export function FadeScatter() {
  const points = Snapshots.master.ipos
    .filter((ipo) => Snapshots.listingPerformance.by_ipo[ipo.id])
    .map((ipo) => {
      const p = Snapshots.listingPerformance.by_ipo[ipo.id]!;
      return {
        name: ipo.short_name ?? ipo.name,
        value: [p.listing_gain_pct ?? 0, p.current_gain_pct ?? 0],
        ipo,
      };
    });

  const option: EChartsOption = {
    tooltip: {
      backgroundColor: 'rgba(15,23,42,0.95)',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0' },
      formatter: (params: any) =>
        `<div style="font-size:12px"><b>${params.data.name}</b><br/>Listing gain: ${params.data.value[0].toFixed(1)}%<br/>Current gain: ${params.data.value[1].toFixed(1)}%</div>`,
    },
    grid: { left: 50, right: 16, top: 16, bottom: 36 },
    xAxis: {
      name: 'Listing gain (%)',
      nameTextStyle: { color: '#64748b' },
      axisLine: { lineStyle: { color: '#334155' } },
      splitLine: { lineStyle: { color: 'rgba(148,163,184,0.08)' } },
      axisLabel: { color: '#64748b', formatter: '{value}%' },
    },
    yAxis: {
      name: 'Current gain (%)',
      nameTextStyle: { color: '#64748b' },
      axisLine: { lineStyle: { color: '#334155' } },
      splitLine: { lineStyle: { color: 'rgba(148,163,184,0.08)' } },
      axisLabel: { color: '#64748b', formatter: '{value}%' },
    },
    series: [
      {
        type: 'scatter',
        symbolSize: 18,
        data: points,
        itemStyle: {
          color: '#818cf8',
          borderColor: '#c7d2fe',
          borderWidth: 1,
        },
        label: {
          show: true,
          position: 'top',
          formatter: (p: any) => p.data.name,
          color: '#94a3b8',
          fontSize: 10,
        },
        markLine: {
          symbol: 'none',
          silent: true,
          lineStyle: { color: '#475569', type: 'dashed' },
          // y = x reference line — a single line defined as [start, end].
          // ECharts wants `data` to be an array of *lines*, where each line is
          // a 2-tuple of points. The prior single-array form threw
          // "Cannot read properties of undefined (reading 'coord')".
          data: [
            [
              { name: 'y = x', coord: [-100, -100] },
              { coord: [400, 400] },
            ],
          ] as any,
          label: {
            show: true,
            position: 'end',
            formatter: 'y = x',
            color: '#64748b',
            fontSize: 10,
          },
        },
      },
    ],
  };

  return (
    <Card>
      <CardHeader className="flex items-start justify-between">
        <div>
          <CardTitle>Listing-gain fade scatter</CardTitle>
          <CardDescription>Below diagonal = the listing pop faded; above = still gaining (our differentiator)</CardDescription>
        </div>
        <StateBadge state="manual" />
      </CardHeader>
      <CardContent>
        {points.length === 0 ? (
          <p className="text-sm text-slate-500">No listing performance in current snapshot.</p>
        ) : (
          <div className="h-64">
            <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
