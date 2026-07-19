import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function Layout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Ambient glow behind everything */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(600px 400px at 15% -10%, rgba(99,102,241,0.10), transparent 60%), radial-gradient(500px 350px at 90% 5%, rgba(139,92,246,0.07), transparent 60%)',
        }}
      />
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 px-5 py-6 pb-24 md:px-8 md:pb-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
