import { Outlet, Link, useLocation } from 'react-router';
import {
  Video,
  Target,
  TrendingUp,
  MessageSquare,
  Sparkles,
  BarChart3,
  Gauge,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Info,
  ShieldCheck
} from 'lucide-react';

const navItems = [
  { path: '/', icon: BarChart3, label: 'Dashboard', color: 'text-white' },
  { path: '/live-camera', icon: Video, label: 'Live Camera', color: 'text-[#FF0040]' },
  { path: '/object-detection', icon: Target, label: 'Detection', color: 'text-[#00D4FF]' },
  { path: '/object-tracking', icon: TrendingUp, label: 'Tracking', color: 'text-[#39FF14]' },
  { path: '/vision-language', icon: MessageSquare, label: 'VL Query', color: 'text-[#00FFFF]' },
  { path: '/few-shot-learning', icon: Sparkles, label: 'Few-Shot', color: 'text-[#FF6B35]' },
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
      <aside className="w-64 border-r border-[rgba(220,20,60,0.3)] bg-black/40 backdrop-blur-xl flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-[rgba(220,20,60,0.3)]">
          <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">
            <span className="text-[#DC143C]">Insight</span>Vision
          </h1>
          <p className="text-xs text-gray-400 mb-3">Vision-Language Empowered Detection</p>
          <div className="inline-flex px-2 py-1 text-[10px] font-bold tracking-wider uppercase border border-[#00D4FF]/50 text-[#00D4FF] bg-[#00D4FF]/10 rounded shadow-[0_0_8px_rgba(0,212,255,0.3)]">
            Architecture Preview v1.0 (Phase 1)
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
                    ? 'bg-[rgba(220,20,60,0.2)] border border-[#DC143C] glow-red'
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
        <div className="p-4 border-t border-[rgba(220,20,60,0.3)]">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5 mb-2 bg-[#39FF14]/10 border border-[#39FF14]/30 px-2 py-1 rounded text-[#39FF14]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Academic License Verified</span>
            </div>
            <div className="text-xs text-gray-500 text-center">
              <p>Research Project</p>
              <p className="text-[#DC143C] mt-1">FYP 2026</p>
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
