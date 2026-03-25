import { useState } from 'react';
import { TrendingUp, Users, Car, Activity, Crosshair, ChevronDown, Trash2 } from 'lucide-react';

const trackedObjects = [
  {
    id: 'P001',
    type: 'Person',
    status: 'Active',
    timeInFrame: '45s',
    path: [[100, 300], [150, 280], [200, 260], [250, 240], [300, 220]],
    color: '#FF0040',
    currentPos: [300, 220],
    promptMatch: 'person in red shirt',
  },
  {
    id: 'P002',
    type: 'Person',
    status: 'Active',
    timeInFrame: '32s',
    path: [[500, 200], [480, 220], [460, 240], [440, 260], [420, 280]],
    color: '#00D4FF',
    currentPos: [420, 280],
    promptMatch: 'blue backpack',
  },
  {
    id: 'V001',
    type: 'Vehicle',
    status: 'Active',
    timeInFrame: '18s',
    path: [[700, 350], [680, 340], [660, 330], [640, 320], [620, 310]],
    color: '#39FF14',
    currentPos: [620, 310],
    promptMatch: 'silver sedan near entrance',
  },
  {
    id: 'P003',
    type: 'Person',
    status: 'Lost',
    timeInFrame: '12s',
    path: [[800, 150], [780, 160], [760, 170]],
    color: '#FFD60A',
    currentPos: null,
    promptMatch: 'person with yellow jacket',
  },
];

