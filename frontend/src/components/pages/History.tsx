import { History as HistoryIcon, Video, Search, Trash2, ChevronDown, ChevronUp, Clock, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

const BACKEND = 'http://localhost:8000';

const fallbackHistoryData: SessionItem[] = [];

type TargetEvent = {
  type: string;
  timestamp: string;
  query: string;
  result: string;
  latency_ms: number;
};

type SessionTarget = {
  track_id: number;
  label: string;
  lock_on_time: string;
  events: TargetEvent[];
};

type SessionItem = {
  id: string;
  type: string;
  timestamp: string;
  duration: string;
  source: string;
  url: string;
  localizer: string;
  status: string;
  objects?: number;
  targets: SessionTarget[];
};

function HistoryCard({ item, onDelete }: { item: SessionItem; onDelete: (id: string) => void }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="premium-card p-6 border border-transparent hover:border-primary/30 hover:bg-[rgba(255,255,255,0.02)] transition-all duration-300">
      <div className="flex items-start gap-4">
        {/* Visual Snapshot */}
        <div className="w-[80px] h-[45px] rounded border border-gray-700 bg-black/50 relative overflow-hidden flex-shrink-0 flex items-center justify-center">
          <Video className="w-5 h-5 text-gray-400" />
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-semibold text-white group-hover:text-primary transition-colors">
                  {item.type} <span className="text-xs text-gray-500 font-mono">({item.id})</span>
                </h3>
              </div>
              <p className="text-sm text-gray-400 mt-1">{item.timestamp}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/30">
                {item.localizer === 'sam3' ? 'SAM 3' : 'DINO'}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                item.status === 'active' 
                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' 
                  : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
              }`}>
                {item.status}
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
            <div>
              <p className="text-xs text-gray-500 mb-1">Source</p>
              <p className="text-white font-semibold capitalize">{item.source}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Duration</p>
              <p className="text-white font-semibold">{item.duration}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Targets Tracked</p>
              <p className="text-white font-semibold">{item.targets ? item.targets.length : 0}</p>
            </div>
            {item.url && (
              <div className="col-span-1">
                <p className="text-xs text-gray-500 mb-1">File/URL</p>
                <p className="text-white font-semibold truncate max-w-[150px]" title={item.url}>
                  {item.url.split('/').pop()}
                </p>
              </div>
            )}
          </div>

          {/* Expanded Event Timeline */}
          {isExpanded && item.targets && item.targets.length > 0 && (
            <div className="mt-6 pt-6 border-t border-[rgba(255,255,255,0.06)] space-y-6">
              <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
                Tracking Session Timeline
              </h4>
              {item.targets.map((target) => (
                <div key={target.track_id} className="bg-black/20 rounded-lg p-4 border border-gray-800">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-800">
                    <span className="text-md font-bold text-primary">
                      Target #{target.track_id}: <span className="text-white font-medium">"{target.label}"</span>
                    </span>
                    <span className="text-xs text-gray-400">
                      Locked on at {target.lock_on_time}
                    </span>
                  </div>

                  {/* Target follow-up events timeline */}
                  <div className="relative pl-6 border-l border-gray-700 space-y-4">
                    {target.events && target.events.map((event, idx) => (
                      <div key={idx} className="relative">
                        {/* Bullet point icon */}
                        <div className={`absolute -left-[30px] top-1.5 w-3 h-3 rounded-full border-2 ${
                          event.type === 'lock_on' ? 'bg-primary border-black' :
                          event.type === 'ocr' ? 'bg-primary/60 border-black' :
                          event.type === 'segment' ? 'bg-primary/40 border-black' :
                          'bg-white border-black'
                        }`} />
                        
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-1">
                          <div>
                            <span className="text-xs text-gray-500 font-mono mr-2">[{event.timestamp}]</span>
                            <span className="text-sm font-semibold text-gray-300 capitalize">
                              {event.type === 'lock_on' ? 'Initial Lock-on' : `${event.type} query`}
                            </span>
                            <p className="text-sm text-gray-400 mt-1 italic">"{event.query}"</p>
                            <p className="text-sm text-[#06D6A0] mt-1 bg-black/30 p-2 rounded border border-gray-800/40">
                              {event.result}
                            </p>
                          </div>
                          {event.latency_ms !== undefined && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-gray-800 text-gray-400 border border-gray-700 shrink-0 self-start mt-1">
                              {event.latency_ms} ms
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {(!target.events || target.events.length === 0) && (
                      <p className="text-xs text-gray-500 italic">No command history for this target.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-5 pt-4 border-t border-[rgba(255,255,255,0.06)] shrink-0">
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-4 py-2 flex items-center gap-2 text-sm rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-black hover:border-transparent hover:shadow-[0_0_10px_rgba(6,182,212,0.3)] transition-all duration-300"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Hide Details
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  View Details & Timeline
                </>
              )}
            </button>
            <button 
              onClick={() => onDelete(item.id)}
              className="px-4 py-2 flex items-center gap-2 text-sm rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-white hover:border-transparent hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all duration-300 ml-auto group"
            >
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
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND}/api/session/history`);
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const data = await res.json();
      
      // If we got real data from the backend, use it. Otherwise fallback to mock data
      if (data && data.length > 0) {
        setSessions(data);
      } else {
        setSessions(fallbackHistoryData);
      }
    } catch (err: any) {
      console.warn("Backend fetch failed, using fallback static data:", err);
      setSessions(fallbackHistoryData);
      // Don't show hard error block unless fallback fails
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (id: string) => {
    // For local mock delete
    if (id.startsWith('mock-')) {
      setSessions(prev => prev.filter(s => s.id !== id));
      return;
    }
    
    // For real database / memory clear on backend, we clear all for now or filter out client side
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to clear all session history?")) return;
    try {
      await fetch(`${BACKEND}/api/session/history/clear`, { method: 'POST' });
      setSessions([]);
    } catch (err) {
      console.error("Failed to clear history on server:", err);
      setSessions([]);
    }
  };

  const filteredHistory = sessions.filter(item => {
    const matchesSearch = 
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.localizer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.source.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || 
      (filterType === 'sam3' && item.localizer === 'sam3') ||
      (filterType === 'dino' && item.localizer === 'grounding_dino');

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="h-screen flex flex-col p-4 overflow-hidden">
      {/* Header */}
      <div className="mb-4 shrink-0 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <HistoryIcon className="w-6 h-6 text-primary" strokeWidth={2} />
            <h1 className="text-3xl font-bold text-white font-display">Session History</h1>
          </div>
          <p className="text-sm text-gray-400">View and manage past analysis sessions and target timelines</p>
        </div>
        {sessions.length > 0 && (
          <button 
            onClick={handleClearAll}
            className="px-4 py-2 flex items-center gap-2 text-sm rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-white hover:border-transparent hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all duration-300"
          >
            <Trash2 className="w-4 h-4" />
            Clear All History
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 shrink-0">
        <div className="premium-card p-4">
          <p className="text-3xl font-bold text-white mb-1 font-mono">{sessions.length}</p>
          <p className="text-xs text-gray-400 uppercase tracking-wider">Total Sessions</p>
        </div>
        <div className="premium-card p-4">
          <p className="text-3xl font-bold text-primary mb-1 font-mono">
            {sessions.filter(h => h.localizer === 'grounding_dino').length}
          </p>
          <p className="text-xs text-gray-400 uppercase tracking-wider">DINO Sessions</p>
        </div>
        <div className="premium-card p-4">
          <p className="text-3xl font-bold text-primary/70 mb-1 font-mono">
            {sessions.filter(h => h.localizer === 'sam3').length}
          </p>
          <p className="text-xs text-gray-400 uppercase tracking-wider">SAM 3 Sessions</p>
        </div>
        <div className="premium-card p-4">
          <p className="text-3xl font-bold text-primary mb-1 font-mono">
            {sessions.reduce((acc, h) => acc + (h.targets ? h.targets.length : 0), 0)}
          </p>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-display">Targets Tracked</p>
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
                placeholder="Search by Session ID, Source, Localizer..."
                className="w-full bg-[rgba(255,255,255,0.05)] border border-border rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-[rgba(255,255,255,0.05)] border border-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors hover:bg-[rgba(255,255,255,0.08)] cursor-pointer"
            >
              <option className="bg-black text-white" value="all">All Localizers</option>
              <option className="bg-black text-white" value="sam3">SAM 3</option>
              <option className="bg-black text-white" value="dino">Grounding DINO</option>
            </select>
          </div>
        </div>
      </div>

      {/* History List */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
          <Clock className="w-8 h-8 animate-spin text-primary mb-2" />
          <p>Loading session history records...</p>
        </div>
      ) : (
        <div 
          className="space-y-4 overflow-y-auto pr-2" 
          style={{ maxHeight: 'calc(100vh - 310px)', scrollbarWidth: 'thin', scrollbarColor: 'rgba(6,182,212,0.5) transparent' }}
        >
          {filteredHistory.map((item) => (
            <HistoryCard key={item.id} item={item} onDelete={handleDelete} />
          ))}
          
          {filteredHistory.length === 0 && (
            <div className="premium-card p-16 text-center border-2 border-dashed border-gray-700/50 bg-black/20 mt-4">
              <div className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No sessions found</h3>
              <p className="text-gray-400">We couldn't find any results matching your search or filter criteria. Try adjusting them.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
