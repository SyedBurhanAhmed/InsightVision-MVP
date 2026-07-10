import { useState, useEffect } from 'react';
import { Target, Sliders, Eye, EyeOff, Plus, Sparkles, Download } from 'lucide-react';

const objectClasses = [
  { id: 1, name: 'Person', count: 3, enabled: true, color: '#FF0040' },
  { id: 2, name: 'Red Car', count: 2, enabled: true, color: '#00FFFF' },
  { id: 3, name: 'Safety Vest', count: 1, enabled: true, color: '#39FF14' },
  { id: 4, name: 'Bag', count: 0, enabled: false, color: '#9D4EDD' },
];

// Using real backend detection instead of mock data
// We will store detected objects in state.

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
  
  // Real detection states
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [detectedObjects, setDetectedObjects] = useState<any[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [latencyMs, setLatencyMs] = useState(0);
  const [deviceMode, setDeviceMode] = useState('CPU Mode');
  const [detectionMode, setDetectionMode] = useState<'classes' | 'phrase'>('classes');
  const [phraseInput, setPhraseInput] = useState('person in white');
  const [selectedModel, setSelectedModel] = useState('groundingdino');
  const [history, setHistory] = useState<{ latency: number; confidence: number }[]>([]);

  useEffect(() => {
    const savedConf = localStorage.getItem('iv_confidence_threshold');
    if (savedConf) setConfidenceThreshold(parseFloat(savedConf));
  }, []);

  const handleExport = () => {
    if (detectedObjects.length === 0) {
      alert("No detections to export yet. Run detection on an image first.");
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(detectedObjects, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `detections_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleSaveConfig = () => {
    localStorage.setItem('iv_confidence_threshold', confidenceThreshold.toString());
    alert("Confidence threshold saved to local settings!");
  };

  const handleResetSettings = () => {
    setConfidenceThreshold(0.5);
    setHistory([]);
    localStorage.removeItem('iv_confidence_threshold');
    alert("Settings and session statistics reset.");
  };

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

  const filteredObjects = detectedObjects.filter(obj => {
    if (obj.confidence < confidenceThreshold) return false;
    if (detectionMode === 'phrase') return true;
    const clsName = obj.class || '';
    const match = Object.keys(enabledClasses).find(
      k => k.toLowerCase() === clsName.toLowerCase()
    );
    return match ? enabledClasses[match] : false;
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setImageUrl(URL.createObjectURL(file));
      setDetectedObjects([]);
    }
  };

  const handleDetect = async () => {
    if (!selectedImage) return;
    
    let activePrompts = "";
    if (detectionMode === 'classes') {
      activePrompts = [...objectClasses, ...customClasses]
        .filter(cls => enabledClasses[cls.name])
        .map(cls => cls.name)
        .join(", ");
        
      if (!activePrompts) {
        alert("Please enable at least one class to detect.");
        return;
      }
    } else {
      activePrompts = phraseInput.trim();
      if (!activePrompts) {
        alert("Please enter a search phrase to detect.");
        return;
      }
    }

    setIsDetecting(true);
    const formData = new FormData();
    formData.append("image", selectedImage);
    formData.append("prompt", activePrompts);
    formData.append("conf_threshold", confidenceThreshold.toString());
    formData.append("model", selectedModel);
    formData.append("masks", showMasks.toString());

    try {
      // Assuming backend is running on localhost:8080
      const res = await fetch("http://localhost:8000/api/detect", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(await res.text());
      
      const data = await res.json();
      setDetectedObjects(data.objects || []);
      setLatencyMs(data.inference_ms || 0);
      if (data.device) {
        setDeviceMode(data.device.toLowerCase().includes("cuda") || data.device.toLowerCase().includes("nvidia") ? "GPU Mode" : "CPU Mode");
      }
      
      // Track session statistics
      const currentObjects = data.objects || [];
      const currentLatency = data.inference_ms || 0;
      const currentAvgConf = currentObjects.length > 0
        ? currentObjects.reduce((sum: number, o: any) => sum + o.confidence, 0) / currentObjects.length
        : 0;
      setHistory(prev => [...prev, { latency: currentLatency, confidence: currentAvgConf }]);
    } catch (err) {
      console.error(err);
      alert("Failed to detect objects. Ensure backend is running.");
    } finally {
      setIsDetecting(false);
    }
  };

  return (
    <div className="h-screen p-4 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="mb-4 shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <Target className="w-6 h-6 text-[#00D4FF]" strokeWidth={2} />
          <h1 className="text-3xl font-bold text-white">Object Detection</h1>
        </div>
        <p className="text-sm text-gray-400">Vision-Language Grounding & Open-Vocabulary Detection</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_22rem] xl:grid-cols-[1fr_26rem] gap-4 flex-1 min-h-0">
        {/* Detection View */}
        <div className="flex flex-col gap-4 overflow-y-auto pr-2 pb-4">
          {/* Main Detection Area */}
          <div className="premium-card p-4">
            <div className="w-full max-h-[60vh] bg-black rounded-lg relative overflow-hidden border-2 border-[rgba(0,212,255,0.3)] mx-auto flex items-center justify-center" style={{ minHeight: '40vh' }}>
              {/* Scene Background */}
              {imageUrl ? (
                <div className="relative inline-block max-w-full max-h-[60vh]">
                  <img id="detected-image" src={imageUrl} alt="Uploaded" className="max-w-full max-h-[60vh] block" />
                  
                  {/* Bounding Boxes / Masks */}
                  {showBoundingBoxes && filteredObjects.map((obj, idx) => {
                    // Determine color based on class
                    let objColor = obj.color || '#00D4FF';
                    if (detectionMode === 'classes') {
                      const classDef = [...objectClasses, ...customClasses].find(
                        c => c.name.toLowerCase() === (obj.class || '').toLowerCase()
                      );
                      if (classDef) objColor = classDef.color;
                    }
                    
                    return (
                      <div
                        key={obj.id || idx}
                        className="absolute"
                        style={{
                          left: `calc(100% * ${obj.bbox[0]} / var(--img-natural-width, 1000))`,
                          top: `calc(100% * ${obj.bbox[1]} / var(--img-natural-height, 1000))`,
                          width: `calc(100% * ${obj.bbox[2]} / var(--img-natural-width, 1000))`,
                          height: `calc(100% * ${obj.bbox[3]} / var(--img-natural-height, 1000))`,
                          border: `3px solid ${objColor}`,
                          backgroundColor: showMasks ? `${objColor}40` : 'transparent',
                          boxShadow: showMasks ? 'none' : `0 0 20px ${objColor}80`,
                          borderRadius: '4px',
                        }}
                      >
                        {showLabels && (
                          <div
                            className="absolute -top-7 left-0 px-2 py-1 rounded text-xs font-semibold text-white whitespace-nowrap"
                            style={{ backgroundColor: objColor }}
                          >
                            {obj.class} {(obj.confidence * 100).toFixed(0)}%
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Simple image onload handler to set CSS variables for natural width/height */}
                  <img 
                    src={imageUrl} 
                    className="hidden" 
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      const parent = img.parentElement;
                      if (parent) {
                        parent.style.setProperty('--img-natural-width', img.naturalWidth.toString());
                        parent.style.setProperty('--img-natural-height', img.naturalHeight.toString());
                      }
                    }} 
                  />
                </div>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-900 to-black w-full h-full flex flex-col items-center justify-center">
                  <p className="text-gray-400 mb-4">No image uploaded</p>
                  <label className="btn-primary px-4 py-2 cursor-pointer">
                    Upload Image
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                </div>
              )}

              {/* Detection Info Overlay */}
              {imageUrl && (
                <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-lg">
                  <p className="text-[#00D4FF] text-sm font-semibold">Grounding DINO Active</p>
                  <p className="text-white text-xs">{filteredObjects.length} objects detected</p>
                  <div className="mt-2">
                    <label className="text-xs text-gray-300 bg-[rgba(255,255,255,0.1)] px-2 py-1 rounded cursor-pointer block text-center">
                      Change Image
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  </div>
                </div>
              )}

              {/* FPS and VRAM Counter */}
              {latencyMs > 0 && (
                <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                  <div className="bg-black/70 backdrop-blur-sm px-4 py-2 rounded-lg text-right">
                    <p className="text-[#39FF14] text-sm font-semibold">{latencyMs > 0 ? (1000/latencyMs).toFixed(1) : 0} FPS</p>
                    <p className="text-white text-xs">{latencyMs.toFixed(0)}ms latency</p>
                  </div>
                  <div className="bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,0.1)]">
                    <p className="text-[#FFD60A] text-xs font-semibold">{deviceMode}</p>
                  </div>
                </div>
              )}
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
              <p className="text-sm text-gray-400">Current Objects</p>
            </div>
            <div className="premium-card p-4 text-center">
              <p className="text-3xl font-bold text-[#39FF14] mb-1">
                {history.length > 0
                  ? Math.round((history.reduce((sum, h) => sum + h.confidence, 0) / history.length) * 100)
                  : 0}%
              </p>
              <p className="text-sm text-gray-400">Session Avg. Conf</p>
            </div>
            <div className="premium-card p-4 text-center">
              <p className="text-3xl font-bold text-[#FFD60A] mb-1">
                {history.length > 0
                  ? `${Math.round(history.reduce((sum, h) => sum + h.latency, 0) / history.length)} ms`
                  : '—'}
              </p>
              <p className="text-sm text-gray-400">Session Avg. Latency</p>
            </div>
          </div>
        </div>

        {/* Controls Panel */}
        <div className="space-y-4 overflow-y-auto pr-2 pb-4 font-sans">
          {/* Mode Switcher */}
          <div className="flex gap-2 p-1 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl">
            <button
              onClick={() => setDetectionMode('classes')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                detectionMode === 'classes'
                  ? 'bg-gradient-to-r from-[#00D4FF] to-[#0088FF] text-black shadow-lg shadow-[#00D4FF]/25'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Class Toggles
            </button>
            <button
              onClick={() => setDetectionMode('phrase')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                detectionMode === 'phrase'
                  ? 'bg-gradient-to-r from-[#06D6A0] to-[#048A6A] text-black shadow-lg shadow-[#06D6A0]/25'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Phrase Grounding
            </button>
          </div>

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
                <select 
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(34,211,200,0.3)] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#22D3C8] cursor-pointer"
                >
                  <option className="bg-black text-white" value="groundingdino">Grounding DINO Swin-T</option>
                  <option className="bg-black text-white" value="florence2">Florence-2 VLM</option>
                </select>
              </div>

              {detectionMode === 'classes' && (
                <button
                  onClick={handleDetect}
                  disabled={isDetecting}
                  className="w-full py-2.5 mt-2 flex items-center justify-center gap-2 font-semibold rounded-lg text-sm transition-all duration-200 hover:opacity-90 active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #00D4FF, #0088FF)', border: '1px solid rgba(0,212,255,0.3)', color: '#000' }}
                >
                  <Target className="w-4 h-4" />
                  {isDetecting ? "Detecting..." : "Run Detection"}
                </button>
              )}
            </div>
          </div>

          {/* Class Filter */}
          {detectionMode === 'classes' && (
            <div className="premium-card p-4 animate-fade-in">
              <h3 className="text-lg font-semibold text-white mb-3">Object Classes</h3>
              <div className="space-y-2">
                {objectClasses.map(cls => {
                  const isEnabled = enabledClasses[cls.name];
                  return (
                    <div
                      key={cls.id}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                        isEnabled
                          ? 'bg-[rgba(255,255,255,0.05)] border border border-[#00D4FF]/30'
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
                          ? 'bg-[rgba(255,255,255,0.05)] border border border-[#00D4FF]/30'
                          : 'bg-[rgba(0,0,0,0.3)] border border-transparent opacity-50'
                      }`}
                      style={justAdded === cls.name ? { backgroundColor: `${cls.color}18`, borderColor: cls.color } : {}}
                      onClick={() => toggleClass(cls.name)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cls.color }}></div>
                        <span className="text-white">{cls.name}</span>
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
                  <Sparkles className="w-3.5 h-3.5 text-[#00D4FF]" />
                  <span className="text-xs text-[#00D4FF]" style={{ letterSpacing: '0.05em' }}>✨ Add Custom Class Toggle</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newClassInput}
                    onChange={(e) => setNewClassInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddClass()}
                    placeholder="Enter new custom class..."
                    className="flex-1 rounded-lg px-3 py-2 text-white placeholder-[#444] text-sm focus:outline-none focus:ring-1 focus:ring-[#00D4FF]/50 min-w-0"
                    style={{ backgroundColor: '#1a1a1a', border: '1px solid #2e2e2e' }}
                  />
                  <button
                    onClick={handleAddClass}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-white transition-all duration-200 hover:opacity-90 active:scale-95 whitespace-nowrap"
                    style={{ background: 'linear-gradient(135deg, #00D4FF, #0088FF)', border: '1px solid rgba(0,212,255,0.3)', color: '#000' }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Class
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Phrase Grounding Mode Panel */}
          {detectionMode === 'phrase' && (
            <div className="premium-card p-4 animate-fade-in">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#06D6A0]" />
                Phrase Grounding
              </h3>
              <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                Type any natural language description (e.g. <strong>"person in white shirt"</strong>, <strong>"the silver laptop"</strong>, or <strong>"Burhan student card"</strong>) to ground and locate it on the image using the open-vocabulary parser.
              </p>
              <div className="space-y-3">
                <input
                  type="text"
                  value={phraseInput}
                  onChange={(e) => setPhraseInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleDetect()}
                  placeholder="e.g. person in white..."
                  className="w-full rounded-lg px-3 py-2.5 text-white placeholder-[#444] text-sm focus:outline-none focus:ring-1 focus:ring-[#06D6A0]/50"
                  style={{ backgroundColor: '#1a1a1a', border: '1px solid #2e2e2e' }}
                />
                <button
                  onClick={handleDetect}
                  disabled={isDetecting}
                  className="w-full py-2.5 flex items-center justify-center gap-2 font-semibold rounded-lg text-sm transition-all duration-200 hover:opacity-90 active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #06D6A0, #048A6A)', border: '1px solid rgba(6,214,160,0.3)', color: '#000' }}
                >
                  <Sparkles className="w-4 h-4" />
                  {isDetecting ? "Grounding..." : "Detect Phrase"}
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="premium-card p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Actions</h3>
            <div className="space-y-2">
              <button onClick={handleExport} className="w-full btn-primary py-2 text-sm flex items-center justify-center gap-2">
                <Download className="w-4 h-4" />
                Export Results
              </button>
              <button onClick={handleSaveConfig} className="w-full btn-secondary py-2 text-sm">
                Save Configuration
              </button>
              <button onClick={handleResetSettings} className="w-full btn-secondary py-2 text-sm">
                Reset Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}