import { useState } from 'react';
import { Target, Sliders, Eye, EyeOff, Plus, Sparkles } from 'lucide-react';

const objectClasses = [
  { id: 1, name: 'Person', count: 3, enabled: true, color: '#FF0040' },
  { id: 2, name: 'Red Car', count: 2, enabled: true, color: '#00FFFF' },
  { id: 3, name: 'Safety Vest', count: 1, enabled: true, color: '#39FF14' },
  { id: 4, name: 'Bag', count: 0, enabled: false, color: '#9D4EDD' },
];

const detectedObjects = [
  { id: 1, class: 'Person', confidence: 0.98, bbox: [120, 80, 200, 350], color: '#FF0040' },
  { id: 2, class: 'Person', confidence: 0.95, bbox: [450, 100, 180, 320], color: '#FF0040' },
  { id: 3, class: 'Person', confidence: 0.92, bbox: [750, 120, 160, 300], color: '#FF0040' },
  { id: 4, class: 'Red Car', confidence: 0.94, bbox: [300, 250, 280, 180], color: '#00FFFF' },
  { id: 5, class: 'Red Car', confidence: 0.89, bbox: [650, 280, 250, 160], color: '#00FFFF' },
  { id: 6, class: 'Safety Vest', confidence: 0.87, bbox: [180, 320, 80, 100], color: '#39FF14' },
];

