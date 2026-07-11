import { useState } from 'react';
import { MessageSquare, Send, Mic, Sparkles, Clock, CheckCircle2, Timer, BarChart2, Hash, ChevronDown, Cpu, Layers, HardHat, PaintBucket, Users, FileText, Terminal, Copy, Download, Camera } from 'lucide-react';

const sampleQueries = [
  {
    label: "Safety Check",
    text: "Are all workers wearing hard hats?",
    icon: HardHat,
    color: '#FFD60A',
    bg: 'rgba(255,214,10,0.1)',
    border: 'rgba(255,214,10,0.3)',
  },
  {
    label: "Segmentation",
    text: "Draw a mask for the blue car.",
    icon: PaintBucket,
    color: '#00FFFF',
    bg: 'rgba(0,255,255,0.1)',
    border: 'rgba(0,255,255,0.3)',
  },
  {
    label: "Object Count",
    text: "Count all people in the scene.",
    icon: Users,
    color: '#39FF14',
    bg: 'rgba(57,255,20,0.1)',
    border: 'rgba(57,255,20,0.3)',
  },
  {
    label: "Scene Description",
    text: "Describe the current activity.",
    icon: FileText,
    color: '#9D4EDD',
    bg: 'rgba(157,78,221,0.1)',
    border: 'rgba(157,78,221,0.3)',
  },
];

const vlmEngines = [
  { value: 'florence2', label: 'Florence-2' },
  { value: 'sam3', label: 'SAM 3' },
  { value: 'qwenvl', label: 'Qwen2.5-VL' },
  { value: 'owlv2', label: 'OWLv2' },
];

const vlmOutputEntries = [
  {
    frame: '0312',
    opacity: 0.78,
    segments: [
      { text: 'Based on the current frame, there are ' },
      { text: '8 people', color: '#FFFFFF' },
      { text: ' present in the scene. Person ID ' },
      { text: 'P001', color: '#FFD60A' },
      { text: ' appears to be missing a safety helmet, indicating a potential ' },
      { text: 'safety protocol violation', color: '#DC143C' },
      { text: '. Persons P002 through P007 are fully compliant with PPE requirements. All ' },
      { text: '3 vehicles', color: '#FFFFFF' },
      { text: ' detected are parked within designated zones.' },
    ],
  },
  {
    frame: '0298',
    opacity: 0.55,
    segments: [
      { text: 'Detected 1 forklift (' },
      { text: 'V003', color: '#39FF14' },
      { text: ') in motion near aisle B. Proximity alert: Person P004 is within ' },
      { text: '1.2 m', color: '#DC143C' },
      { text: ' of the active forklift path. Recommend issuing a spatial warning. Confidence score: ' },
      { text: '96.4%', color: '#FFFFFF' },
      { text: '.' },
    ],
  },
  {
    frame: '0281',
    opacity: 0.38,
    segments: [
      { text: 'Scene activity classified as ' },
      { text: 'active warehouse workflow', color: '#9D4EDD' },
      { text: '. Workers are predominantly engaged in loading tasks. No anomalous behaviour detected. Ambient lighting conditions: adequate. Model inference time: ' },
      { text: '118 ms', color: '#FFFFFF' },
      { text: '.' },
    ],
  },
];

const queryHistory = [
  {
    id: 1,
    query: "How many people are working?",
    answer: "3 people detected in working posture",
    timestamp: "2 min ago",
    objects: [
      { type: 'Person', id: 'P001', bbox: [120, 100, 80, 200] },
      { type: 'Person', id: 'P002', bbox: [400, 120, 75, 190] },
      { type: 'Person', id: 'P003', bbox: [650, 110, 82, 195] },
    ]
  },
  {
    id: 2,
    query: "Track a person carrying a bag",
    answer: "1 person with bag detected, tracking ID: P004",
    timestamp: "5 min ago",
    objects: [
      { type: 'Person', id: 'P004', bbox: [300, 150, 70, 180] },
      { type: 'Bag', id: 'B001', bbox: [320, 280, 30, 40] },
    ]
  },
  {
    id: 3,
    query: "Detect all red objects",
    answer: "2 red objects found: 1 vehicle, 1 clothing item",
    timestamp: "12 min ago",
    objects: [
      { type: 'Vehicle', id: 'V001', bbox: [500, 300, 150, 100] },
    ]
  },
];

const BACKEND = 'http://localhost:8000';

