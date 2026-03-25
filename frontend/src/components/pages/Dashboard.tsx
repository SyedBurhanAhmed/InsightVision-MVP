import { Link } from 'react-router';
import { useState } from 'react';
import { 
  Target, 
  MessageSquare, 
  Clock,
  Activity,
  Timer,
  Zap,
  VideoOff,
  ChevronDown,
  SendHorizonal,
  Cpu,
  Layers
} from 'lucide-react';

const recentActivity = [
  { id: 1, action: 'Live detection session', time: '2 minutes ago', type: 'camera' },
  { id: 2, action: 'Video analysis completed', time: '15 minutes ago', type: 'video' },
  { id: 3, action: 'VL Query: "Count people"', time: '1 hour ago', type: 'query' },
  { id: 4, action: 'Few-shot model trained', time: '3 hours ago', type: 'training' },
];

const stats = [
  { label: 'VLM Latency', value: '120ms', icon: Timer, color: 'text-[#00D4FF]' },
  { label: 'Objects Detected', value: '1,234', icon: Target, color: 'text-[#39FF14]' },
  { label: 'Avg. FPS', value: '58', icon: Zap, color: 'text-[#FFD60A]' },
  { label: 'Query Success', value: '94%', icon: MessageSquare, color: 'text-[#00FFFF]' },
];

