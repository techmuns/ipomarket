import { Outlet } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function AppShell() {
  return (
    <TooltipProvider delayDuration={120}>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="flex-1 px-5 py-6 lg:px-8">
            <Outlet />
          </main>
          <footer className="border-t border-slate-800/60 px-5 py-3 text-[11px] text-slate-600">
            Phase 1 mock dashboard. No live ingestion. Trendlyne / Zerodha / Upstox are reference-only.
          </footer>
        </div>
      </div>
    </TooltipProvider>
  );
}
