import { History as HistoryIcon, Video, Search, Download, Trash2, Calendar } from 'lucide-react';
import { useState } from 'react';

const sessionHistoryData = [
  {
    id: 1,
    type: 'Live Detection',
    timestamp: '2026-03-25 14:32:15',
    duration: '5m 23s',
    objects: 12,
    fps: 58,
    status: 'completed',
    icon: Video,
    color: '#FF0040',
    engine: 'DINO'
  },
  {
    id: 2,
    type: 'VL Query',
    timestamp: '2026-03-25 13:15:42',
    duration: '45s',
    objects: 3,
    query: 'How many people are working?',
    status: 'completed',
    icon: Search,
    color: '#00FFFF',
    engine: 'VLM'
  },
  {
    id: 3,
    type: 'Video Analysis',
    timestamp: '2026-03-25 11:20:18',
    duration: '15m 47s',
    objects: 45,
    fps: 52,
    status: 'completed',
    icon: Video,
    color: '#00D4FF',
    engine: 'DINO'
  },
  {
    id: 4,
    type: 'Object Tracking',
    timestamp: '2026-03-25 10:05:33',
    duration: '8m 12s',
    objects: 8,
    trackedObjects: 5,
    status: 'completed',
    icon: HistoryIcon,
    color: '#39FF14',
    engine: 'Hybrid'
  },
  {
    id: 5,
    type: 'Few-Shot Training',
    timestamp: '2026-03-25 09:45:20',
    duration: '2m 30s',
    samples: 5,
    accuracy: 94,
    status: 'completed',
    icon: Video,
    color: '#FF6B35',
    engine: 'DINO'
  },
  {
    id: 6,
    type: 'VL Query',
    timestamp: '2026-03-24 16:22:08',
    duration: '32s',
    objects: 7,
    query: 'Detect all red objects',
    status: 'completed',
    icon: Search,
    color: '#00FFFF',
    engine: 'VLM'
  },
  {
    id: 7,
    type: 'Live Detection',
    timestamp: '2026-03-24 15:10:45',
    duration: '12m 05s',
    objects: 28,
    fps: 60,
    status: 'completed',
    icon: Video,
    color: '#FF0040',
    engine: 'Hybrid'
  },
];

type SessionItem = typeof sessionHistoryData[0];

