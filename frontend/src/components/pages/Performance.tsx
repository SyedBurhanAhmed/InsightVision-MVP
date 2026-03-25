import { useState } from 'react';
import { Gauge, Cpu, HardDrive, Zap, Activity, TrendingUp } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

const fpsData = [
  { time: '0s', fps: 55 },
  { time: '5s', fps: 58 },
  { time: '10s', fps: 56 },
  { time: '15s', fps: 59 },
  { time: '20s', fps: 57 },
  { time: '25s', fps: 58 },
  { time: '30s', fps: 60 },
  { time: '35s', fps: 58 },
  { time: '40s', fps: 57 },
  { time: '45s', fps: 59 },
];

const latencyData = [
  { time: '0s', latency: 18 },
  { time: '5s', latency: 17 },
  { time: '10s', latency: 19 },
  { time: '15s', latency: 16 },
  { time: '20s', latency: 18 },
  { time: '25s', latency: 17 },
  { time: '30s', latency: 16 },
  { time: '35s', latency: 18 },
  { time: '40s', latency: 19 },
  { time: '45s', latency: 17 },
];

const resourceData = [
  { time: '0s', cpu: 45, gpu: 68, memory: 58 },
  { time: '10s', cpu: 48, gpu: 72, memory: 60 },
  { time: '20s', cpu: 46, gpu: 70, memory: 59 },
  { time: '30s', cpu: 50, gpu: 75, memory: 62 },
  { time: '40s', cpu: 47, gpu: 71, memory: 60 },
  { time: '50s', cpu: 49, gpu: 73, memory: 61 },
];

const modelPerformance = [
  { model: 'YOLOv11', fps: 58, accuracy: 92, memory: 2.4 },
  { model: 'YOLO-World', fps: 52, accuracy: 90, memory: 2.8 },
  { model: 'Florence-2', fps: 32, accuracy: 94, memory: 5.8 },
  { model: 'Qwen-VL', fps: 45, accuracy: 91, memory: 4.2 },
];