export default function ObjectTracking() {
  const [showPaths, setShowPaths] = useState(true);
  const [showIds, setShowIds] = useState(true);

  const [trackingAlgorithm, setTrackingAlgorithm] = useState('bytetrack');
  const [vlmPrompt, setVlmPrompt] = useState('');
  const [trackInitiated, setTrackInitiated] = useState(false);
  const [activePrompt, setActivePrompt] = useState('');
  const [removedTracks, setRemovedTracks] = useState<string[]>([]);

  const [minConfidence, setMinConfidence] = useState(0.75);
  const [reIdThreshold, setReIdThreshold] = useState(0.80);
  const [lostTrackTimeout, setLostTrackTimeout] = useState(30);

  const handleInitiateTrack = () => {
    if (!vlmPrompt.trim()) return;
    setActivePrompt(vlmPrompt.trim());
    setTrackInitiated(true);
    setTimeout(() => setTrackInitiated(false), 2000);
  };

  const handleRemoveTrack = (id: string) => {
    setRemovedTracks(prev => [...prev, id]);
  };

  const activeObjects = trackedObjects.filter(obj => obj.status === 'Active');

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp className="w-8 h-8 text-[#39FF14]" strokeWidth={2} />
          <h1 className="text-4xl font-bold text-white">Multi-Object Tracking</h1>
        </div>
        <p className="text-gray-400">Persistent tracking with trajectory visualization</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tracking View */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Tracking Area */}
          <div className="premium-card p-6">
            <div className="aspect-video bg-black rounded-lg relative overflow-hidden border-2 border-[rgba(57,255,20,0.3)]">
              {/* Scene */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-900 to-black">
                <div className="absolute inset-0 opacity-30">
                  <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-gray-700 to-transparent"></div>
                </div>

                {/* VLM Scanning Pulse */}
                {trackInitiated && (
                  <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden rounded-lg border-2 border-[#39FF14] bg-[#39FF14]/10 animate-pulse"></div>
                )}

                {/* Trajectory Paths */}
                {showPaths && trackedObjects.map(obj => (
                  <svg
                    key={`path-${obj.id}`}
                    className="absolute inset-0 w-full h-full"
                    style={{ pointerEvents: 'none' }}
                  >
                    <polyline
                      points={obj.path.map(p => p.join(',')).join(' ')}
                      fill="none"
                      stroke={obj.color}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.6"
                      strokeDasharray={obj.status === 'Lost' ? '10,5' : 'none'}
                    />
                    {/* Path dots */}
                    {obj.path.map((point, idx) => (
                      <circle
                        key={idx}
                        cx={point[0]}
                        cy={point[1]}
                        r="4"
                        fill={obj.color}
                        opacity="0.5"
                      />
                    ))}
                  </svg>
                ))}

                {/* Current Positions */}
                {trackedObjects.map(obj => obj.currentPos && (
                  <div
                    key={obj.id}
                    className="absolute"
                    style={{
                      left: `${obj.currentPos[0]}px`,
                      top: `${obj.currentPos[1]}px`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    {/* Tracking Box */}
                    <div
                      className="w-20 h-28 border-4 rounded-lg animate-pulse"
                      style={{
                        borderColor: obj.color,
                        boxShadow: `0 0 20px ${obj.color}80`,
                      }}
                    >
                      {showIds && (
                        <div
                          className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold text-white whitespace-nowrap"
                          style={{ backgroundColor: obj.color }}
                        >
                          ID: {obj.id}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Tracking Info */}
                <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-lg">
                  <p className="text-[#39FF14] text-sm font-semibold">Tracking Active</p>
                  <p className="text-white text-xs">{activeObjects.length} objects tracked</p>
                </div>

                {/* Algorithm Info */}
                <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-lg">
                  <p className="text-[#00D4FF] text-sm font-semibold capitalize">
                    {trackingAlgorithm === 'bytetrack' ? 'ByteTrack' : 
                     trackingAlgorithm === 'deepsort' ? 'DeepSORT' : 
                     trackingAlgorithm === 'botsort' ? 'BoT-SORT' :
                     trackingAlgorithm === 'strongsort' ? 'StrongSORT' : 'OC-SORT'}
                  </p>
                  <p className="text-white text-xs">Re-ID enabled</p>
                </div>
              </div>
            </div>

            {/* View Controls */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPaths(!showPaths)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    showPaths
                      ? 'bg-[#39FF14]/20 text-[#39FF14] border border-[#39FF14]'
                      : 'bg-[rgba(255,255,255,0.05)] text-gray-400 border border-transparent'
                  }`}
                >
                  Trajectories
                </button>
                <button
                  onClick={() => setShowIds(!showIds)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    showIds
                      ? 'bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]'
                      : 'bg-[rgba(255,255,255,0.05)] text-gray-400 border border-transparent'
                  }`}
                >
                  IDs
                </button>
              </div>
              <div className="text-sm text-gray-400">
                {trackedObjects.length} total | {activeObjects.length} active
              </div>
            </div>
          </div>

          {/* Tracking Statistics */}
          <div className="grid grid-cols-4 gap-4">
            <div className="premium-card p-4 text-center">
              <Users className="w-6 h-6 text-[#FF0040] mx-auto mb-2" />
              <p className="text-2xl font-bold text-white mb-1">
                {trackedObjects.filter(o => o.type === 'Person').length}
              </p>
              <p className="text-xs text-gray-400">People</p>
            </div>
            <div className="premium-card p-4 text-center">
              <Car className="w-6 h-6 text-[#39FF14] mx-auto mb-2" />
              <p className="text-2xl font-bold text-white mb-1">
                {trackedObjects.filter(o => o.type === 'Vehicle').length}
              </p>
              <p className="text-xs text-gray-400">Vehicles</p>
            </div>
            <div className="premium-card p-4 text-center">
              <Activity className="w-6 h-6 text-[#00D4FF] mx-auto mb-2" />
              <p className="text-2xl font-bold text-white mb-1">{activeObjects.length}</p>
              <p className="text-xs text-gray-400">Active</p>
            </div>
            <div className="premium-card p-4 text-center">
              <TrendingUp className="w-6 h-6 text-[#FFD60A] mx-auto mb-2" />
              <p className="text-2xl font-bold text-white mb-1">98%</p>
              <p className="text-xs text-gray-400">Accuracy</p>
            </div>
          </div>
        </div>

        {/* Tracked Objects Panel */}
        <div className="space-y-6">
          {/* Tracking Algorithm */}
          <div className="premium-card p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Tracking Algorithm</h3>
            <div className="relative">
              <select
                value={trackingAlgorithm}
                onChange={(e) => setTrackingAlgorithm(e.target.value)}
                className="w-full appearance-none bg-[rgba(255,255,255,0.05)] border border-[rgba(220,20,60,0.3)] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#DC143C] pr-10 cursor-pointer"
              >
                <option className="bg-black text-white" value="bytetrack">ByteTrack</option>
                <option className="bg-black text-white" value="deepsort">DeepSORT</option>
                <option className="bg-black text-white" value="botsort">BoT-SORT</option>
                <option className="bg-black text-white" value="strongsort">StrongSORT</option>
                <option className="bg-black text-white" value="ocsort">OC-SORT</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* VLM Target Prompt */}
          <div className="premium-card p-6">
            <h3 className="text-xl font-semibold text-white mb-1">VLM Target Prompt</h3>
            <p className="text-xs text-gray-500 mb-4">Natural language tracking via vision-language model</p>

            <textarea
              value={vlmPrompt}
              onChange={(e) => setVlmPrompt(e.target.value)}
              placeholder="Describe object to track (e.g., 'person in red shirt')..."
              rows={3}
              className="w-full rounded-lg px-4 py-3 text-white placeholder-[#3a3a3a] text-sm focus:outline-none focus:ring-1 focus:ring-[#DC143C]/60 resize-none leading-relaxed"
              style={{ backgroundColor: '#111111', border: '1px solid #252525' }}
            />

            <button
              onClick={handleInitiateTrack}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
              style={{
                background: trackInitiated
                  ? 'linear-gradient(135deg, #39FF14, #1a8c00)'
                  : 'linear-gradient(135deg, #DC143C, #8B0000)',
                border: trackInitiated
                  ? '1px solid rgba(57,255,20,0.4)'
                  : '1px solid rgba(220,20,60,0.4)',
                boxShadow: trackInitiated
                  ? '0 0 18px rgba(57,255,20,0.35)'
                  : '0 0 18px rgba(220,20,60,0.35)',
              }}
            >
              <Crosshair className="w-4 h-4" />
              <span className="text-sm">{trackInitiated ? 'Track Initiated!' : 'Initiate Track'}</span>
            </button>

            {/* Active prompt feedback */}
            {activePrompt && (
              <div className="mt-3 px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: 'rgba(220,20,60,0.08)', border: '1px solid rgba(220,20,60,0.2)' }}>
                <span className="text-gray-400">Tracking: </span>
                <span className="text-[#DC143C]">"{activePrompt}"</span>
              </div>
            )}

            {/* Config Sliders */}
            <div className="mt-6 pt-4 space-y-4" style={{ borderTop: '1px solid #1a1a1a' }}>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Max Objects</span>
                <span className="text-white">50</span>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm text-gray-400">Min Confidence</label>
                  <span className="text-xs font-mono bg-[#DC143C]/20 text-[#DC143C] px-2 py-0.5 rounded border border-[#DC143C]/30">{(minConfidence * 100).toFixed(0)}%</span>
                </div>
                <input type="range" min="0" max="1" step="0.05" value={minConfidence} onChange={(e) => setMinConfidence(parseFloat(e.target.value))} className="w-full accent-[#DC143C]" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm text-gray-400">Re-ID Threshold</label>
                  <span className="text-xs font-mono bg-[#DC143C]/20 text-[#DC143C] px-2 py-0.5 rounded border border-[#DC143C]/30">{reIdThreshold.toFixed(2)}</span>
                </div>
                <input type="range" min="0" max="1" step="0.05" value={reIdThreshold} onChange={(e) => setReIdThreshold(parseFloat(e.target.value))} className="w-full accent-[#DC143C]" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm text-gray-400">Lost Track Timeout</label>
                  <span className="text-xs font-mono bg-[#DC143C]/20 text-[#DC143C] px-2 py-0.5 rounded border border-[#DC143C]/30">{lostTrackTimeout} frames</span>
                </div>
                <input type="range" min="10" max="120" step="5" value={lostTrackTimeout} onChange={(e) => setLostTrackTimeout(parseInt(e.target.value))} className="w-full accent-[#DC143C]" />
              </div>
            </div>
          </div>

          {/* Tracked Objects List */}
          <div 
            className="premium-card p-6 overflow-y-auto" 
            style={{ 
              height: 'calc(100vh - 200px)',
              scrollbarWidth: 'thin', 
              scrollbarColor: '#DC143C transparent' 
            }}
          >
            <h3 className="text-xl font-semibold text-white mb-4">Tracked Objects</h3>
            <div className="space-y-3">
              {trackedObjects.filter(obj => !removedTracks.includes(obj.id)).map(obj => (
                <div
                  key={obj.id}
                  className={`p-4 rounded-lg border transition-all ${
                    obj.status === 'Active'
                      ? 'bg-[rgba(255,255,255,0.05)] border-[rgba(220,20,60,0.3)]'
                      : 'bg-[rgba(0,0,0,0.3)] border-gray-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: obj.color }}
                      ></div>
                      <span className="font-semibold text-white">{obj.id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          obj.status === 'Active'
                            ? 'bg-[#39FF14]/20 text-[#39FF14]'
                            : 'bg-gray-700 text-gray-400'
                        }`}
                      >
                        {obj.status}
                      </span>
                      <button
                        onClick={() => handleRemoveTrack(obj.id)}
                        className="p-1 rounded-md text-gray-600 hover:text-red-500 hover:bg-red-500/10 transition-all duration-150"
                        title="Remove track"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-gray-400 shrink-0">Prompt Match</span>
                      <span className="text-gray-300 italic text-right">{obj.promptMatch}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Type</span>
                      <span className="text-white">{obj.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Time in Frame</span>
                      <span className="text-white">{obj.timeInFrame}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Path Length</span>
                      <span className="text-white">{obj.path.length} points</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="premium-card p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Actions</h3>
            <div className="space-y-2">
              <button className="w-full btn-primary py-2 text-sm">
                Export Trajectories
              </button>
              <button className="w-full btn-secondary py-2 text-sm">
                Clear Lost Tracks
              </button>
              <button className="w-full btn-secondary py-2 text-sm">
                Reset All Tracks
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}