function HistoryCard({ item }: { item: SessionItem }) {
  const Icon = item.icon;
  return (
    <div className="premium-card p-6 border border-transparent hover:border-[#DC143C]/50 hover:bg-[rgba(255,255,255,0.02)] transition-all duration-300">
      <div className="flex items-start gap-4">
        {/* Thumbnail Snapshot */}
        <div className="w-[80px] h-[45px] rounded border border-gray-700 bg-black/50 relative overflow-hidden flex-shrink-0 group">
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
          <Icon className="w-4 h-4 absolute bottom-1 right-1 z-20" style={{ color: item.color }} />
          {/* Placeholder visual */}
          <div className="w-full h-full opacity-30 flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&q=80&w=200')] bg-cover bg-center mix-blend-luminosity"></div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-xl font-semibold text-white mb-1 group-hover:text-[#DC143C] transition-colors">{item.type}</h3>
              <p className="text-sm text-gray-400">{item.timestamp}</p>
            </div>
            <div className="flex items-center gap-3">
              {item.engine && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  item.engine === 'DINO' ? 'bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/30' :
                  item.engine === 'VLM' ? 'bg-[#9D4EDD]/10 text-[#9D4EDD] border border-[#9D4EDD]/30' :
                  'bg-[#FFD60A]/10 text-[#FFD60A] border border-[#FFD60A]/30'
                }`}>
                  {item.engine}
                </span>
              )}
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold border"
                style={{
                  backgroundColor: `${item.color}15`,
                  color: item.color,
                  borderColor: `${item.color}30`
                }}
              >
                {item.status}
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Duration</p>
              <p className="text-white font-semibold">{item.duration}</p>
            </div>
            {item.objects !== undefined && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Objects</p>
                <p className="text-white font-semibold">{item.objects}</p>
              </div>
            )}
            {item.fps && (
              <div>
                <p className="text-xs text-gray-500 mb-1">FPS</p>
                <p className="text-white font-semibold">{item.fps}</p>
              </div>
            )}
            {item.query && (
              <div className="col-span-2">
                <p className="text-xs text-gray-500 mb-1">Query</p>
                <p className="text-white font-semibold">"{item.query}"</p>
              </div>
            )}
            {item.trackedObjects && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Tracked</p>
                <p className="text-white font-semibold">{item.trackedObjects}</p>
              </div>
            )}
            {item.accuracy !== undefined && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Accuracy</p>
                <p className="text-white font-semibold">{item.accuracy}%</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-5 pt-4 border-t border-[rgba(255,255,255,0.06)]">
            <button className="px-4 py-2 flex items-center gap-2 text-sm rounded-lg bg-[rgba(0,212,255,0.1)] text-[#00D4FF] border border-[#00D4FF]/20 hover:bg-[#00D4FF] hover:text-black hover:border-transparent hover:shadow-[0_0_15px_rgba(0,212,255,0.4)] transition-all duration-300">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="px-4 py-2 text-sm rounded-lg font-semibold bg-[#DC143C]/10 text-[#DC143C] border border-[#DC143C]/30 hover:bg-[#DC143C] hover:text-white hover:border-transparent hover:shadow-[0_0_15px_rgba(220,20,60,0.6)] transition-all duration-300">
              View Details
            </button>
            <button className="px-4 py-2 flex items-center gap-2 text-sm rounded-lg bg-[rgba(255,0,64,0.1)] text-[#FF0040] border border-[#FF0040]/20 hover:bg-[#FF0040] hover:text-white hover:border-transparent hover:shadow-[0_0_15px_rgba(255,0,64,0.4)] transition-all duration-300 ml-auto group">
              <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function History() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const filteredHistory = sessionHistoryData.filter(item => {
    const matchesSearch = item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.query && item.query.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filterType === 'all' || item.type === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="h-screen flex flex-col p-4 overflow-hidden">
      {/* Header */}
      <div className="mb-4 shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <HistoryIcon className="w-6 h-6 text-[#06D6A0]" strokeWidth={2} />
          <h1 className="text-3xl font-bold text-white">Session History</h1>
        </div>
        <p className="text-sm text-gray-400">View and manage past analysis sessions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 shrink-0">
        <div className="premium-card p-4">
          <p className="text-3xl font-bold text-white mb-1">{sessionHistoryData.length}</p>
          <p className="text-xs text-gray-400 uppercase tracking-wider">Total Sessions</p>
        </div>
        <div className="premium-card p-4">
          <p className="text-3xl font-bold text-[#00D4FF] mb-1">
            {sessionHistoryData.filter(h => h.type === 'Live Detection').length}
          </p>
          <p className="text-xs text-gray-400 uppercase tracking-wider">Live Detections</p>
        </div>
        <div className="premium-card p-4">
          <p className="text-3xl font-bold text-[#00FFFF] mb-1">
            {sessionHistoryData.filter(h => h.type === 'VL Query').length}
          </p>
          <p className="text-xs text-gray-400 uppercase tracking-wider">VL Queries</p>
        </div>
        <div className="premium-card p-4">
          <p className="text-3xl font-bold text-[#39FF14] mb-1">
            {sessionHistoryData.reduce((acc, h) => acc + (h.objects || 0), 0)}
          </p>
          <p className="text-xs text-gray-400 uppercase tracking-wider">Objects Detected</p>
        </div>
      </div>

      {/* Filters */}
      <div className="premium-card p-4 mb-4 inline-block w-full shrink-0">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search sessions..."
                className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(220,20,60,0.3)] rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#DC143C] transition-colors"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-[rgba(255,255,255,0.05)] border border-[rgba(220,20,60,0.3)] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#DC143C] transition-colors hover:bg-[rgba(255,255,255,0.08)] cursor-pointer"
            >
              <option className="bg-black text-white" value="all">All Types</option>
              <option className="bg-black text-white" value="Live Detection">Live Detection</option>
              <option className="bg-black text-white" value="VL Query">VL Query</option>
              <option className="bg-black text-white" value="Video Analysis">Video Analysis</option>
              <option className="bg-black text-white" value="Object Tracking">Object Tracking</option>
              <option className="bg-black text-white" value="Few-Shot Training">Few-Shot Training</option>
            </select>

            <button className="btn-secondary px-6 py-3 flex items-center gap-2 hover:bg-[rgba(255,255,255,0.1)] transition-colors">
              <Calendar className="w-5 h-5" />
              Date Range
            </button>
          </div>
        </div>
      </div>

      {/* History List */}
      <div 
        className="space-y-4 overflow-y-auto pr-2" 
        style={{ maxHeight: 'calc(100vh - 310px)', scrollbarWidth: 'thin', scrollbarColor: 'rgba(220,20,60,0.6) transparent' }}
      >
        {filteredHistory.map((item) => (
          <HistoryCard key={item.id} item={item} />
        ))}
      </div>

      {/* Pagination */}
      {filteredHistory.length > 0 && (
        <div className="flex items-center justify-center gap-2 mt-4 shrink-0 pb-2">
          <button className="px-4 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-transparent text-white hover:bg-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)] transition-all duration-200">
            Previous
          </button>
          <button className="px-4 py-2 rounded-lg bg-[#DC143C] text-white font-medium shadow-[0_0_10px_rgba(220,20,60,0.4)]">1</button>
          <button className="px-4 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-transparent text-white hover:bg-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)] transition-all duration-200">
            2
          </button>
          <button className="px-4 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-transparent text-white hover:bg-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)] transition-all duration-200">
            3
          </button>
          <button className="px-4 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-transparent text-white hover:bg-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)] transition-all duration-200">
            Next
          </button>
        </div>
      )}

      {filteredHistory.length === 0 && (
        <div className="premium-card p-16 text-center border-2 border-dashed border-gray-700/50 bg-black/20 mt-4">
          <div className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No sessions found</h3>
          <p className="text-gray-400">We couldn't find any results matching your search or filter criteria. Try adjusting them.</p>
        </div>
      )}
    </div>
  );
}

