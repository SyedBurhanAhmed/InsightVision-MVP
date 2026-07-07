import { Outlet, Link, useLocation } from 'react-router';
import {
  Video,
  Target,
  BarChart3,
  Gauge,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Info,
  ShieldCheck
} from 'lucide-react';

const navItems = [
  { path: '/', icon: BarChart3, label: 'Dashboard', color: 'text-[#22D3C8]' },
  { path: '/live-tracking', icon: Video, label: 'Live Tracking', color: 'text-[#22D3C8]' },
  { path: '/analyze-image', icon: Target, label: 'Analyze Image', color: 'text-[#22D3C8]' },
  { path: '/comparative-analysis', icon: BarChart3, label: 'Comparison', color: 'text-[#9D4EDD]' },
  { path: '/performance', icon: Gauge, label: 'Performance', color: 'text-[#FFD60A]' },
  { path: '/history', icon: HistoryIcon, label: 'History', color: 'text-[#06D6A0]' },
  { path: '/settings', icon: SettingsIcon, label: 'Settings', color: 'text-gray-400' },
  { path: '/about', icon: Info, label: 'About', color: 'text-[#FFB3C6]' },
];

export default function Root() {
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-[rgba(34,211,200,0.25)] bg-black/40 backdrop-blur-xl flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-[rgba(34,211,200,0.25)]">
          <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">
            <span className="text-[#22D3C8]">Insight</span>Vision
          </h1>
          <p className="text-xs text-gray-400 mb-3">Vision-Language Empowered Detection</p>
          <div className="inline-flex px-2 py-1 text-[10px] font-bold tracking-wider uppercase border border-[#22D3C8]/50 text-[#22D3C8] bg-[#22D3C8]/10 rounded shadow-[0_0_8px_rgba(34,211,200,0.3)]">
            Architecture Preview v1.0 (Phase 2)
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all group ${isActive
                    ? 'bg-[rgba(34,211,200,0.15)] border border-[#22D3C8] glow-cyan'
                    : 'hover:bg-[rgba(255,255,255,0.05)]'
                  }`}
              >
                <Icon
                  className={`w-5 h-5 ${isActive ? item.color : 'text-gray-400 group-hover:' + item.color}`}
                  strokeWidth={2}
                />
                <span className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-300'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[rgba(34,211,200,0.25)]">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5 mb-2 bg-[#22D3C8]/10 border border-[#22D3C8]/30 px-2 py-1 rounded text-[#22D3C8]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Academic License Verified</span>
            </div>
            <div className="text-xs text-gray-500 text-center">
              <p>Research Project</p>
              <p className="text-[#22D3C8] mt-1">FYP 2026</p>
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
