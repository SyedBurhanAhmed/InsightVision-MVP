import { useState, useRef, useEffect } from 'react';
import { 
  Upload, Play, Square, Send, Camera, Tv, Cpu, MessageSquare, 
  Activity, ShieldAlert, CheckCircle2, RefreshCw, ListFilter,
  Target, Clock, Shield, HardDrive, Terminal
} from 'lucide-react';

interface Track {
  track_id: number;
  label: string;
  bbox: [number, number, number, number];
  confidence: number;
  backend: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'system';
  type: 'command' | 'status' | 'result' | 'error';
  text: string;
  timestamp: string;
}

const PRE_SAVED_CAMERAS = [
  { name: 'Lab Cam 1 - Front Entrance', url: 'rtsp://192.168.1.50/stream1' },
  { name: 'Lab Cam 2 - Server Rack GPU', url: 'rtsp://192.168.1.51/stream1' },
  { name: 'Lab Cam 3 - Assembly Line', url: 'rtsp://192.168.1.52/stream1' },
];

const recentActivity = [
  { id: 1, action: 'Live tracking session initialized', time: '2 minutes ago', type: 'camera' },
  { id: 2, action: 'VLM OCR query resolved', time: '15 minutes ago', type: 'query' },
  { id: 3, action: 'Grounding DINO target lock-on', time: '1 hour ago', type: 'lock-on' },
  { id: 4, action: 'SAM 3 mask segments computed', time: '3 hours ago', type: 'segment' },
];

