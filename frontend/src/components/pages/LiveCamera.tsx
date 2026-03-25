import { useState } from 'react';
import { Video, Play, Pause, Square, Upload, Settings, Camera } from 'lucide-react';

export default function LiveCamera() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [fps, setFps] = useState(0);
  const [resolution, setResolution] = useState('1920x1080');
  const [detectionTargets, setDetectionTargets] = useState('');
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.5);
  const [useHybrid, setUseHybrid] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileUpload = () => {
    if (uploadProgress > 0) return;
    setUploadProgress(1);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setUploadProgress(0), 1000);
          return 100;
        }
        return prev + 15;
      });
    }, 200);
  };

  const handleStartStop = () => {
    if (isStreaming) {
      setIsStreaming(false);
      setFps(0);
    } else {
      setIsStreaming(true);
      // Simulate FPS
      setFps(58);
    }
  };

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Video className="w-8 h-8 text-[#FF0040]" strokeWidth={2} />
          <h1 className="text-4xl font-bold text-white">Live Camera Feed</h1>
        </div>
        <p className="text-gray-400">Real-time video stream with AI detection</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Video Feed */}
        <div className="lg:col-span-2 space-y-6">
          {/* Camera View */}
          <div className="premium-card p-6">
            <div className="aspect-video bg-black rounded-lg relative overflow-hidden border-2 border-[rgba(220,20,60,0.3)]">
              {isStreaming ? (
                <div className="w-full h-full flex items-center justify-center relative">
                  {/* Simulated Camera Feed */}
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black"></div>
                  <div className="relative z-10 text-center">
                    <div className="animate-pulse">
                      <Camera className="w-16 h-16 text-[#FF0040] mx-auto mb-4" />
                      <p className="text-white">Camera Stream Active</p>
                      <p className="text-sm text-gray-400 mt-2">FPS: {fps}</p>
                    </div>
                  </div>
                  
                  {/* Live Indicator */}
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-[#FF0040] px-3 py-1 rounded-full">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span className="text-white text-sm font-semibold">LIVE</span>
                  </div>

                  {/* Stats Overlay */}
                  <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-lg">
                    <p className="text-white text-sm">{resolution}</p>
                    <p className="text-[#39FF14] text-xs">{fps} FPS</p>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <Video className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500">Camera feed inactive</p>
                    <p className="text-sm text-gray-600 mt-2">Press Start to begin streaming</p>
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={handleStartStop}
                className={`btn-primary px-8 py-3 flex items-center gap-2 transition-all duration-300 ${
                  isStreaming ? 'bg-gradient-to-r from-red-600 to-red-800' : 'hover:shadow-[0_0_15px_rgba(220,20,60,0.6)] hover:scale-[1.02]'
                }`}
              >
                {isStreaming ? (
                  <>
                    <Pause className="w-5 h-5" />
                    Pause Stream
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Start Stream
                  </>
                )}
              </button>
              {isStreaming && (
                <button
                  onClick={() => {
                    setIsStreaming(false);
                    setFps(0);
                  }}
                  className="btn-secondary px-6 py-3 flex items-center gap-2"
                >
                  <Square className="w-5 h-5" />
                  Stop
                </button>
              )}
            </div>
          </div>

          {/* Upload Video Option */}
          <div className="premium-card p-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#00D4FF]" />
              Or Upload Video File
            </h3>
            <div 
              onClick={handleFileUpload}
              className={`border-2 border-dashed ${uploadProgress > 0 ? 'border-[#00D4FF] bg-[rgba(0,212,255,0.02)]' : 'border-[rgba(220,20,60,0.3)] hover:border-[#DC143C]'} rounded-lg p-8 text-center transition-all cursor-pointer relative overflow-hidden`}
            >
              {uploadProgress > 0 ? (
                <div className="relative z-10 flex flex-col items-center justify-center animate-pulse">
                  <p className="text-[#00D4FF] font-semibold mb-3">Uploading Video... {Math.min(uploadProgress, 100)}%</p>
                  <div className="w-full max-w-[200px] bg-black rounded-full h-1.5 border border-[#333] overflow-hidden">
                     <div className="bg-[#00D4FF] h-full rounded-full transition-all duration-200" style={{ width: `${Math.min(uploadProgress, 100)}%` }}></div>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-white mb-2">Drop video file here or click to browse</p>
                  <p className="text-sm text-gray-500">Supports MP4, AVI, MOV (max 500MB)</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Settings Panel */}
        <div className="space-y-6">
          {/* Camera Settings */}
          <div className="premium-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-400" />
                Camera Settings
              </h3>
              {/* Hybrid Logic Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-right leading-none">Use<br/>Hybrid</span>
                <button
                  onClick={() => setUseHybrid(!useHybrid)}
                  className={`w-9 h-5 rounded-full transition-all flex items-center px-0.5 ${useHybrid ? 'bg-[#DC143C]' : 'bg-gray-700'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${useHybrid ? 'translate-x-4' : 'translate-x-0'}`}></div>
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Resolution</label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(220,20,60,0.3)] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#DC143C]"
                >
                  <option className="bg-black text-white" value="640x480">640 × 480</option>
                  <option className="bg-black text-white" value="1280x720">1280 × 720 (HD)</option>
                  <option className="bg-black text-white" value="1920x1080">1920 × 1080 (Full HD)</option>
                  <option className="bg-black text-white" value="3840x2160">3840 × 2160 (4K)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Camera Source</label>
                <select className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(220,20,60,0.3)] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#DC143C]">
                  <option className="bg-black text-white">Built-in Camera</option>
                  <option className="bg-black text-white">External USB Camera</option>
                  <option className="bg-black text-white">IP Camera</option>
                  <option className="bg-black text-white">RTSP Stream</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Frame Rate Target</label>
                <select className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(220,20,60,0.3)] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#DC143C]">
                  <option className="bg-black text-white">30 FPS</option>
                  <option className="bg-black text-white">60 FPS</option>
                  <option className="bg-black text-white">120 FPS</option>
                  <option className="bg-black text-white">Max</option>
                </select>
              </div>
            </div>
          </div>

          {/* Smart Prompt */}
          <div className="premium-card p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Smart Prompt</h3>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={detectionTargets}
                  onChange={(e) => setDetectionTargets(e.target.value)}
                  placeholder="e.g., person, red car, safety vest..."
                  className="flex-1 rounded-lg px-3 py-2 text-white placeholder-[#444] text-sm focus:outline-none focus:ring-1 focus:ring-[#DC143C]/50"
                  style={{ backgroundColor: '#1a1a1a', border: '1px solid #2e2e2e' }}
                />
                <button
                  className="shrink-0 px-3 py-2 rounded-lg text-xs text-white transition-all duration-200 hover:opacity-90 active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #DC143C, #8B0000)', border: '1px solid rgba(220,20,60,0.3)' }}
                >
                  Apply Prompt
                </button>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm text-gray-400">Confidence Threshold</label>
                  <span className="text-xs font-mono bg-[#DC143C]/20 text-[#DC143C] px-2 py-0.5 rounded border border-[#DC143C]/30">
                    {confidenceThreshold.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                  className="w-full accent-[#DC143C]"
                />
              </div>
            </div>
          </div>

          {/* Stream Info */}
          <div className="premium-card p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Stream Info</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Status</span>
                <span className={isStreaming ? 'text-[#39FF14]' : 'text-gray-500'}>
                  {isStreaming ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Frame Rate</span>
                <span className="text-white">{fps} FPS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Resolution</span>
                <span className="text-white">{resolution}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-gray-400">Total Latency</span>
                <div className="text-right">
                  <span className="text-white block">{isStreaming ? '12ms' : '—'}</span>
                  {isStreaming && (
                    <div className="mt-2 text-xs space-y-1 text-left border-l-2 border-[rgba(255,255,255,0.1)] pl-2">
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500">Pre-processing</span>
                        <span className="text-[#00D4FF]">2ms</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500">Model Inference</span>
                        <span className="text-[#39FF14]">8ms</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500">NMS / Post</span>
                        <span className="text-[#FFD60A]">2ms</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Buffer</span>
                <span className="text-white">{isStreaming ? '2 frames' : '—'}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="premium-card p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full btn-secondary py-2 text-sm">
                Enable Detection
              </button>
              <button className="w-full btn-secondary py-2 text-sm">
                Start Tracking
              </button>
              <button className="w-full btn-secondary py-2 text-sm">
                Record Stream
              </button>
              <button className="w-full btn-secondary py-2 text-sm">
                Take Snapshot
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}