export default function VisionLanguage() {
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentResult, setCurrentResult] = useState<any | null>(null);
  const [activeEngine, setActiveEngine] = useState('florence2');
  const [viewMode, setViewMode] = useState('annotated');
  const [isListening, setIsListening] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setImagePreviewUrl(URL.createObjectURL(file));
      setCurrentResult(null);
      setApiError(null);
    }
  };

  const handleSubmit = async (queryText: string) => {
    if (!selectedImage) {
      setApiError('Please upload an image first using the camera icon below the query input.');
      return;
    }
    setIsProcessing(true);
    setApiError(null);
    setQuery('');

    const formData = new FormData();
    formData.append('image', selectedImage);
    formData.append('query', queryText);

    try {
      const res = await fetch(`${BACKEND}/api/vision/query`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Backend error ${res.status}: ${errText}`);
      }
      const data = await res.json();
      setCurrentResult(data);
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || 'Failed to reach backend. Is it running on port 8000?');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <MessageSquare className="w-8 h-8 text-[#00FFFF]" strokeWidth={2} />
          <h1 className="text-4xl font-bold text-white">Vision-Language Query</h1>
        </div>
        <p className="text-gray-400">Ask questions in natural language about the scene</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="premium-card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(0,255,255,0.12)', border: '1px solid rgba(0,255,255,0.2)' }}>
            <Timer className="w-6 h-6 text-[#00FFFF]" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">VLM Inference Time</p>
            <p className="text-3xl font-bold text-white">1.4<span className="text-base text-gray-400 ml-1">s</span></p>
            <p className="text-xs text-[#39FF14] mt-0.5">↓ 12% vs last session</p>
          </div>
        </div>
        <div className="premium-card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(220,20,60,0.12)', border: '1px solid rgba(220,20,60,0.2)' }}>
            <BarChart2 className="w-6 h-6 text-[#DC143C]" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Stream Latency</p>
            <p className="text-3xl font-bold text-white">120<span className="text-base text-gray-400 ml-1">ms</span></p>
            <p className="text-xs text-[#39FF14] mt-0.5">↓ Optimal range</p>
          </div>
        </div>
        <div className="premium-card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(157,78,221,0.12)', border: '1px solid rgba(157,78,221,0.2)' }}>
            <Hash className="w-6 h-6 text-[#9D4EDD]" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Total Queries</p>
            <p className="text-3xl font-bold text-white">248</p>
            <p className="text-xs text-gray-500 mt-0.5">This session</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Control Bar */}
          <div className="premium-card px-5 py-3 flex items-center gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Cpu className="w-4 h-4 text-[#00FFFF] shrink-0" />
              <span className="text-xs text-gray-400 shrink-0">Active Engine</span>
              <div className="relative flex-1">
                <select
                  value={activeEngine}
                  onChange={(e) => setActiveEngine(e.target.value)}
                  className="w-full appearance-none bg-[rgba(255,255,255,0.05)] border border-[rgba(0,255,255,0.25)] rounded-lg pl-3 pr-8 py-1.5 text-white text-sm focus:outline-none focus:border-[#00FFFF] cursor-pointer"
                >
                  {vlmEngines.map((engine) => (
                    <option key={engine.value} className="bg-black" value={engine.value}>{engine.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div className="w-px h-6 bg-[#222]" />
            <div className="flex items-center gap-2 flex-1">
              <Layers className="w-4 h-4 text-[#9D4EDD] shrink-0" />
              <span className="text-xs text-gray-400 shrink-0">View Mode</span>
              <div className="relative flex-1">
                <select
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value)}
                  className="w-full appearance-none bg-[rgba(255,255,255,0.05)] border border-[rgba(157,78,221,0.25)] rounded-lg pl-3 pr-8 py-1.5 text-white text-sm focus:outline-none focus:border-[#9D4EDD] cursor-pointer"
                >
                  <option className="bg-black" value="annotated">Annotated</option>
                  <option className="bg-black" value="raw">Raw Feed</option>
                  <option className="bg-black" value="heatmap">Heatmap</option>
                  <option className="bg-black" value="segmented">Segmented</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: 'rgba(57,255,20,0.1)', border: '1px solid rgba(57,255,20,0.25)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#39FF14] animate-pulse" />
              <span className="text-xs text-[#39FF14]">Live</span>
            </div>
          </div>

          {/* Visual Result Area */}
          <div className="premium-card p-6">
            {/* Image Preview */}
            <div className="aspect-video bg-black rounded-lg relative overflow-hidden border-2 border-[rgba(0,255,255,0.3)] mb-2">
              {imagePreviewUrl ? (
                <img src={imagePreviewUrl} alt="Query image" className="w-full h-full object-contain" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-900 to-black flex items-center justify-center">
                  <p className="text-gray-500 text-sm">Upload an image to query</p>
                </div>
              )}
              {/* Bbox overlays using normalized coords scaled to container */}
              {currentResult && currentResult.objects && currentResult.objects.map((obj: any, idx: number) => (
                <div
                  key={idx}
                  className="absolute"
                  style={{
                    left: `${(obj.normalized_bbox?.[0] ?? 0) * 100}%`,
                    top: `${(obj.normalized_bbox?.[1] ?? 0) * 100}%`,
                    width: `${((obj.normalized_bbox?.[2] ?? 0) - (obj.normalized_bbox?.[0] ?? 0)) * 100}%`,
                    height: `${((obj.normalized_bbox?.[3] ?? 0) - (obj.normalized_bbox?.[1] ?? 0)) * 100}%`,
                    border: `3px solid ${obj.color ?? '#00FFFF'}`,
                    boxShadow: `0 0 20px ${obj.color ?? '#00FFFF'}80`,
                    borderRadius: '4px',
                    pointerEvents: 'none',
                  }}
                >
                  <div className="absolute -top-6 left-0 px-2 py-0.5 rounded text-xs font-bold text-black" style={{ background: obj.color ?? '#00FFFF' }}>
                    {obj.type} {Math.round((obj.confidence ?? 0) * 100)}%
                  </div>
                </div>
              ))}
              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#00FFFF]" />
                  <p className="text-[#00FFFF] text-xs font-semibold">
                    {isProcessing ? 'Querying backend...' : currentResult ? `Task: ${currentResult.task?.toUpperCase()}` : 'VLM Ready'}
                  </p>
                </div>
              </div>
              {isProcessing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                  <div className="bg-black/80 rounded-2xl p-8 text-center">
                    <div className="w-16 h-16 border-4 border-[#00FFFF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-[#00FFFF] font-semibold">Querying backend...</p>
                    <p className="text-gray-400 text-sm mt-1">Parser → Detector → Composer</p>
                  </div>
                </div>
              )}
            </div>
            {/* Image upload button */}
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer hover:text-white transition-colors mb-1">
              <Camera className="w-4 h-4" />
              <span>{selectedImage ? `Image: ${selectedImage.name}` : 'Upload image to query'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
            {/* Error display */}
            {apiError && (
              <div className="mt-2 p-3 rounded-lg bg-[rgba(220,20,60,0.15)] border border-[#DC143C] text-[#DC143C] text-xs">
                {apiError}
              </div>
            )}
            {currentResult && !isProcessing && (
              <div className="mt-3 p-4 rounded-lg bg-[rgba(0,255,255,0.1)] border border-[#00FFFF]">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#00FFFF] mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-white font-semibold mb-1">{currentResult.answer}</p>
                    <p className="text-xs text-gray-400">Query: "{currentResult.query}"</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Objects: {currentResult.objects?.length ?? 0} · Total: {currentResult.total_ms?.toFixed(0)}ms (parser: {currentResult.parser_ms?.toFixed(0)}ms · infer: {currentResult.inference_ms?.toFixed(0)}ms)
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Query Input */}
          <div className="premium-card p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Ask a Question</h3>
            <div className="flex gap-3 mb-4">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && query.trim() && handleSubmit(query)}
                placeholder="e.g., How many people are in the scene?"
                className="flex-1 bg-[rgba(255,255,255,0.05)] border border-[rgba(0,255,255,0.3)] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#00FFFF]"
                disabled={isProcessing}
              />
              <button
                onClick={() => query.trim() && handleSubmit(query)}
                disabled={!query.trim() || isProcessing}
                className="btn-primary px-6 py-3 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
              <button 
                className={`px-6 py-3 rounded-lg flex items-center justify-center transition-all ${isListening ? 'bg-[#DC143C]/20 border border-[#DC143C] text-[#DC143C] animate-pulse shadow-[0_0_15px_rgba(220,20,60,0.4)]' : 'btn-secondary text-gray-300'}`}
                onClick={() => setIsListening(!isListening)}
                disabled={isProcessing}
                title={isListening ? "Listening... Click to stop" : "Talk to Camera"}
              >
                <Mic className="w-5 h-5" />
              </button>
            </div>
            {/* Suggested Queries */}
            <div>
              <p className="text-sm text-gray-400 mb-3">Suggested Queries:</p>
              <div className="grid grid-cols-2 gap-2">
                {sampleQueries.map((sample, idx) => {
                  const Icon = sample.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSubmit(sample.text)}
                      disabled={isProcessing}
                      className="flex items-start gap-2 px-3 py-2.5 text-left rounded-lg border transition-all disabled:opacity-50 hover:brightness-125"
                      style={{ background: sample.bg, borderColor: sample.border, boxShadow: `0 0 12px ${sample.bg}` }}
                    >
                      <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: sample.color }} />
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-widest mb-0.5" style={{ color: sample.color }}>{sample.label}</p>
                        <p className="text-white text-xs leading-snug">{sample.text}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* VLM Analysis Output — wide panel replacing the old 4-button grid */}
          <div className="premium-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Terminal className="w-5 h-5 text-[#00FFFF]" />
              <h3 className="text-xl font-semibold text-white">
                VLM Analysis Output{' '}
                <span className="text-gray-500 text-sm font-normal">(Raw Text)</span>
              </h3>
              <div className="ml-auto flex items-center gap-3">
                <button className="p-1.5 text-gray-400 hover:text-white transition-colors" title="Copy to Clipboard">
                  <Copy className="w-4 h-4" />
                </button>
                <button className="p-1.5 text-gray-400 hover:text-white transition-colors" title="Download Log">
                  <Download className="w-4 h-4" />
                </button>
                <span
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs shrink-0"
                  style={{ background: 'rgba(57,255,20,0.08)', border: '1px solid rgba(57,255,20,0.2)', color: '#39FF14' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#39FF14] animate-pulse inline-block" />
                  Live Output
                </span>
              </div>
            </div>
            <div
              className="overflow-y-auto rounded-lg p-4 space-y-4"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(0,255,255,0.12)',
                maxHeight: '210px',
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(0,255,255,0.25) transparent',
              }}
            >
              {vlmOutputEntries.map((entry, idx) => (
                <p key={idx} className="text-sm leading-relaxed" style={{ color: `rgba(220,220,230,${entry.opacity})`, fontFamily: 'monospace' }}>
                  <span className="text-[#00FFFF] mr-2" style={{ opacity: 0.65 }}>[Frame {entry.frame}]</span>
                  {entry.segments.map((seg, si) =>
                    seg.color
                      ? <span key={si} style={{ color: seg.color }}>{seg.text}</span>
                      : <span key={si}>{seg.text}</span>
                  )}
                </p>
              ))}
            </div>
          </div>

        </div>

        {/* Right Panel */}
        <div className="space-y-6">
          {/* VLM Info */}
          <div className="premium-card p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Model Info</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Model</span>
                <span className="text-white">{vlmEngines.find(e => e.value === activeEngine)?.label ?? 'Florence-2'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Status</span>
                <span className="text-[#39FF14]">Active</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Context Window</span>
                <span className="text-white">8K tokens</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Accuracy</span>
                <span className="text-white">94.2%</span>
              </div>
            </div>
          </div>

          {/* Query History */}
          <div className="premium-card p-6 max-h-[600px] overflow-y-auto">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#06D6A0]" />
              Query History
            </h3>
            <div className="space-y-4">
              {queryHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(0,255,255,0.2)] hover:border-[#00FFFF] transition-all cursor-pointer flex gap-4 group"
                  onClick={() => setCurrentResult(item)}
                >
                  {/* Thumbnail Placeholder */}
                  <div className="w-16 h-16 rounded bg-gray-800 border border-gray-700 shrink-0 overflow-hidden relative group-hover:border-[#00FFFF]/50 transition-colors">
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Camera className="w-5 h-5 text-gray-500 group-hover:text-[#00FFFF] opacity-50 transition-colors" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1">
                      <MessageSquare className="w-3.5 h-3.5 text-[#00FFFF] mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-white text-sm font-semibold truncate leading-tight">{item.query}</p>
                        <p className="text-gray-400 text-xs line-clamp-1 mt-0.5">{item.answer}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-[rgba(255,255,255,0.1)]">
                      <span className="text-[10px] text-gray-500">{item.timestamp}</span>
                      <span className="text-[10px] text-[#00FFFF] bg-[#00FFFF]/10 px-2 py-0.5 rounded-full border border-[#00FFFF]/20">
                        {item.objects.length} target{item.objects.length !== 1 ? 's' : ''}
                      </span>
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
              <button className="w-full btn-primary py-2 text-sm">Export Results</button>
              <button className="w-full btn-secondary py-2 text-sm">Save Query</button>
              <button className="w-full btn-secondary py-2 text-sm">Clear History</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
