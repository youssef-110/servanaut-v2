import { Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import Dashboard from '@/pages/Dashboard';
import NewsFeedPage from '@/pages/NewsFeedPage';
import CompetitorsPage from '@/pages/CompetitorsPage';
import MarketPage from '@/pages/MarketPage';
import ResearchPage from '@/pages/ResearchPage';
import WatchlistPage from '@/pages/WatchlistPage';
import AlertsPage from '@/pages/AlertsPage';
import SettingsPage from '@/pages/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/news" element={<NewsFeedPage />} />
        <Route path="/competitors" element={<CompetitorsPage />} />
        <Route path="/market" element={<MarketPage />} />
        <Route path="/research" element={<ResearchPage />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
