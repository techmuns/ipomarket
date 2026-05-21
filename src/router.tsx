import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { MarketPulse } from './pages/MarketPulse';
import { OpenUpcoming } from './pages/OpenUpcoming';
import { ListingSoon } from './pages/ListingSoon';
import { RecentlyListed } from './pages/RecentlyListed';
import { Screener } from './pages/Screener';
import { SubscriptionHeatmap } from './pages/SubscriptionHeatmap';
import { Pipeline } from './pages/Pipeline';
import { GmpMonitor } from './pages/GmpMonitor';
import { SourceHealth } from './pages/SourceHealth';
import { IpoDetail } from './pages/IpoDetail';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <MarketPulse /> },
      { path: 'open', element: <OpenUpcoming /> },
      { path: 'listing-soon', element: <ListingSoon /> },
      { path: 'recently-listed', element: <RecentlyListed /> },
      { path: 'screener', element: <Screener /> },
      { path: 'subscription', element: <SubscriptionHeatmap /> },
      { path: 'pipeline', element: <Pipeline /> },
      { path: 'gmp', element: <GmpMonitor /> },
      { path: 'source-health', element: <SourceHealth /> },
      { path: 'ipo/:slug', element: <IpoDetail /> },
    ],
  },
]);
