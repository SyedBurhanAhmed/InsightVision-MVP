import { Outlet, Link, useLocation } from 'react-router';
import {
  Target,
  BarChart3,
  Gauge,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Info,
  ShieldCheck,
  Video,
  Camera
} from 'lucide-react';

const navItems = [
  { path: '/', icon: BarChart3, label: 'Dashboard' },
  { path: '/live-tracking', icon: Video, label: 'Live Tracking' },
  { path: '#', icon: Camera, label: 'Multi-Camera', isDisabled: true },
  { path: '/analyze-image', icon: Target, label: 'Analyze Image' },
  { path: '/comparative-analysis', icon: BarChart3, label: 'Comparison' },
  { path: '/performance', icon: Gauge, label: 'Performance' },
  { path: '/history', icon: HistoryIcon, label: 'History' },
  { path: '/settings', icon: SettingsIcon, label: 'Settings' },
  { path: '/about', icon: Info, label: 'About' },
];

export default function Root() {
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-slate-800/80 bg-slate-950/20 backdrop-blur-xl flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-slate-800/80">
          <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">
            <span className="text-primary">Insight</span>Vision
          </h1>
          <p className="text-xs text-slate-400 mb-3">Vision-Language Empowered Detection</p>

        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = !item.isDisabled && location.pathname === item.path;

            if (item.isDisabled) {
              return (
                <div
                  key={item.label}
                  className="flex items-center justify-between px-4 py-3 rounded-lg mb-1 text-slate-500 opacity-45 cursor-not-allowed border border-transparent select-none"
                  title="Cross-Camera Appearance Embedding Matching - Deferred to Phase 2"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 shrink-0" strokeWidth={2} />
                    <span className="text-sm font-semibold">{item.label}</span>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-800 text-gray-400 px-1.5 py-0.5 rounded border border-gray-700">
                    Phase 2
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all group border border-transparent ${isActive
                  ? 'bg-primary/10 border-primary glow-cyan text-primary'
                  : 'hover:bg-slate-900/50 text-slate-400 hover:text-white'
                  }`}
              >
                <Icon
                  className="w-5 h-5 shrink-0"
                  strokeWidth={2}
                />
                <span className="text-sm font-semibold">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800/80">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5 mb-2 bg-primary/5 border border-primary/25 px-2 py-1 rounded text-primary">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Academic License Verified</span>
            </div>
            <div className="text-xs text-slate-500 text-center">
              <p>Research Project</p>
              <p className="text-primary mt-1">Capstone 2026</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
