import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { StateBadge } from '@/components/chrome/StateBadge';
import { Snapshots } from '@/lib/loadSnapshots';

export function SectorHeatmap() {
  // Aggregate ipo count + total issue size by macro × sector from the master list.
  const sectorBuckets = new Map<string, { count: number; size: number }>();
  for (const ipo of Snapshots.master.ipos) {
    if (!ipo.sector) continue;
    const key = ipo.sector.macro + ' / ' + ipo.sector.sector;
    const b = sectorBuckets.get(key) ?? { count: 0, size: 0 };
    b.count += 1;
    b.size += ipo.issue_size_cr ?? 0;
    sectorBuckets.set(key, b);
  }
  const sectors = Array.from(sectorBuckets.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 12);

  const data = sectors.map(([k, v]) => ({ name: k, value: v.count, size: v.size }));

  const option: EChartsOption = {
    tooltip: {
      backgroundColor: 'rgba(15,23,42,0.95)',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0' },
      formatter: (params: any) => {
        return `<div style="font-size:12px"><b>${params.name}</b><br/>IPOs: ${params.value}<br/>Total ₹: ${params.data.size}Cr</div>`;
      },
    },
    series: [
      {
        type: 'treemap',
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        label: {
          show: true,
          formatter: '{b}',
          fontSize: 11,
          color: '#f1f5f9',
        },
        upperLabel: { show: false },
        itemStyle: {
          borderColor: '#0f172a',
          borderWidth: 2,
          gapWidth: 2,
        },
        levels: [
          {
            itemStyle: {
              borderColor: '#0f172a',
              borderWidth: 2,
              gapWidth: 2,
            },
          },
        ],
        data,
      },
    ],
    color: ['#6366f1', '#a78bfa', '#34d399', '#fbbf24', '#fb7185', '#22d3ee', '#818cf8'],
  };

  return (
    <Card>
      <CardHeader className="flex items-start justify-between">
        <div>
          <CardTitle>Sector mix · pipeline + open</CardTitle>
          <CardDescription>Treemap of sectors active in current snapshot</CardDescription>
        </div>
        <StateBadge state="manual" />
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
        </div>
      </CardContent>
    </Card>
  );
}