export default function Dashboard() {
  const [activeEngine, setActiveEngine] = useState('YOLOv11');
  const [viewMode, setViewMode] = useState('Bounding Boxes');
  const [query, setQuery] = useState('');

  const engineOptions = ['YOLOv11', 'YOLOv8', 'YOLOv5', 'VLM (LLaVA)', 'VLM (GPT-4V)'];
  const viewModeOptions = ['Bounding Boxes', 'Instance Segments (Masks)', 'Semantic Heatmaps', 'Raw Feed'];
  
  const gpuUsage = 78; // static mock value
  const getGpuColor = (usage: number) => {
    if (usage < 60) return 'from-[#39FF14] to-[#00D4FF]';
    if (usage <= 85) return 'from-[#FFD60A] to-[#FF6B35]';
    return 'from-[#FF0040] to-[#DC143C]';
  };

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Control Center</h1>
        <p className="text-gray-400">Welcome to InsightVision AI Platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="premium-card p-6">
              <div className="flex items-center justify-between mb-4">
                <Icon className={`w-8 h-8 ${stat.color}`} strokeWidth={2} />
                <span className="text-3xl font-bold text-white">{stat.value}</span>
              </div>
              <p className="text-sm text-gray-400">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Video Player Section */}
      <div className="mb-8">

        {/* Control Bar */}
        <div className="flex items-center gap-4 mb-3">
          {/* Active Engine Dropdown */}
          <div className="flex items-center gap-2 flex-1">
            <Cpu className="w-4 h-4 text-[#00D4FF] shrink-0" />
            <span className="text-xs text-gray-500 uppercase shrink-0" style={{ letterSpacing: '0.08em' }}>Active Engine</span>
            <div className="relative flex-1 max-w-[220px]">
              <select
                value={activeEngine}
                onChange={(e) => setActiveEngine(e.target.value)}
                className="w-full appearance-none rounded-lg px-4 py-2 pr-9 text-white text-sm cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#00D4FF]/50"
                style={{ backgroundColor: '#1a1a1a', border: '1px solid #2e2e2e' }}
              >
                {engineOptions.map(opt => (
                  <option key={opt} value={opt} style={{ backgroundColor: '#111', color: '#fff' }}>{opt}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-[#2a2a2a]" />

          {/* View Mode Dropdown */}
          <div className="flex items-center gap-2 flex-1">
            <Layers className="w-4 h-4 text-[#9D4EDD] shrink-0" />
            <span className="text-xs text-gray-500 uppercase shrink-0" style={{ letterSpacing: '0.08em' }}>View Mode</span>
            <div className="relative flex-1 max-w-[220px]">
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
                className="w-full appearance-none rounded-lg px-4 py-2 pr-9 text-white text-sm cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#9D4EDD]/50"
                style={{ backgroundColor: '#1a1a1a', border: '1px solid #2e2e2e' }}
              >
                {viewModeOptions.map(opt => (
                  <option key={opt} value={opt} style={{ backgroundColor: '#111', color: '#fff' }}>{opt}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Live indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2e2e2e' }}>
            <span className="w-2 h-2 rounded-full bg-[#FF0040] animate-pulse" />
            <span className="text-xs text-gray-400">STANDBY</span>
          </div>
        </div>

        {/* Video Container */}
        <div className="w-full" style={{ aspectRatio: '16 / 9' }}>
          <div
            className="w-full h-full rounded-2xl border border-[#2a2a2a] flex flex-col items-center justify-center gap-5"
            style={{ backgroundColor: '#141414' }}
          >
            <div className="flex items-center justify-center w-20 h-20 rounded-full relative" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid #2e2e2e' }}>
              <VideoOff className="w-9 h-9 text-[#444]" strokeWidth={1.5} />
              <div className="absolute top-2 right-2 w-3 h-3 bg-[#DC143C] rounded-full animate-pulse shadow-[0_0_10px_#DC143C]"></div>
            </div>
            <div className="text-center">
              <p className="text-[#DC143C] mb-1 font-semibold tracking-widest flex items-center justify-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-[#DC143C] animate-pulse"></span>
                BACKGROUND SERVER ACTIVE
              </p>
              <p className="text-[#555] text-sm">Waiting for live camera feed signal...</p>
            </div>
          </div>
        </div>

        {/* Natural Language Query Bar */}
        <div
          className="flex items-center gap-3 mt-3 px-5 py-3 rounded-xl"
          style={{ backgroundColor: '#141414', border: '1px solid #2a2a2a' }}
        >
          <MessageSquare className="w-5 h-5 text-[#444] shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask InsightVision about the live scene..."
            className="flex-1 bg-transparent text-white placeholder-[#444] text-sm focus:outline-none"
            onKeyDown={(e) => e.key === 'Enter' && setQuery('')}
          />
          <button
            onClick={() => setQuery('')}
            className="flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 hover:scale-105 shrink-0"
            style={{ background: 'linear-gradient(135deg, #DC143C, #8B0000)' }}
            aria-label="Send query"
          >
            <SendHorizonal className="w-4 h-4 text-white" strokeWidth={2} />
          </button>
        </div>

      </div>

      {/* Recent Activity & System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="premium-card p-6">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-5 h-5 text-[#06D6A0]" />
            <h3 className="text-xl font-semibold text-white">Recent Activity</h3>
          </div>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className={`flex items-center justify-between py-3 border-b border-[rgba(255,255,255,0.1)] last:border-0 ${activity.type === 'query' ? 'cursor-pointer hover:bg-[rgba(255,255,255,0.03)] transition-colors group' : ''}`}
                title={activity.type === 'query' ? 'Click to replay' : ''}
              >
                <div>
                  <p className={`text-white flex items-center gap-2 ${activity.type === 'query' ? 'group-hover:text-[#00D4FF] transition-colors' : ''}`}>
                    {activity.action}
                    {activity.type === 'query' && (
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-[#00D4FF]/20 text-[#00D4FF] px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                        Replay
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500">{activity.time}</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-[#DC143C]"></div>
              </div>
            ))}
          </div>
          <Link
            to="/history"
            className="block mt-4 text-center text-sm text-[#DC143C] hover:text-[#FF0040] transition-colors"
          >
            View All History →
          </Link>
        </div>

        {/* System Status */}
        <div className="premium-card p-6">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-[#39FF14]" />
            <h3 className="text-xl font-semibold text-white">System Status</h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">YOLO Model</span>
                <span className="text-[#39FF14]">Active</span>
              </div>
              <div className="w-full bg-[rgba(255,255,255,0.1)] rounded-full h-2">
                <div className="bg-gradient-to-r from-[#39FF14] to-[#00D4FF] h-2 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">VLM Engine</span>
                <span className="text-[#00FFFF]">Ready</span>
              </div>
              <div className="w-full bg-[rgba(255,255,255,0.1)] rounded-full h-2">
                <div className="bg-gradient-to-r from-[#00FFFF] to-[#9D4EDD] h-2 rounded-full" style={{ width: '95%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">GPU Memory</span>
                <span className={gpuUsage < 60 ? 'text-[#39FF14]' : gpuUsage <= 85 ? 'text-[#FFD60A]' : 'text-[#FF0040]'}>
                  6.2 / 8 GB ({gpuUsage}%)
                </span>
              </div>
              <div className="w-full bg-[rgba(255,255,255,0.1)] rounded-full h-2">
                <div className={`bg-gradient-to-r ${getGpuColor(gpuUsage)} h-2 rounded-full`} style={{ width: `${gpuUsage}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Camera Feed</span>
                <span className="text-[#FF0040]">Standby</span>
              </div>
              <div className="w-full bg-[rgba(255,255,255,0.1)] rounded-full h-2">
                <div className="bg-gradient-to-r from-[#FF0040] to-[#DC143C] h-2 rounded-full" style={{ width: '0%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}