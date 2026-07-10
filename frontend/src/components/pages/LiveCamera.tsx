import { useState, useRef, useEffect } from 'react';
import { Upload, Play, Square, Send } from 'lucide-react';

interface Track {
  track_id: number;
  label: string;
  bbox: [number, number, number, number];
  confidence: number;
  backend: string;
}

export default function LiveCamera() {
  const [localizer, setLocalizer] = useState<'grounding_dino' | 'sam3'>('grounding_dino');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoSrc, setVideoSrc] = useState<string>('');
  const [connState, setConnState] = useState<'DISCONNECTED' | 'CONNECTING' | 'READY' | 'CLOSED'>('DISCONNECTED');
  const [command, setCommand] = useState('');
  const [summaries, setSummaries] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const frameSeqRef = useRef<number>(0);
  const isWaitingForAckRef = useRef<boolean>(false);
  const latestTracksRef = useRef<Track[]>([]);
  const isSessionActiveRef = useRef<boolean>(false);
  const lastFrameTimeRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isSessionActiveRef.current = false;
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Listen for video seeked event to feed the next frame when running in paced upload mode
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const onSeeked = () => {
        console.log('[LiveCamera] seeked event fired. currentTime:', video.currentTime, 'isWaitingForAck:', isWaitingForAckRef.current, 'isSessionActive:', isSessionActiveRef.current);
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && !isWaitingForAckRef.current && isSessionActiveRef.current) {
          sendNextFrame();
        } else {
          console.log('[LiveCamera] seeked event ignored. ws state:', wsRef.current?.readyState);
        }
      };
      video.addEventListener('seeked', onSeeked);
      return () => {
        video.removeEventListener('seeked', onSeeked);
      };
    }
  }, [videoSrc]);

  // Frame processing loop & canvas scaling
  useEffect(() => {
    let animationFrameId: number;

    const renderLoop = () => {
      const video = videoRef.current;
      const canvas = overlayCanvasRef.current;
      if (video && canvas) {
        // Adjust canvas dimensions to match displayed video container
        const rect = video.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Draw all active tracks
          latestTracksRef.current.forEach((t) => {
            const [x, y, w, h] = t.bbox; // Native video resolution absolute pixels

            // Scale to canvas dimensions
            const scaleX = canvas.width / video.videoWidth;
            const scaleY = canvas.height / video.videoHeight;

            const cx = x * scaleX;
            const cy = y * scaleY;
            const cw = w * scaleX;
            const ch = h * scaleY;

            // Draw Box
            ctx.strokeStyle = t.backend === 'sam3' ? '#FF00FF' : '#22D3C8';
            ctx.lineWidth = 3;
            ctx.strokeRect(cx, cy, cw, ch);

            // Draw Tag Background
            ctx.fillStyle = t.backend === 'sam3' ? 'rgba(255, 0, 255, 0.75)' : 'rgba(34, 211, 200, 0.75)';
            ctx.font = '12px Courier New';
            const tagText = `${t.label} #${t.track_id} (${t.confidence.toFixed(2)}) [${t.backend}]`;
            const textWidth = ctx.measureText(tagText).width;
            ctx.fillRect(cx, cy - 20, textWidth + 10, 20);

            // Draw Tag Text
            ctx.fillStyle = '#000000';
            ctx.fillText(tagText, cx + 5, cy - 5);
          });
        }
      }
      animationFrameId = requestAnimationFrame(renderLoop);
    };

    renderLoop();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setSummaries([]);
      latestTracksRef.current = [];
      if (wsRef.current) {
        isSessionActiveRef.current = false;
        wsRef.current.close();
      }
      setConnState('DISCONNECTED');
    }
  };

  const startSession = () => {
    if (!videoFile) return;

    setConnState('CONNECTING');
    setSummaries([]);
    latestTracksRef.current = [];
    frameSeqRef.current = 0;
    isWaitingForAckRef.current = false;
    isSessionActiveRef.current = true;
    lastFrameTimeRef.current = performance.now();

    // Reset video player and pause to handle manual frame stepping
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }

    // Connect to FastAPI backend
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Default to port 8000 for backend
    const wsUrl = `${protocol}//${window.location.hostname}:8000/ws/session`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      // Send handshake initialization message with target FPS
      ws.send(
        JSON.stringify({
          type: 'init',
          source: 'upload',
          localizer: localizer,
          conf: 0.35,
          fps: 25.0,
        })
      );
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      console.log('[LiveCamera WS] msg:', msg);

      if (msg.type === 'session_ready') {
        setConnState('READY');
        setSessionId(msg.session_id);
        isSessionActiveRef.current = true;
        // Send initial bootstrap frame at currentTime = 0
        sendNextFrame();
      } else if (msg.type === 'frame_update') {
        latestTracksRef.current = msg.tracks || [];
        isWaitingForAckRef.current = false;
        
        // Enforce natural pacing (25 FPS -> 40ms interval)
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
      } else if (msg.type === 'response') {
        if (msg.summary) {
          setSummaries((prev) => [...prev, `[Summary] ${msg.summary}`]);
        }
      } else if (msg.type === 'query_result') {
        setSummaries((prev) => [
          ...prev,
          `[Result] Task: ${msg.task} | Track: ${msg.track_id} | Data: ${JSON.stringify(msg.data)} (${msg.latency_ms}ms)`,
        ]);
      } else if (msg.type === 'error') {
        setSummaries((prev) => [...prev, `[Error] Code: ${msg.code} | Detail: ${msg.detail || ''}`]);
      }
    };

    ws.onclose = () => {
      setConnState('CLOSED');
      isSessionActiveRef.current = false;
      if (videoRef.current) {
        videoRef.current.pause();
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket Error:', err);
      setConnState('CLOSED');
      isSessionActiveRef.current = false;
    };
  };

  const sendNextFrame = () => {
    const video = videoRef.current;
    const ws = wsRef.current;
    console.log('[LiveCamera] sendNextFrame entry. frameSeq:', frameSeqRef.current);
    if (!video || !ws || ws.readyState !== WebSocket.OPEN || isWaitingForAckRef.current || !isSessionActiveRef.current) {
      console.log('[LiveCamera] sendNextFrame skipped. ws state:', ws?.readyState, 'isWaiting:', isWaitingForAckRef.current, 'isActive:', isSessionActiveRef.current);
      return;
    }
    if (video.ended) {
      console.log('[LiveCamera] sendNextFrame skipped: video ended');
      return;
    }

    // Capture frame on offscreen canvas
    const offscreen = document.createElement('canvas');
    offscreen.width = video.videoWidth;
    offscreen.height = video.videoHeight;
    const ctx = offscreen.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, offscreen.width, offscreen.height);
      const dataUrl = offscreen.toDataURL('image/jpeg', 0.6);
      const base64Data = dataUrl.split(',')[1];

      isWaitingForAckRef.current = true;
      console.log('[LiveCamera] Sending frame seq:', frameSeqRef.current);
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
  };

  const sendCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    setSummaries((prev) => [...prev, `[Command Sent] ${command}`]);
    wsRef.current.send(
      JSON.stringify({
        type: 'command',
        text: command.trim(),
      })
    );
    setCommand('');
  };

  return (
    <div className="p-8 max-w-6xl mx-auto min-h-screen text-white font-sans bg-[#0B0F19]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Live Tracking (Minimal Flow)</h1>
          <p className="text-gray-400 text-sm">Upload a video, specify localizer backend, and query tracked objects.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded text-xs font-bold tracking-widest ${
            connState === 'READY' ? 'bg-green-500/20 text-green-400' :
            connState === 'CONNECTING' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {connState} {sessionId && `(${sessionId})`}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Columns: Video Feed & Inputs */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-[#111827] rounded-xl p-6 border border-gray-800">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
              {/* File Input */}
              <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition text-sm">
                <Upload className="w-4 h-4" />
                <span>Upload Video</span>
                <input type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
              </label>

              {/* Localizer choice */}
              <div className="flex items-center gap-4 text-sm bg-gray-900 p-2 rounded-lg border border-gray-800">
                <span className="text-gray-400 font-semibold pl-1">Localizer:</span>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="localizer"
                    checked={localizer === 'grounding_dino'}
                    onChange={() => setLocalizer('grounding_dino')}
                    disabled={connState === 'READY'}
                  />
                  <span>DINO</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="localizer"
                    checked={localizer === 'sam3'}
                    onChange={() => setLocalizer('sam3')}
                    disabled={connState === 'READY'}
                  />
                  <span>SAM 3</span>
                </label>
              </div>

              {/* Start/Stop Buttons */}
              <div className="flex gap-2">
                <button
                  disabled={!videoFile || connState === 'READY' || connState === 'CONNECTING'}
                  onClick={startSession}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white rounded-lg transition flex items-center gap-2 text-sm"
                >
                  <Play className="w-4 h-4" /> Start
                </button>
                <button
                  disabled={connState !== 'READY'}
                  onClick={stopSession}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-lg transition flex items-center gap-2 text-sm"
                >
                  <Square className="w-4 h-4" /> Stop
                </button>
              </div>
            </div>

            {/* Video Viewport with Canvas Bbox Overlay */}
            {videoSrc ? (
              <div className="relative border border-gray-800 rounded-lg overflow-hidden bg-black flex justify-center items-center">
                <video
                  ref={videoRef}
                  src={videoSrc}
                  className="max-h-[500px] w-auto max-w-full"
                  onPlay={() => {
                    isWaitingForAckRef.current = false;
                    sendNextFrame();
                  }}
                  controls={connState !== 'READY'}
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
            ) : (
              <div className="border-2 border-dashed border-gray-800 rounded-lg aspect-video flex flex-col justify-center items-center text-gray-500 bg-gray-950">
                <Upload className="w-12 h-12 mb-3 text-gray-700" />
                <p>Please upload a video file to begin tracking</p>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Command input and response summaries */}
        <div className="flex flex-col h-full space-y-6">
          <div className="bg-[#111827] rounded-xl p-6 border border-gray-800 flex flex-col h-[600px]">
            <h2 className="text-lg font-bold mb-4">Command Center</h2>

            {/* Form Input */}
            <form onSubmit={sendCommand} className="flex gap-2 mb-4">
              <input
                type="text"
                disabled={connState !== 'READY'}
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder={connState === 'READY' ? 'Type track command or follow-up query...' : 'Start session to write commands...'}
                className="flex-grow bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 placeholder-gray-600 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={connState !== 'READY' || !command.trim()}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            {/* Scrolling Summary List */}
            <div className="flex-grow overflow-y-auto bg-gray-950 rounded-lg border border-gray-900 p-4 font-mono text-xs space-y-2 text-gray-300">
              {summaries.length === 0 ? (
                <div className="text-gray-600 italic">No responses received yet. Send "track the person" to lock on.</div>
              ) : (
                summaries.map((s, idx) => {
                  let colorClass = 'text-gray-300';
                  if (s.startsWith('[Command')) colorClass = 'text-blue-400 font-semibold';
                  if (s.startsWith('[Result]')) colorClass = 'text-green-400';
                  if (s.startsWith('[Error]')) colorClass = 'text-red-400 font-bold';
                  return (
                    <div key={idx} className={`${colorClass} break-all border-b border-gray-900/50 pb-1.5 last:border-b-0`}>
                      {s}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}