export default function ObjectDetection() {
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.5);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showMasks, setShowMasks] = useState(false);
  const [enabledClasses, setEnabledClasses] = useState<Record<string, boolean>>(
    objectClasses.reduce((acc, cls) => ({ ...acc, [cls.name]: cls.enabled }), {})
  );
  const [customClasses, setCustomClasses] = useState<{ id: number; name: string; color: string }[]>([]);
  const [newClassInput, setNewClassInput] = useState('');
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const customColors = ['#FF6B35', '#06D6A0', '#FFD60A', '#00D4FF', '#FF0040', '#9D4EDD', '#00FFFF'];

  const handleAddClass = () => {
    const trimmed = newClassInput.trim();
    if (!trimmed) return;
    const color = customColors[customClasses.length % customColors.length];
    const newEntry = { id: Date.now(), name: trimmed, color };
    setCustomClasses(prev => [...prev, newEntry]);
    setEnabledClasses(prev => ({ ...prev, [trimmed]: true }));
    setNewClassInput('');
    setJustAdded(trimmed);
    setTimeout(() => setJustAdded(null), 2000);
  };

  const toggleClass = (className: string) => {
    setEnabledClasses(prev => ({ ...prev, [className]: !prev[className] }));
  };

  const filteredObjects = detectedObjects.filter(
    obj => obj.confidence >= confidenceThreshold && enabledClasses[obj.class]
  );

  return (
    <div className="h-screen p-4 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="mb-4 shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <Target className="w-6 h-6 text-[#00D4FF]" strokeWidth={2} />
          <h1 className="text-3xl font-bold text-white">Object Detection</h1>
        </div>
        <p className="text-sm text-gray-400">YOLO-powered real-time object detection</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_22rem] xl:grid-cols-[1fr_26rem] gap-4 flex-1 min-h-0">
        {/* Detection View */}
        <div className="flex flex-col gap-4 overflow-y-auto pr-2 pb-4">
          {/* Main Detection Area */}
          <div className="premium-card p-4">
            <div className="w-full max-h-[60vh] bg-black rounded-lg relative overflow-hidden border-2 border-[rgba(0,212,255,0.3)] mx-auto flex items-center justify-center" style={{ aspectRatio: '16/9' }}>
              {/* Simulated Scene */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-900 to-black w-full h-full">
                {/* Scene Background */}
                <div className="absolute inset-0 opacity-30">
                  <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-gray-700 to-transparent"></div>
                </div>

                {/* Bounding Boxes / Masks */}
                {showBoundingBoxes && filteredObjects.map(obj => (
                  <div
                    key={obj.id}
                    className="absolute"
                    style={{
                      left: `${obj.bbox[0]}px`,
                      top: `${obj.bbox[1]}px`,
                      width: `${obj.bbox[2]}px`,
                      height: `${obj.bbox[3]}px`,
                      border: `3px solid ${obj.color}`,
                      backgroundColor: showMasks ? `${obj.color}40` : 'transparent',
                      boxShadow: showMasks ? 'none' : `0 0 20px ${obj.color}80`,
                      borderRadius: '4px',
                    }}
                  >
                    {showLabels && (
                      <div
                        className="absolute -top-7 left-0 px-2 py-1 rounded text-xs font-semibold text-white"
                        style={{ backgroundColor: obj.color }}
                      >
                        {obj.class} {(obj.confidence * 100).toFixed(0)}%
                      </div>
                    )}
                  </div>
                ))}

                {/* Detection Info Overlay */}
                <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-lg">
                  <p className="text-[#00D4FF] text-sm font-semibold">YOLO Detection Active</p>
                  <p className="text-white text-xs">{filteredObjects.length} objects detected</p>
                </div>

                {/* FPS and VRAM Counter */}
                <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                  <div className="bg-black/70 backdrop-blur-sm px-4 py-2 rounded-lg text-right">
                    <p className="text-[#39FF14] text-sm font-semibold">58 FPS</p>
                    <p className="text-white text-xs">12ms latency</p>
                  </div>
                  <div className="bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,0.1)]">
                    <p className="text-[#FFD60A] text-xs font-semibold">VRAM: 4.2GB / 8GB</p>
                  </div>
                </div>
              </div>
            </div>

            {/* View Controls */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    showBoundingBoxes
                      ? 'bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]'
                      : 'bg-[rgba(255,255,255,0.05)] text-gray-400 border border-transparent'
                  }`}
                >
                  {showBoundingBoxes ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setShowLabels(!showLabels)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    showLabels
                      ? 'bg-[#39FF14]/20 text-[#39FF14] border border-[#39FF14]'
                      : 'bg-[rgba(255,255,255,0.05)] text-gray-400 border border-transparent'
                  }`}
                >
                  Labels
                </button>
                <button
                  onClick={() => setShowMasks(!showMasks)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    showMasks
                      ? 'bg-[#9D4EDD]/20 text-[#9D4EDD] border border-[#9D4EDD]'
                      : 'bg-[rgba(255,255,255,0.05)] text-gray-400 border border-transparent'
                  }`}
                >
                  Masks
                </button>
              </div>
              <div className="text-sm text-gray-400">
                Showing {filteredObjects.length} of {detectedObjects.length} objects
              </div>
            </div>
          </div>

          {/* Detection Statistics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="premium-card p-4 text-center">
              <p className="text-3xl font-bold text-[#00D4FF] mb-1">{filteredObjects.length}</p>
              <p className="text-sm text-gray-400">Objects Detected</p>
            </div>
            <div className="premium-card p-4 text-center">
              <p className="text-3xl font-bold text-[#39FF14] mb-1">
                {Math.round(filteredObjects.reduce((acc, obj) => acc + obj.confidence, 0) / filteredObjects.length * 100) || 0}%
              </p>
              <p className="text-sm text-gray-400">Avg Confidence</p>
            </div>
            <div className="premium-card p-4 text-center">
              <p className="text-3xl font-bold text-[#FFD60A] mb-1">58</p>
              <p className="text-sm text-gray-400">FPS</p>
            </div>
          </div>
        </div>

        {/* Controls Panel */}
        <div className="space-y-4 overflow-y-auto pr-2 pb-4">
          {/* Detection Settings */}
          <div className="premium-card p-4">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-gray-400" />
              Detection Settings
            </h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm text-gray-400">Confidence Threshold</label>
                  <span className="text-white text-sm font-semibold">{(confidenceThreshold * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                  className="w-full"
                  style={{
                    accentColor: '#00D4FF',
                  }}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Grounding Model</label>
                <select className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(220,20,60,0.3)] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#DC143C]">
                  <option className="bg-black text-white">None (Standard YOLO)</option>
                  <option className="bg-black text-white">YOLO-World (Real-time)</option>
                  <option className="bg-black text-white">Grounding DINO (High Precision)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Model Version</label>
                <select className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(220,20,60,0.3)] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#DC143C]">
                  <option className="bg-black text-white">YOLOv11 (Recommended)</option>
                  <option className="bg-black text-white">YOLOv8</option>
                  <option className="bg-black text-white">YOLOv7</option>
                  <option className="bg-black text-white">YOLOv5</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Model Size</label>
                <select className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(220,20,60,0.3)] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#DC143C]">
                  <option className="bg-black text-white">Medium (Balanced)</option>
                  <option className="bg-black text-white">Nano (Fast)</option>
                  <option className="bg-black text-white">Small</option>
                  <option className="bg-black text-white">Large</option>
                  <option className="bg-black text-white">XLarge (Accurate)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Class Filter */}
          <div className="premium-card p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Object Classes</h3>
            <div className="space-y-2">
              {objectClasses.map(cls => {
                const isEnabled = enabledClasses[cls.name];
                return (
                  <div
                    key={cls.id}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                      isEnabled
                        ? 'bg-[rgba(255,255,255,0.05)] border border-[rgba(220,20,60,0.3)]'
                        : 'bg-[rgba(0,0,0,0.3)] border border-transparent opacity-50'
                    }`}
                    onClick={() => toggleClass(cls.name)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: cls.color }}
                      ></div>
                      <span className="text-white">{cls.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 text-sm">{cls.count}</span>
                      {isEnabled ? (
                        <Eye className="w-4 h-4" style={{ color: cls.color }} />
                      ) : (
                        <EyeOff className="w-4 h-4 text-gray-600" />
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Custom Classes */}
              {customClasses.map(cls => {
                const isEnabled = enabledClasses[cls.name];
                return (
                  <div
                    key={cls.id}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                      justAdded === cls.name
                        ? 'border animate-pulse'
                        : isEnabled
                        ? 'bg-[rgba(255,255,255,0.05)] border border-[rgba(220,20,60,0.3)]'
                        : 'bg-[rgba(0,0,0,0.3)] border border-transparent opacity-50'
                    }`}
                    style={justAdded === cls.name ? { backgroundColor: `${cls.color}18`, borderColor: cls.color } : {}}
                    onClick={() => toggleClass(cls.name)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cls.color }}></div>
                      <span className="text-white">{cls.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(6,214,160,0.15)', color: '#06D6A0', border: '1px solid rgba(6,214,160,0.3)' }}>YOLO-World</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 text-sm">—</span>
                      {isEnabled ? (
                        <Eye className="w-4 h-4" style={{ color: cls.color }} />
                      ) : (
                        <EyeOff className="w-4 h-4 text-gray-600" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Open-Vocabulary Input */}
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid #1f1f1f' }}>
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-[#06D6A0]" />
                <span className="text-xs text-[#06D6A0]" style={{ letterSpacing: '0.05em' }}>✨ Open-Vocabulary · VLM Grounding</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newClassInput}
                  onChange={(e) => setNewClassInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddClass()}
                  placeholder="Enter new custom class..."
                  className="flex-1 rounded-lg px-3 py-2 text-white placeholder-[#444] text-sm focus:outline-none focus:ring-1 focus:ring-[#06D6A0]/50 min-w-0"
                  style={{ backgroundColor: '#1a1a1a', border: '1px solid #2e2e2e' }}
                />
                <button
                  onClick={handleAddClass}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-white transition-all duration-200 hover:opacity-90 active:scale-95 whitespace-nowrap"
                  style={{ background: 'linear-gradient(135deg, #06D6A0, #048A6A)', border: '1px solid rgba(6,214,160,0.3)' }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add & Detect
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="premium-card p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Actions</h3>
            <div className="space-y-2">
              <button className="w-full btn-primary py-2 text-sm">
                Export Results
              </button>
              <button className="w-full btn-secondary py-2 text-sm">
                Save Configuration
              </button>
              <button className="w-full btn-secondary py-2 text-sm">
                Reset Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}