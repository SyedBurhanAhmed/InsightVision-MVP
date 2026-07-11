import { useState, useRef, useEffect } from 'react';
import { 
  Upload, Play, Square, Send, Camera, Tv, Cpu, MessageSquare, 
  Activity, ShieldAlert, CheckCircle2, RefreshCw, ListFilter
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

export default function LiveCamera() {
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to chat bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

            // Draw bounding box with rounded corners outline
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
        
        // Start streaming frames back and forth
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
    setCommand('');
  };

  return (
    <div className="min-h-screen p-8 max-w-7xl mx-auto text-white">
      {/* SOTA Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2 flex items-center gap-3">
            <span className="w-2.5 h-6 bg-[#06B6D4] rounded-full inline-block animate-pulse" />
            Live Tracking Terminal
          </h1>
          <p className="text-slate-400 text-sm">Configure live visual pipelines and issue natural language tracking queries.</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-900/50 border border-slate-800/80 px-4 py-2 rounded-xl">
          <span className={`w-2 h-2 rounded-full ${
            connState === 'READY' ? 'bg-[#06B6D4] animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.6)]' :
            connState === 'CONNECTING' ? 'bg-amber-500 animate-pulse' : 'bg-slate-500'
          }`} />
          <span className="text-xs uppercase font-bold tracking-wider text-slate-300">
            {connState} {sessionId && `(${sessionId})`}
          </span>
        </div>
      </div>

      {/* Main Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Pipeline Config & Viewport Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="premium-card p-6">
            
            {/* SOTA Segmented Source Mode Selectors */}
            <div className="flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center mb-6 pb-6 border-b border-slate-800/55">
              
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
                      sourceMode === 'upload' ? 'bg-[#06B6D4] text-black shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Upload Video
                  </button>
                  <button
                    onClick={() => { setSourceMode('webcam'); stopSession(); }}
                    disabled={connState === 'READY' || connState === 'CONNECTING'}
                    className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                      sourceMode === 'webcam' ? 'bg-[#06B6D4] text-black shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Webcam
                  </button>
                  <button
                    onClick={() => { setSourceMode('rtsp'); stopSession(); }}
                    disabled={connState === 'READY' || connState === 'CONNECTING'}
                    className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                      sourceMode === 'rtsp' ? 'bg-[#06B6D4] text-black shadow-sm' : 'text-slate-400 hover:text-white'
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
                      localizer === 'grounding_dino' ? 'bg-[#06B6D4] text-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Grounding DINO
                  </button>
                  <button
                    onClick={() => setLocalizer('sam3')}
                    disabled={connState === 'READY' || connState === 'CONNECTING'}
                    className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                      localizer === 'sam3' ? 'bg-[#06B6D4] text-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    SAM 3
                  </button>
                </div>
              </div>

              {/* Session Controls */}
              <div className="flex flex-row gap-3 pt-6 sm:pt-0 self-end">
                {connState === 'READY' ? (
                  <button
                    onClick={stopSession}
                    className="px-5 py-2.5 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 rounded-xl transition flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
                  >
                    <Square className="w-3.5 h-3.5" /> Stop Session
                  </button>
                ) : (
                  <button
                    disabled={(sourceMode === 'upload' && !videoFile) || connState === 'CONNECTING'}
                    onClick={startSession}
                    className="px-5 py-2.5 bg-[#06B6D4]/10 border border-[#06B6D4]/30 hover:bg-[#06B6D4]/20 disabled:opacity-30 disabled:pointer-events-none text-[#06B6D4] rounded-xl transition flex items-center gap-2 text-xs font-bold uppercase tracking-wider shadow-[0_4px_20px_rgba(6,182,212,0.05)]"
                  >
                    <Play className="w-3.5 h-3.5" /> Start Session
                  </button>
                )}
              </div>
            </div>

            {/* Dynamic Camera Configuration Area */}
            {sourceMode === 'upload' && !videoSrc && (
              <div className="border border-dashed border-slate-800 rounded-2xl aspect-video flex flex-col justify-center items-center text-slate-500 bg-slate-950/40 p-8 mb-6">
                <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-4">
                  <Upload className="w-6 h-6 text-slate-400" />
                </div>
                <label className="flex items-center gap-2 px-5 py-2.5 bg-[#06B6D4] hover:bg-[#0891B2] text-black font-semibold rounded-xl cursor-pointer transition text-xs uppercase tracking-wider mb-2">
                  <span>Upload local video</span>
                  <input type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
                </label>
                <p className="text-xs text-slate-600">Select MP4, AVI, or WebM stream formats</p>
              </div>
            )}

            {sourceMode === 'rtsp' && (
              <div className="bg-slate-950/50 rounded-2xl p-6 border border-slate-800/80 mb-6 space-y-4">
                <div className="flex items-center gap-2 text-slate-400 text-xs uppercase font-bold tracking-widest">
                  <Tv className="w-4 h-4 text-[#06B6D4]" />
                  RTSP Server Settings
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs text-slate-500">Saved Cameras</span>
                    <select
                      value={rtspUrl}
                      onChange={(e) => { setRtspUrl(e.target.value); setCustomRtsp(''); }}
                      disabled={connState === 'READY' || connState === 'CONNECTING'}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-[#06B6D4] cursor-pointer"
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
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-[#06B6D4]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Video / Webcam / RTSP Viewport */}
            {(sourceMode === 'upload' && videoSrc) || sourceMode === 'webcam' ? (
              <div className="relative border border-slate-800 rounded-2xl overflow-hidden bg-black flex justify-center items-center aspect-video">
                <video
                  ref={videoRef}
                  src={sourceMode === 'upload' ? videoSrc : undefined}
                  className="w-full h-full max-h-[500px] object-contain"
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
            ) : null}

            {sourceMode === 'rtsp' && connState === 'READY' && (
              <div className="relative border border-[#06B6D4]/30 rounded-2xl overflow-hidden bg-slate-950 aspect-video flex flex-col justify-center items-center text-center p-8">
                {/* scanning screen visualizer for RTSP */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.05)_0%,transparent_100%)]" />
                <div className="absolute top-0 left-0 w-full h-[2px] bg-[#06B6D4]/40 shadow-[0_0_12px_rgba(6,182,212,0.8)] animate-[scan_3s_linear_infinite]" />
                
                <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 relative z-10">
                  <Activity className="w-6 h-6 text-[#06B6D4] animate-pulse" />
                </div>
                <div className="relative z-10 space-y-2">
                  <p className="text-[#06B6D4] font-semibold uppercase tracking-wider text-sm">Server-Side Stream Running</p>
                  <code className="text-slate-400 text-xs block truncate max-w-md mx-auto">{customRtsp.trim() || rtspUrl}</code>
                  <div className="flex gap-4 items-center justify-center text-slate-500 text-xs font-mono pt-4">
                    <span className="flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Frame: {frameCounter}</span>
                    <span>Backend: {localizer === 'sam3' ? 'SAM 3' : 'DINO'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* SOTA Active Targets Bar */}
            {latestTracks.length > 0 && (
              <div className="mt-6 pt-6 border-t border-slate-800/80">
                <div className="text-xs uppercase font-bold text-slate-500 mb-3 flex items-center gap-1.5">
                  <ListFilter className="w-3.5 h-3.5 text-slate-400" />
                  Active Tracking Nodes
                </div>
                <div className="flex flex-wrap gap-2">
                  {latestTracks.map((t) => (
                    <div 
                      key={t.track_id} 
                      className="flex items-center gap-2 bg-[#06B6D4]/5 border border-[#06B6D4]/15 px-3 py-1.5 rounded-full text-xs text-white transition hover:border-[#06B6D4]/40"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4] animate-pulse" />
                      <span className="font-bold text-slate-300">ID #{t.track_id}</span>
                      <span className="text-slate-400">{t.label}</span>
                      <span className="bg-[#06B6D4]/15 text-[#06B6D4] text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">{t.backend}</span>
                      <span className="text-[#06B6D4] font-medium font-mono">({t.confidence.toFixed(2)})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Command Center Chat Panel */}
        <div className="flex flex-col h-full min-h-[600px] lg:min-h-[auto]">
          <div className="premium-card flex flex-col h-full p-6" style={{ maxHeight: '720px' }}>
            <div className="flex items-center gap-2.5 mb-4 pb-4 border-b border-slate-800/80">
              <MessageSquare className="w-5 h-5 text-[#06B6D4]" />
              <div>
                <h2 className="text-lg font-bold text-white leading-none mb-1">Pipeline Chat</h2>
                <p className="text-xs text-slate-500">Query and instruct the vision model directly.</p>
              </div>
            </div>

            {/* Bubble Thread Log */}
            <div className="flex-1 overflow-y-auto bg-slate-950/60 rounded-2xl border border-slate-800/60 p-4 space-y-4 min-h-[380px]">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col justify-center items-center text-center p-6 text-slate-600">
                  <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-xs">No activity yet. Start the session and enter <code className="bg-slate-900 px-1 py-0.5 rounded text-[#06B6D4]">track the person</code> to begin.</p>
                </div>
              ) : (
                messages.map((m) => {
                  const isUser = m.sender === 'user';
                  return (
                    <div 
                      key={m.id} 
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                    >
                      <div 
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          isUser 
                            ? 'bg-[#06B6D4] text-black font-medium rounded-tr-none' 
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
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Form Input Bar */}
            <form onSubmit={sendCommand} className="mt-4 flex gap-2 relative">
              <input
                type="text"
                disabled={connState !== 'READY'}
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder={connState === 'READY' ? 'Type track command or query...' : 'Start tracking session first...'}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pr-12 text-sm text-white focus:outline-none focus:border-[#06B6D4] focus:ring-1 focus:ring-[#06B6D4]/30 placeholder-slate-600 disabled:opacity-40 transition-all"
              />
              <button
                type="submit"
                disabled={connState !== 'READY' || !command.trim()}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 bg-[#06B6D4] hover:bg-[#0891B2] disabled:opacity-20 disabled:pointer-events-none rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-105"
                aria-label="Send command"
              >
                <Send className="w-4 h-4 text-black" strokeWidth={2.5} />
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}