export default function Dashboard() {
  const [sourceMode, setSourceMode] = useState<'upload' | 'webcam' | 'rtsp'>('upload');
  const [localizer, setLocalizer] = useState<'grounding_dino' | 'sam3'>('grounding_dino');
  
  // File upload state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoSrc, setVideoSrc] = useState<string>('');

  // RTSP state
  const [rtspUrl, setRtspUrl] = useState(PRE_SAVED_CAMERAS[0].url);
  const [customRtsp, setCustomRtsp] = useState('');

  // Connection/Session state
  const [connState, setConnState] = useState<'DISCONNECTED' | 'CONNECTING' | 'READY' | 'CLOSED'>('DISCONNECTED');
  const [command, setCommand] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [latestTracks, setLatestTracks] = useState<Track[]>([]);
  const [frameCounter, setFrameCounter] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const frameSeqRef = useRef<number>(0);
  const isWaitingForAckRef = useRef<boolean>(false);
  const latestTracksRef = useRef<Track[]>([]);
  const isSessionActiveRef = useRef<boolean>(false);
  const lastFrameTimeRef = useRef<number>(0);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const gpuUsage = 78; // static mock value
  const getGpuColor = (usage: number) => {
    if (usage < 60) return 'from-primary to-[#0891B2]';
    if (usage <= 85) return 'from-warning to-[#D97706]';
    return 'from-destructive to-[#B91C1C]';
  };

  // Auto scroll to chat bottom inside container (prevents window jumping)
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Clean up session on unmount
  useEffect(() => {
    return () => {
      isSessionActiveRef.current = false;
      if (wsRef.current) {
        wsRef.current.close();
      }
      stopWebcamTracks();
    };
  }, []);

  // Listen for video seeked event to feed the next frame (upload mode)
  useEffect(() => {
    const video = videoRef.current;
    if (video && sourceMode === 'upload') {
      const onSeeked = () => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && !isWaitingForAckRef.current && isSessionActiveRef.current) {
          sendNextFrame();
        }
      };
      video.addEventListener('seeked', onSeeked);
      return () => {
        video.removeEventListener('seeked', onSeeked);
      };
    }
  }, [videoSrc, sourceMode]);

  // Frame processing loop & canvas scaling
  useEffect(() => {
    let animationFrameId: number;

    const renderLoop = () => {
      const video = videoRef.current;
      const canvas = overlayCanvasRef.current;
      if (video && canvas && sourceMode !== 'rtsp') {
        const rect = video.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Draw all active tracks
          latestTracksRef.current.forEach((t) => {
            const [x, y, w, h] = t.bbox;
            const videoW = video.videoWidth || 640;
            const videoH = video.videoHeight || 480;

            const scaleX = canvas.width / videoW;
            const scaleY = canvas.height / videoH;

            const cx = x * scaleX;
            const cy = y * scaleY;
            const cw = w * scaleX;
            const ch = h * scaleY;

            // Draw bounding box outline
            ctx.strokeStyle = '#06B6D4'; // SOTA primary cyan accent
            ctx.lineWidth = 2.5;
            ctx.strokeRect(cx, cy, cw, ch);

            // Draw clean tag above box
            const tagText = `${t.label} #${t.track_id} (${t.confidence.toFixed(2)})`;
            ctx.font = '500 11px Inter, sans-serif';
            const textWidth = ctx.measureText(tagText).width;
            
            // Tag Background
            ctx.fillStyle = 'rgba(8, 12, 20, 0.85)';
            ctx.fillRect(cx, cy - 22, textWidth + 12, 22);

            // Tag Accent Border Left
            ctx.fillStyle = '#06B6D4';
            ctx.fillRect(cx, cy - 22, 3, 22);

            // Tag Text
            ctx.fillStyle = '#F8FAFC';
            ctx.fillText(tagText, cx + 8, cy - 7);
          });
        }
      }
      animationFrameId = requestAnimationFrame(renderLoop);
    };

    renderLoop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [sourceMode]);

  const stopWebcamTracks = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setLatestTracks([]);
      latestTracksRef.current = [];
      setMessages([]);
      stopWebcamTracks();
      if (wsRef.current) {
        isSessionActiveRef.current = false;
        wsRef.current.close();
      }
      setConnState('DISCONNECTED');
    }
  };

  const addSystemMessage = (type: ChatMessage['type'], text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        sender: 'system',
        type,
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      }
    ]);
  };

  const startSession = async () => {
    if (sourceMode === 'upload' && !videoFile) return;

    setConnState('CONNECTING');
    setLatestTracks([]);
    latestTracksRef.current = [];
    frameSeqRef.current = 0;
    setFrameCounter(0);
    isWaitingForAckRef.current = false;
    isSessionActiveRef.current = true;
    lastFrameTimeRef.current = performance.now();

    // Configure local webcam
    if (sourceMode === 'webcam') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
          };
        }
      } catch (err) {
        console.error('Webcam access error:', err);
        addSystemMessage('error', 'Failed to access webcam. Please check permissions.');
        setConnState('DISCONNECTED');
        return;
      }
    } else if (sourceMode === 'upload' && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }

    // Connect WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:8000/ws/session`;
    
    addSystemMessage('status', `Connecting WebSocket session to ${localizer === 'sam3' ? 'SAM 3' : 'Grounding DINO'}...`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      const initPayload = {
        type: 'init',
        source: sourceMode === 'webcam' ? 'upload' : sourceMode,
        localizer: localizer,
        conf: 0.35,
        fps: 25.0,
        url: sourceMode === 'rtsp' ? (customRtsp.trim() || rtspUrl) : undefined
      };
      ws.send(JSON.stringify(initPayload));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === 'session_ready') {
        setConnState('READY');
        setSessionId(msg.session_id);
        isSessionActiveRef.current = true;
        addSystemMessage('status', `Connected. Live tracking session [${msg.session_id}] is active.`);
        
        if (sourceMode !== 'rtsp') {
          sendNextFrame();
        }
      } else if (msg.type === 'frame_update') {
        const tracks = msg.tracks || [];
        latestTracksRef.current = tracks;
        setLatestTracks(tracks);
        setFrameCounter(msg.frame_idx);
        isWaitingForAckRef.current = false;

        if (sourceMode === 'webcam') {
          setTimeout(() => {
            if (isSessionActiveRef.current) {
              sendNextFrame();
            }
          }, 40);
        } else if (sourceMode === 'upload') {
          const now = performance.now();
          const elapsed = now - lastFrameTimeRef.current;
          const targetInterval = 1000 / 25; // 40ms
          const delay = Math.max(0, targetInterval - elapsed);

          setTimeout(() => {
            if (videoRef.current && !videoRef.current.ended && isSessionActiveRef.current) {
              lastFrameTimeRef.current = performance.now();
              videoRef.current.currentTime += 0.04;
            } else if (videoRef.current && videoRef.current.ended) {
              stopSession();
            }
          }, delay);
        }
      } else if (msg.type === 'response') {
        if (msg.summary) {
          addSystemMessage('status', msg.summary);
        }
      } else if (msg.type === 'query_result') {
        addSystemMessage('result', `${msg.data.result || JSON.stringify(msg.data)} (${msg.latency_ms}ms)`);
      } else if (msg.type === 'error') {
        addSystemMessage('error', `Error (${msg.code}): ${msg.detail || ''}`);
        if (msg.code === 'camera_disconnected' || msg.code === 'reconnect_failed') {
          stopSession();
        }
      }
    };

    ws.onclose = () => {
      setConnState('CLOSED');
      isSessionActiveRef.current = false;
      addSystemMessage('status', 'Tracking session closed.');
      stopWebcamTracks();
      if (videoRef.current && sourceMode === 'upload') {
        videoRef.current.pause();
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      addSystemMessage('error', 'WebSocket connection failed.');
      setConnState('CLOSED');
      isSessionActiveRef.current = false;
      stopWebcamTracks();
    };
  };

  const sendNextFrame = () => {
    const video = videoRef.current;
    const ws = wsRef.current;
    if (!video || !ws || ws.readyState !== WebSocket.OPEN || isWaitingForAckRef.current || !isSessionActiveRef.current) {
      return;
    }
    if (sourceMode === 'upload' && video.ended) {
      return;
    }

    const offscreen = document.createElement('canvas');
    offscreen.width = video.videoWidth || 640;
    offscreen.height = video.videoHeight || 480;
    const ctx = offscreen.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, offscreen.width, offscreen.height);
      const dataUrl = offscreen.toDataURL('image/jpeg', 0.65);
      const base64Data = dataUrl.split(',')[1];

      isWaitingForAckRef.current = true;
      ws.send(
        JSON.stringify({
          type: 'frame',
          data: base64Data,
          seq: frameSeqRef.current++,
        })
      );
    }
  };

  const stopSession = () => {
    isSessionActiveRef.current = false;
    if (wsRef.current) {
      wsRef.current.close();
    }
    stopWebcamTracks();
    setConnState('DISCONNECTED');
  };

  const sendCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    setMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        sender: 'user',
        type: 'command',
        text: command.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      }
    ]);

    wsRef.current.send(
      JSON.stringify({
        type: 'command',
        text: command.trim(),
      })
    );
  };

  return (
    <div className="min-h-screen p-8 max-w-7xl mx-auto text-white">
      {/* SOTA Futuristic Entry Portal Header */}
      <div className="border border-slate-800/80 bg-slate-950/40 rounded-3xl p-8 mb-8 relative overflow-hidden backdrop-blur-md">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.06)_0%,transparent_60%)]" />
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold font-mono tracking-widest text-[#06B6D4] uppercase">
              <Terminal className="w-4 h-4 text-[#06B6D4] animate-pulse" />
              SYSTEM PORTAL ACTIVE // CORE NODE 01
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white">InsightVision Control Bridge</h1>
            <p className="text-slate-400 text-sm max-w-xl">
              Gateway to real-time offline feature localization (DINO/SAM3) and interactive multi-object visual query tracking.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800/80 px-4 py-2.5 rounded-xl">
              <span className={`w-2 h-2 rounded-full ${
                connState === 'READY' ? 'bg-[#06B6D4] animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.6)]' :
                connState === 'CONNECTING' ? 'bg-amber-500 animate-pulse' : 'bg-slate-500'
              }`} />
              <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-slate-300">
                PORTAL: {connState} {sessionId && `(${sessionId})`}
              </span>
            </div>
            <div className="bg-primary/5 border border-primary/20 text-primary px-4 py-2.5 rounded-xl flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider">ACADEMIC SECURE</span>
            </div>
          </div>
        </div>
      </div>

      {/* SOTA Dynamic Telemetry Entry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* Card 1: Localizer Engine */}
        <div className="premium-card p-6 relative overflow-hidden group hover:border-[#06B6D4]/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.04)_0%,transparent_70%)]" />
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs uppercase font-mono font-bold text-slate-500 tracking-wider mb-1">Localizer Engine</p>
              <h3 className="text-lg font-bold text-white leading-none">{localizer === 'sam3' ? 'SAM 3 Model' : 'Grounding DINO'}</h3>
            </div>
            <Cpu className="w-6 h-6 text-primary group-hover:rotate-12 transition-transform" />
          </div>
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mt-2">
            <span>Precision Layer:</span>
            <span className="text-primary font-bold">{localizer === 'sam3' ? 'Instance Mask' : 'Bounding Box'}</span>
          </div>
        </div>

        {/* Card 2: Telemetry Node */}
        <div className="premium-card p-6 relative overflow-hidden group hover:border-[#06B6D4]/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.04)_0%,transparent_70%)]" />
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs uppercase font-mono font-bold text-slate-500 tracking-wider mb-1">Active Bounding Boxes</p>
              <h3 className="text-3xl font-extrabold text-white">{latestTracks.length}</h3>
            </div>
            <Target className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mt-2">
            <span>Tracking Rate:</span>
            <span className="text-primary font-bold">25 FPS</span>
          </div>
        </div>

        {/* Card 3: Reasoning Core */}
        <div className="premium-card p-6 relative overflow-hidden group hover:border-[#06B6D4]/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.04)_0%,transparent_70%)]" />
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs uppercase font-mono font-bold text-slate-500 tracking-wider mb-1">VLM Agent Core</p>
              <h3 className="text-lg font-bold text-white leading-none">Qwen2.5-VL / Florence</h3>
            </div>
            <MessageSquare className="w-6 h-6 text-primary group-hover:-translate-y-1 transition-transform" />
          </div>
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mt-2">
            <span>VLM Success Rate:</span>
            <span className="text-primary font-bold">94%</span>
          </div>
        </div>

        {/* Card 4: GPU Utilization */}
        <div className="premium-card p-6 relative overflow-hidden group hover:border-[#06B6D4]/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.04)_0%,transparent_70%)]" />
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs uppercase font-mono font-bold text-slate-500 tracking-wider mb-1">Hardware Engine</p>
              <h3 className="text-lg font-bold text-white leading-none font-sans">RTX 4090 Edge</h3>
            </div>
            <HardDrive className="w-6 h-6 text-primary group-hover:pulse transition-transform" />
          </div>
          <div className="w-full mt-2">
            <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
              <span>VRAM Alloc:</span>
              <span className={gpuUsage < 60 ? 'text-primary' : gpuUsage <= 85 ? 'text-warning' : 'text-destructive'}>6.2/8 GB ({gpuUsage}%)</span>
            </div>
            <div className="w-full bg-slate-900 border border-slate-800/80 rounded-full h-1.5">
              <div className={`bg-gradient-to-r ${getGpuColor(gpuUsage)} h-1.5 rounded-full`} style={{ width: `${gpuUsage}%` }}></div>
            </div>
          </div>
        </div>

      </div>

      {/* Live Workspace Container (Full Width / Prompt Below Video) */}
      <div className="premium-card p-8 mb-8 space-y-6">
        
        {/* SOTA Segmented Source Mode Selectors */}
        <div className="flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center pb-6 border-b border-slate-800/55">
          
          {/* Camera Source Selector */}
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 flex items-center gap-1.5">
              <Camera className="w-3 h-3 text-slate-400" />
              Capture Source
            </span>
            <div className="inline-flex bg-slate-950 p-1.5 rounded-xl border border-slate-800/60 w-full sm:w-auto">
              <button
                onClick={() => { setSourceMode('upload'); stopSession(); }}
                disabled={connState === 'READY' || connState === 'CONNECTING'}
                className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  sourceMode === 'upload' ? 'bg-primary text-black shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Upload Video
              </button>
              <button
                onClick={() => { setSourceMode('webcam'); stopSession(); }}
                disabled={connState === 'READY' || connState === 'CONNECTING'}
                className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  sourceMode === 'webcam' ? 'bg-primary text-black shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Webcam
              </button>
              <button
                onClick={() => { setSourceMode('rtsp'); stopSession(); }}
                disabled={connState === 'READY' || connState === 'CONNECTING'}
                className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  sourceMode === 'rtsp' ? 'bg-primary text-black shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                RTSP Stream
              </button>
            </div>
          </div>

          {/* Localizer Backend Selector */}
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 flex items-center gap-1.5">
              <Cpu className="w-3 h-3 text-slate-400" />
              Active Localizer
            </span>
            <div className="inline-flex bg-slate-950 p-1.5 rounded-xl border border-slate-800/60 w-full sm:w-auto">
              <button
                onClick={() => setLocalizer('grounding_dino')}
                disabled={connState === 'READY' || connState === 'CONNECTING'}
                className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  localizer === 'grounding_dino' ? 'bg-primary text-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                Grounding DINO
              </button>
              <button
                onClick={() => setLocalizer('sam3')}
                disabled={connState === 'READY' || connState === 'CONNECTING'}
                className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  localizer === 'sam3' ? 'bg-primary text-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                SAM 3
              </button>
            </div>
          </div>

        </div>

        {/* Dynamic Camera Configuration Area */}
        {sourceMode === 'upload' && !videoSrc && (
          <div className="border border-dashed border-slate-800 rounded-2xl aspect-video flex flex-col justify-center items-center text-slate-500 bg-slate-950/40 p-8">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-4">
              <Upload className="w-6 h-6 text-slate-400" />
            </div>
            <label className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-black font-semibold rounded-xl cursor-pointer transition text-xs uppercase tracking-wider mb-2">
              <span>Upload local video</span>
              <input type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
            </label>
            <p className="text-xs text-slate-600">Select MP4, AVI, or WebM stream formats</p>
          </div>
        )}

        {sourceMode === 'rtsp' && (
          <div className="bg-slate-950/50 rounded-2xl p-6 border border-slate-800/80 space-y-4">
            <div className="flex items-center gap-2 text-slate-400 text-xs uppercase font-bold tracking-widest">
              <Tv className="w-4 h-4 text-primary" />
              RTSP Server Settings
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-slate-500">Saved Cameras</span>
                <select
                  value={rtspUrl}
                  onChange={(e) => { setRtspUrl(e.target.value); setCustomRtsp(''); }}
                  disabled={connState === 'READY' || connState === 'CONNECTING'}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-primary cursor-pointer"
                >
                  {PRE_SAVED_CAMERAS.map((cam) => (
                    <option key={cam.name} value={cam.url}>{cam.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-slate-500">Or enter custom RTSP URL</span>
                <input
                  type="text"
                  placeholder="rtsp://admin:pass@ip:port/stream"
                  value={customRtsp}
                  onChange={(e) => setCustomRtsp(e.target.value)}
                  disabled={connState === 'READY' || connState === 'CONNECTING'}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>
        )}

        {/* Video / Webcam / RTSP Viewport */}
        {((sourceMode === 'upload' && videoSrc) || sourceMode === 'webcam') && (
          <div className="relative border border-slate-800 rounded-2xl overflow-hidden bg-black flex justify-center items-center aspect-video w-full max-h-[560px]">
            {/* Active Tracking Nodes Absolute HUD Overlay */}
            {latestTracks.length > 0 && (
              <div className="absolute top-4 right-4 z-20 max-w-[280px] bg-slate-950/85 border border-slate-800/80 p-3.5 rounded-xl backdrop-blur-md space-y-2 text-left pointer-events-auto shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5 font-mono">
                  <ListFilter className="w-3.5 h-3.5 text-primary animate-pulse" />
                  Active Nodes ({latestTracks.length})
                </div>
                <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {latestTracks.map((t) => (
                    <div key={t.track_id} className="flex items-center justify-between gap-3 text-xs bg-slate-900/60 border border-slate-800/50 px-2.5 py-1.5 rounded-lg text-white">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />
                        <span className="font-bold font-mono">#{t.track_id}</span>
                        <span className="text-slate-300 truncate max-w-[80px]">{t.label}</span>
                      </div>
                      <span className="text-primary font-mono text-[9px]">({t.confidence.toFixed(2)})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <video
              ref={videoRef}
              src={sourceMode === 'upload' ? videoSrc : undefined}
              className="w-full h-full object-contain"
              onPlay={() => {
                isWaitingForAckRef.current = false;
                sendNextFrame();
              }}
              controls={connState !== 'READY' && sourceMode === 'upload'}
              muted
              playsInline
            />
            <canvas
              ref={overlayCanvasRef}
              className="absolute pointer-events-none"
              style={{
                top: videoRef.current?.offsetTop || 0,
                left: videoRef.current?.offsetLeft || 0,
                width: videoRef.current?.clientWidth || '100%',
                height: videoRef.current?.clientHeight || '100%',
              }}
            />
          </div>
        )}

        {sourceMode === 'rtsp' && connState === 'READY' && (
          <div className="relative border border-primary/30 rounded-2xl overflow-hidden bg-slate-950 aspect-video flex flex-col justify-center items-center text-center p-8 w-full max-h-[560px]">
            {/* Active Tracking Nodes Absolute HUD Overlay */}
            {latestTracks.length > 0 && (
              <div className="absolute top-4 right-4 z-20 max-w-[280px] bg-slate-950/85 border border-slate-800/80 p-3.5 rounded-xl backdrop-blur-md space-y-2 text-left pointer-events-auto shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5 font-mono">
                  <ListFilter className="w-3.5 h-3.5 text-primary animate-pulse" />
                  Active Nodes ({latestTracks.length})
                </div>
                <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {latestTracks.map((t) => (
                    <div key={t.track_id} className="flex items-center justify-between gap-3 text-xs bg-slate-900/60 border border-slate-800/50 px-2.5 py-1.5 rounded-lg text-white">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />
                        <span className="font-bold font-mono">#{t.track_id}</span>
                        <span className="text-slate-300 truncate max-w-[80px]">{t.label}</span>
                      </div>
                      <span className="text-primary font-mono text-[9px]">({t.confidence.toFixed(2)})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.05)_0%,transparent_100%)]" />
            <div className="absolute top-0 left-0 w-full h-[2px] bg-primary/40 shadow-[0_0_12px_rgba(6,182,212,0.8)] animate-[scan_3s_linear_infinite]" />
            
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 relative z-10">
              <Activity className="w-6 h-6 text-primary animate-pulse" />
            </div>
            <div className="relative z-10 space-y-2">
              <p className="text-primary font-semibold uppercase tracking-wider text-sm">Server-Side Stream Running</p>
              <code className="text-slate-400 text-xs block truncate max-w-md mx-auto">{customRtsp.trim() || rtspUrl}</code>
              <div className="flex gap-4 items-center justify-center text-slate-500 text-xs font-mono pt-4">
                <span className="flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Frame: {frameCounter}</span>
                <span>Backend: {localizer === 'sam3' ? 'SAM 3' : 'DINO'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Unified Prompting & Control Area Below Video */}
        <div className="border-t border-slate-800/80 pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h3 className="text-sm uppercase font-bold tracking-wider text-slate-400">Pipeline Control & Prompting Interface</h3>
          </div>

          {/* Integrated Control and Query Row */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            {/* Session Controls */}
            <div className="shrink-0">
              {connState === 'READY' ? (
                <button
                  onClick={stopSession}
                  className="w-full sm:w-auto px-5 py-3.5 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 rounded-xl transition flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider whitespace-nowrap"
                >
                  <Square className="w-3.5 h-3.5" /> Stop Session
                </button>
              ) : (
                <button
                  disabled={(sourceMode === 'upload' && !videoFile) || connState === 'CONNECTING'}
                  onClick={startSession}
                  className="w-full sm:w-auto px-5 py-3.5 bg-primary/10 border border-primary/30 hover:bg-primary/20 disabled:opacity-30 disabled:pointer-events-none text-primary rounded-xl transition flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider whitespace-nowrap"
                >
                  <Play className="w-3.5 h-3.5" /> Start Session
                </button>
              )}
            </div>

            {/* Command Prompt Input Bar */}
            <form onSubmit={sendCommand} className="flex-1 flex gap-2 relative">
              <input
                type="text"
                disabled={connState !== 'READY'}
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder={connState === 'READY' ? 'Type track command or query...' : 'Start tracking session first...'}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 pr-12 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 placeholder-slate-600 disabled:opacity-40 transition-all animate-pulse-subtle"
              />
              <button
                type="submit"
                disabled={connState !== 'READY' || !command.trim()}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-10 h-10 bg-primary hover:bg-primary-hover disabled:opacity-20 disabled:pointer-events-none rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-105"
                aria-label="Send command"
              >
                <Send className="w-4 h-4 text-black" strokeWidth={2.5} />
              </button>
            </form>
          </div>

          {/* Chat thread messages log */}
          {messages.length > 0 && (
            <div ref={chatContainerRef} className="bg-slate-950/60 rounded-2xl border border-slate-800/60 p-4 space-y-4 max-h-[300px] overflow-y-auto w-full">
              {messages.map((m) => {
                const isUser = m.sender === 'user';
                return (
                  <div 
                    key={m.id} 
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div 
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        isUser 
                          ? 'bg-primary text-black font-medium rounded-tr-none' 
                          : m.type === 'error'
                          ? 'bg-red-500/10 border border-red-500/20 text-red-400 rounded-tl-none flex items-start gap-2'
                          : m.type === 'result'
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-tl-none flex items-start gap-2'
                          : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                      }`}
                    >
                      {!isUser && m.type === 'error' && <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />}
                      {!isUser && m.type === 'result' && <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />}
                      <span>{m.text}</span>
                    </div>
                    <span className="text-[9px] font-mono text-slate-600 mt-1 px-1">
                      {m.timestamp}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Recent Activity & System Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="premium-card p-6">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-semibold text-white">Recent Activity</h3>
          </div>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between py-3 border-b border-slate-800 last:border-0"
              >
                <div>
                  <p className="text-white flex items-center gap-2">
                    {activity.action}
                  </p>
                  <p className="text-sm text-slate-500">{activity.time}</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-slate-600"></div>
              </div>
            ))}
          </div>
        </div>

        {/* System Status */}
        <div className="premium-card p-6">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-semibold text-white">System Status</h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-400">Localizer Engine</span>
                <span className="text-primary">Ready</span>
              </div>
              <div className="w-full bg-slate-900 border border-slate-800 rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-400">VLM Agent Core</span>
                <span className="text-primary">Active</span>
              </div>
              <div className="w-full bg-slate-900 border border-slate-800 rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: '95%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-400">GPU Hardware Memory</span>
                <span className={gpuUsage < 60 ? 'text-primary' : gpuUsage <= 85 ? 'text-warning' : 'text-destructive'}>
                  6.2 / 8 GB ({gpuUsage}%)
                </span>
              </div>
              <div className="w-full bg-slate-900 border border-slate-800 rounded-full h-2">
                <div className={`bg-gradient-to-r ${getGpuColor(gpuUsage)} h-2 rounded-full`} style={{ width: `${gpuUsage}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}