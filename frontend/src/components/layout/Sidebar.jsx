import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Newspaper,
  Building2,
  TrendingUp,
  FlaskConical,
  Eye,
  Bell,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Satellite,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnreadCount } from '@/hooks/useAlerts';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/news', label: 'News Feed', icon: Newspaper },
  { to: '/competitors', label: 'Competitors', icon: Building2 },
  { to: '/market', label: 'Market', icon: TrendingUp },
  { to: '/research', label: 'Research', icon: FlaskConical },
  { to: '/watchlist', label: 'Watchlist', icon: Eye },
  { to: '/alerts', label: 'Alerts', icon: Bell, showBadge: true },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function UnreadBadge({ collapsed }) {
  const { data } = useUnreadCount();
  const count = data?.count || 0;
  if (!count) return null;
  return (
    <span
      className={cn(
        'flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 font-mono text-[10px] font-semibold text-white',
        collapsed && 'absolute -right-1 -top-1 h-4 min-w-4 px-1'
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

export function Sidebar({ collapsed, onToggle }) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-r border-edge bg-surface/60 backdrop-blur-xl transition-[width] duration-200 md:flex',
          collapsed ? 'w-[68px]' : 'w-60'
        )}
      >
        <div className={cn('flex items-center gap-2.5 px-4 py-5', collapsed && 'justify-center px-0')}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-violet shadow-[0_0_24px_rgba(99,102,241,0.4)]">
            <Satellite className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-[0.2em] text-ink">SERVANAUT</div>
              <div className="text-[10px] text-ink-muted">Founder Intelligence OS</div>
            </div>
          )}
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-2.5 py-2">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end, showBadge }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                cn(
                  'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors',
                  collapsed && 'justify-center px-0',
                  isActive
                    ? 'bg-accent-muted text-accent-hover'
                    : 'text-ink-secondary hover:bg-surface-2 hover:text-ink'
                )
              }
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span className="flex-1">{label}</span>}
              {showBadge && <UnreadBadge collapsed={collapsed} />}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={onToggle}
          className="mx-2.5 mb-4 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          {!collapsed && 'Collapse'}
        </button>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-edge bg-surface/90 py-1.5 backdrop-blur-xl md:hidden">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end, showBadge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            aria-label={label}
            className={({ isActive }) =>
              cn(
                'relative flex flex-col items-center gap-0.5 rounded-lg p-2',
                isActive ? 'text-accent-hover' : 'text-ink-muted'
              )
            }
          >
            <Icon className="h-5 w-5" />
            {showBadge && <UnreadBadge collapsed />}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
