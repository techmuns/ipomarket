import { Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Snapshots } from '@/lib/loadSnapshots';

export function TopBar() {
  const t = Snapshots.sourceHealth.totals;
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b border-slate-800/60 bg-slate-950/80 px-5 backdrop-blur">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span className="hidden md:inline">Phase 1 · Mock Dashboard Shell</span>
        <span className="hidden md:inline-block h-1 w-1 rounded-full bg-slate-700" />
        <span className="text-xs text-slate-600">data state per module — see badges</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-2.5 top-1.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="search"
            placeholder="Search IPO… (mock, client-side)"
            className="w-72 rounded-md border border-slate-800 bg-slate-900/60 py-1.5 pl-8 pr-3 text-xs text-slate-300 placeholder:text-slate-600 focus:border-slate-700 focus:outline-none"
          />
        </div>
        <Link
          to="/source-health"
          className="inline-flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900/50 px-3 py-1.5 text-xs hover:border-slate-700"
        >
          <span className="font-medium text-slate-300">Source Health</span>
          <span className="flex items-center gap-1.5 text-[11px] tabular">
            <span className="inline-flex items-center gap-1 text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {t.green}
            </span>
            <span className="inline-flex items-center gap-1 text-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              {t.yellow}
            </span>
            <span className="inline-flex items-center gap-1 text-rose-300">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              {t.red}
            </span>
          </span>
        </Link>
      </div>
    </header>
  );
}
