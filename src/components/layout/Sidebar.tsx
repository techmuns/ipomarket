import { NavLink } from 'react-router-dom';
import {
  Activity, CalendarClock, Clock3, TrendingUp, ListFilter, Layers, BookOpen, Archive, Sparkles, Gauge,
} from 'lucide-react';
import { cn } from '@/lib/cn';

const NAV = [
  { to: '/', label: 'Market Pulse', icon: Activity, end: true },
  { to: '/open', label: 'Open & Upcoming', icon: CalendarClock },
  { to: '/listing-soon', label: 'Listing Soon', icon: Clock3 },
  { to: '/recently-listed', label: 'Recently Listed', icon: TrendingUp },
  { to: '/screener', label: 'IPO Screener', icon: ListFilter },
  { to: '/subscription', label: 'Subscription Heatmap', icon: Layers },
  { to: '/pipeline', label: 'DRHP Pipeline', icon: BookOpen },
  { to: '/gmp', label: 'GMP Monitor', icon: Sparkles },
  { to: '/source-health', label: 'Source Health', icon: Gauge },
] as const;

export function Sidebar() {
  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-slate-800/60 bg-slate-950/80 backdrop-blur-sm">
      <div className="flex h-14 items-center gap-2 border-b border-slate-800/60 px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-xs font-bold">
          IPO
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-slate-100">India IPO</div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Buy-side dashboard</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-0.5">
          {NAV.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={'end' in item ? item.end : false}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-slate-800/80 text-slate-100 shadow-card'
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t border-slate-800/60 p-3">
        <a
          className="block rounded-md border border-dashed border-slate-800 px-3 py-2 text-[11px] leading-tight text-slate-400 hover:border-slate-700 hover:text-slate-200"
          href="https://www.sebi.gov.in"
          rel="noreferrer"
          target="_blank"
        >
          <Archive className="inline h-3 w-3 mr-1 text-slate-500" />
          Production data is sourced from NSE / BSE / SEBI / RHP and committed registrar links only.
        </a>
      </div>
    </aside>
  );
}