export default function Performance() {
  const [resolution, setResolution] = useState('1080p');

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Gauge className="w-8 h-8 text-[#FFD60A]" strokeWidth={2} />
            <h1 className="text-4xl font-bold text-white">Performance Metrics</h1>
          </div>
          <p className="text-gray-400">Real-time system performance and resource monitoring</p>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">Test Resolution</span>
          <select 
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            className="bg-[rgba(255,255,255,0.05)] border border-[rgba(220,20,60,0.3)] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#DC143C]"
          >
            <option className="bg-black" value="720p">720p (HD)</option>
            <option className="bg-black" value="1080p">1080p (FHD)</option>
            <option className="bg-black" value="4k">4K (UHD)</option>
          </select>
        </div>
      </div>

      {/* Live Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="premium-card p-6">
          <div className="flex items-center justify-between mb-4">
            <Zap className="w-8 h-8 text-[#FFD60A]" />
            <span className="text-3xl font-bold text-white">58</span>
          </div>
          <p className="text-sm text-gray-400 mb-2">Frames Per Second</p>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#39FF14]" />
            <span className="text-xs text-[#39FF14]">+3% from avg</span>
          </div>
        </div>

        <div className="premium-card p-6">
          <div className="flex items-center justify-between mb-4">
            <Activity className="w-8 h-8 text-[#00D4FF]" />
            <span className="text-3xl font-bold text-white">17ms</span>
          </div>
          <p className="text-sm text-gray-400 mb-2">Inference Latency</p>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#39FF14] rotate-180" />
            <span className="text-xs text-[#39FF14]">-2ms improved</span>
          </div>
        </div>

        <div className="premium-card p-6">
          <div className="flex items-center justify-between mb-4">
            <Cpu className="w-8 h-8 text-[#FF6B35]" />
            <span className="text-3xl font-bold text-white">47%</span>
          </div>
          <p className="text-sm text-gray-400 mb-2">CPU Usage</p>
          <div className="w-full bg-[rgba(255,255,255,0.1)] rounded-full h-2 mt-2">
            <div className="bg-gradient-to-r from-[#FF6B35] to-[#DC143C] h-2 rounded-full" style={{ width: '47%' }}></div>
          </div>
        </div>

        <div className="premium-card p-6">
          <div className="flex items-center justify-between mb-4">
            <HardDrive className="w-8 h-8 text-[#9D4EDD]" />
            <span className="text-3xl font-bold text-white">6.2GB</span>
          </div>
          <p className="text-sm text-gray-400 mb-2">GPU Memory</p>
          <div className="w-full bg-[rgba(255,255,255,0.1)] rounded-full h-2 mt-2">
            <div className="bg-gradient-to-r from-[#9D4EDD] to-[#00FFFF] h-2 rounded-full" style={{ width: '78%' }}></div>
          </div>
        </div>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* FPS Over Time */}
        <div className="premium-card p-6">
          <h3 className="text-xl font-semibold text-white mb-4">FPS Over Time</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={fpsData}>
              <defs>
                <linearGradient id="colorFps" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FFD60A" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#FFD60A" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="time" stroke="#fff" style={{ fontSize: '12px' }} />
              <YAxis stroke="#fff" style={{ fontSize: '12px' }} domain={[50, 65]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(20, 20, 20, 0.95)',
                  border: '1px solid rgba(220, 20, 60, 0.3)',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Area type="monotone" dataKey="fps" stroke="#FFD60A" strokeWidth={3} fillOpacity={1} fill="url(#colorFps)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Latency Over Time */}
        <div className="premium-card p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Latency Over Time</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={latencyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="time" stroke="#fff" style={{ fontSize: '12px' }} />
              <YAxis stroke="#fff" style={{ fontSize: '12px' }} domain={[10, 25]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(20, 20, 20, 0.95)',
                  border: '1px solid rgba(220, 20, 60, 0.3)',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Line type="monotone" dataKey="latency" stroke="#00D4FF" strokeWidth={3} dot={{ fill: '#00D4FF', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Resource Usage */}
      <div className="premium-card p-6 mb-8">
        <h3 className="text-xl font-semibold text-white mb-4">Resource Usage Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={resourceData}>
            <defs>
              <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#FF6B35" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorGpu" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#9D4EDD" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#9D4EDD" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorMemory" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00FFFF" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#00FFFF" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="time" stroke="#fff" style={{ fontSize: '12px' }} />
            <YAxis stroke="#fff" style={{ fontSize: '12px' }} domain={[0, 100]} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(20, 20, 20, 0.95)',
                border: '1px solid rgba(220, 20, 60, 0.3)',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            <Legend wrapperStyle={{ color: '#fff', fontSize: '12px' }} />
            <Area type="monotone" dataKey="cpu" name="CPU (%)" stroke="#FF6B35" strokeWidth={2} fillOpacity={1} fill="url(#colorCpu)" />
            <Area type="monotone" dataKey="gpu" name="GPU (%)" stroke="#9D4EDD" strokeWidth={2} fillOpacity={1} fill="url(#colorGpu)" />
            <Area type="monotone" dataKey="memory" name="RAM/VRAM (%)" stroke="#00FFFF" strokeWidth={2} fillOpacity={1} fill="url(#colorMemory)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Model Performance Comparison */}
      <div className="premium-card p-6 mb-8">
        <h3 className="text-xl font-semibold text-white mb-4">Model Performance Comparison</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={modelPerformance}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="model" stroke="#fff" style={{ fontSize: '12px' }} />
            <YAxis stroke="#fff" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(20, 20, 20, 0.95)',
                border: '1px solid rgba(220, 20, 60, 0.3)',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            <Legend wrapperStyle={{ color: '#fff', fontSize: '12px' }} />
            <Bar dataKey="fps" name="Frames Per Second (FPS)" fill="#FFD60A" radius={[8, 8, 0, 0]} />
            <Bar dataKey="accuracy" name="Accuracy (mAP)" fill="#39FF14" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* System Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="premium-card p-6 h-full hover:shadow-[0_0_20px_rgba(220,20,60,0.4)] hover:border-[#DC143C]/50 transition-all duration-300">
          <h3 className="text-xl font-semibold text-white mb-4">Hardware</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">GPU</span>
              <span className="text-white">NVIDIA RTX 3080</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">VRAM</span>
              <span className="text-white">8 GB</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">CPU</span>
              <span className="text-white">Intel i7-12700K</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">RAM</span>
              <span className="text-white">32 GB DDR4</span>
            </div>
          </div>
        </div>

        <div className="premium-card p-6 h-full hover:shadow-[0_0_20px_rgba(220,20,60,0.4)] hover:border-[#DC143C]/50 transition-all duration-300">
          <h3 className="text-xl font-semibold text-white mb-4">Software</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">CUDA</span>
              <span className="text-white">12.1</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">PyTorch</span>
              <span className="text-white">2.5.0</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">OpenCV</span>
              <span className="text-white">4.8.1</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">TensorRT</span>
              <span className="text-white">8.6.1</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">FastAPI</span>
              <span className="text-white">0.115.0</span>
            </div>
          </div>
        </div>

        <div className="premium-card p-6 h-full hover:shadow-[0_0_20px_rgba(220,20,60,0.4)] hover:border-[#DC143C]/50 transition-all duration-300">
          <h3 className="text-xl font-semibold text-white mb-4">Optimization</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Precision</span>
              <span className="text-[#39FF14]">FP16</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Batch Size</span>
              <span className="text-white">1</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">TensorRT</span>
              <span className="text-[#39FF14]">Enabled</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Multi-threading</span>
              <span className="text-[#39FF14]">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
