import { useState, useEffect } from 'react';
import { Gauge, Cpu, HardDrive, Zap, Activity, Award } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const BACKEND = 'http://localhost:8000';

type LocalizerBenchmark = {
  name: string;
  cold_lock_on_latency_ms: number;
  vram_mb: number;
  box_quality: string;
  ocr_success_rate: number;
  detection_iou: number;
  sample_bbox: [number, number, number, number];
};

type TrackerBenchmark = {
  name: string;
  speed_fps: number;
  latency_ms: number;
  robustness: string;
  id_consistency_score: number;
};

type BenchmarkData = {
  localizer_comparison: {
    grounding_dino: LocalizerBenchmark;
    sam3: LocalizerBenchmark;
  };
  tracker_comparison: {
    boxmot_botsort: TrackerBenchmark;
    sam3_native: TrackerBenchmark;
  };
  pipeline_stages_latency_ms: {
    [key: string]: {
      label: string;
      dino: number;
      sam3: number;
    }
  };
  vram_diagnostics: {
    dino_sam3_idle: number;
    unified_pipeline_active_peak: number;
    hardware_limit: number;
  };
  sample_target: {
    image_url: string;
    ground_truth_bbox: [number, number, number, number];
    description: string;
  };
};

const fallbackBenchmarkData: BenchmarkData = {
  localizer_comparison: {
    grounding_dino: {
      name: "Grounding DINO (Swin-T)",
      cold_lock_on_latency_ms: 0.0,
      vram_mb: 0.0,
      box_quality: "No data loaded",
      ocr_success_rate: 0.0,
      detection_iou: 0.0,
      sample_bbox: [0, 0, 0, 0]
    },
    sam3: {
      name: "SAM 3 (Prompt Processor)",
      cold_lock_on_latency_ms: 0.0,
      vram_mb: 0.0,
      box_quality: "No data loaded",
      ocr_success_rate: 0.0,
      detection_iou: 0.0,
      sample_bbox: [0, 0, 0, 0]
    }
  },
  tracker_comparison: {
    boxmot_botsort: {
      name: "Grounding DINO + BoxMOT (BoT-SORT)",
      speed_fps: 0.0,
      latency_ms: 0.0,
      robustness: "No data loaded",
      id_consistency_score: 0.0
    },
    sam3_native: {
      name: "SAM 3 Native Single-Shot Tracking",
      speed_fps: 0.0,
      latency_ms: 0.0,
      robustness: "No data loaded",
      id_consistency_score: 0.0
    }
  },
  pipeline_stages_latency_ms: {
    localize: { label: "Localizer Lock-on", dino: 0.0, sam3: 0.0 },
    track: { label: "Per-frame Tracking", dino: 0.0, sam3: 0.0 },
    segment: { label: "SAM 3 Segmentation", dino: 0.0, sam3: 0.0 },
    ocr: { label: "Gemma 4 VLM OCR Pass", dino: 0.0, sam3: 0.0 },
    describe: { label: "Gemma 4 VLM Description", dino: 0.0, sam3: 0.0 }
  },
  vram_diagnostics: {
    dino_sam3_idle: 0.0,
    unified_pipeline_active_peak: 0.0,
    hardware_limit: 16000.0
  },
  sample_target: {
    image_url: "",
    ground_truth_bbox: [0, 0, 0, 0],
    description: "No target loaded"
  }
};

export default function Performance() {
  const [data, setData] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BACKEND}/api/benchmark`)
      .then((res) => res.json())
      .then((json) => {
        if (json && json.pipeline_stages_latency_ms) {
          setData(json);
        } else {
          setData(fallbackBenchmarkData);
        }
      })
      .catch((err) => {
        console.warn("Failed to load backend benchmarks, using fallback:", err);
        setData(fallbackBenchmarkData);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin text-[#FFD60A] mx-auto mb-2" />
          <p>Loading real-time hardware & software benchmarks...</p>
        </div>
      </div>
    );
  }

  // Format latency data for Recharts
  const latencyChartData = Object.keys(data.pipeline_stages_latency_ms).map((key) => {
    const stage = data.pipeline_stages_latency_ms[key];
    return {
      stage: stage.label,
      "DINO Config (ms)": stage.dino,
      "SAM3 Config (ms)": stage.sam3,
    };
  });

  // Calculate total latency
  const dinoTotalLatency = Object.values(data.pipeline_stages_latency_ms).reduce((acc, curr) => acc + curr.dino, 0);
  const sam3TotalLatency = Object.values(data.pipeline_stages_latency_ms).reduce((acc, curr) => acc + curr.sam3, 0);

  // VRAM diagnostic percentages
  const vramPeakPct = Math.round((data.vram_diagnostics.unified_pipeline_active_peak / data.vram_diagnostics.hardware_limit) * 100);

  return (
    <div className="min-h-screen p-8 bg-black/40 overflow-y-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Gauge className="w-8 h-8 text-[#FFD60A]" strokeWidth={2} />
          <h1 className="text-4xl font-bold text-white font-display">System Performance Telemetry</h1>
        </div>
        <p className="text-gray-400">
          Real-time hardware resource consumption and execution latency bottlenecks across target pipeline stages.
        </p>
      </div>

      {/* Live Metrics Telemetry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="premium-card p-6">
          <div className="flex items-center justify-between mb-4">
            <Zap className="w-8 h-8 text-[#FFD60A]" />
            <span className="text-3xl font-bold text-white font-mono">
              {data.tracker_comparison.boxmot_botsort.speed_fps} FPS
            </span>
          </div>
          <p className="text-sm text-gray-400 mb-1">Max Tracking Speed (BoxMOT)</p>
          <p className="text-xs text-gray-500 font-mono">Continuous per-frame Kalman state</p>
        </div>

        <div className="premium-card p-6">
          <div className="flex items-center justify-between mb-4">
            <Activity className="w-8 h-8 text-[#00D4FF]" />
            <span className="text-3xl font-bold text-white font-mono">
              {data.localizer_comparison.sam3.cold_lock_on_latency_ms}ms
            </span>
          </div>
          <p className="text-sm text-gray-400 mb-1">Min Lock-on Latency (SAM3)</p>
          <p className="text-xs text-gray-500 font-mono">Cold-start phrase grounding stage</p>
        </div>

        <div className="premium-card p-6">
          <div className="flex items-center justify-between mb-4">
            <Cpu className="w-8 h-8 text-[#FF6B35]" />
            <span className="text-3xl font-bold text-white font-mono">
              {(data.vram_diagnostics.unified_pipeline_active_peak / 1024).toFixed(1)} GB
            </span>
          </div>
          <p className="text-sm text-gray-400 mb-1">Active GPU Peak VRAM</p>
          <div className="w-full bg-[rgba(255,255,255,0.1)] rounded-full h-1.5 mt-2">
            <div 
              className="bg-gradient-to-r from-[#FF6B35] to-[#DC143C] h-1.5 rounded-full" 
              style={{ width: `${vramPeakPct}%` }}
            ></div>
          </div>
        </div>

        <div className="premium-card p-6">
          <div className="flex items-center justify-between mb-4">
            <HardDrive className="w-8 h-8 text-[#9D4EDD]" />
            <span className="text-3xl font-bold text-white font-mono">
              {(data.vram_diagnostics.hardware_limit / 1024).toFixed(0)} GB
            </span>
          </div>
          <p className="text-sm text-gray-400 mb-1">Total GPU VRAM Ceiling</p>
          <div className="w-full bg-[rgba(255,255,255,0.1)] rounded-full h-1.5 mt-2">
            <div 
              className="bg-gradient-to-r from-primary to-primary/60 h-1.5 rounded-full" 
              style={{ width: '100%' }}
            ></div>
          </div>
        </div>
      </div>

      {/* Latency Waterfall / Breakdown Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2 premium-card p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Pipeline Stage-by-Stage Latency</h3>
          <p className="text-xs text-gray-400 mb-6">
            Comparative analysis of millisecond latency spent across pipeline stages (lower is faster).
          </p>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={latencyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="stage" stroke="#fff" style={{ fontSize: '11px' }} />
              <YAxis stroke="#fff" style={{ fontSize: '11px' }} label={{ value: 'ms', angle: -90, position: 'insideLeft', fill: '#fff' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(10, 15, 30, 0.95)',
                  border: '1px solid rgba(255, 214, 10, 0.3)',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="DINO Config (ms)" fill="#FF0055" radius={[4, 4, 0, 0]} />
              <Bar dataKey="SAM3 Config (ms)" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Latency summary card */}
        <div className="premium-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-[#FFD60A]" />
              Architectural Pipeline Summary
            </h3>
            
            <div className="space-y-4 mt-6">
              <div className="bg-black/30 p-4 rounded border border-gray-800/40">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>DINO + Bot-SORT Pipeline</span>
                  <span className="font-bold text-[#FF0055]">{Math.round(dinoTotalLatency)} ms total</span>
                </div>
                <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-[#FF0055] h-full" style={{ width: '100%' }} />
                </div>
              </div>

              <div className="bg-black/30 p-4 rounded border border-gray-800/40">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>SAM3 + Native Pipeline</span>
                  <span className="font-bold text-[#00D4FF]">{Math.round(sam3TotalLatency)} ms total</span>
                </div>
                <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-primary h-full" style={{ width: `${(sam3TotalLatency / dinoTotalLatency) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-800 text-xs text-gray-400 leading-relaxed">
            <span className="text-[#00D4FF] font-semibold">Stage Bottleneck:</span> The VLM description phase (Gemma 4 processing detailed target attributes) is the main pipeline bottleneck, requiring ~2500ms. In comparison, localizer lock-ons and segmentation are extremely fast (&lt;200ms).
          </div>
        </div>
      </div>

      {/* Accuracy / Software Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="premium-card p-6">
          <h3 className="text-md font-semibold text-white mb-4">Object Detection (mAP IoU)</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Grounding DINO</span>
                <span className="font-bold text-white">{data.localizer_comparison.grounding_dino.detection_iou}% IoU</span>
              </div>
              <div className="w-full bg-gray-800 h-2 rounded-full">
                <div className="bg-[#FF0055] h-2 rounded-full" style={{ width: `${data.localizer_comparison.grounding_dino.detection_iou}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>SAM 3</span>
                <span className="font-bold text-[#39FF14]">{data.localizer_comparison.sam3.detection_iou}% IoU</span>
              </div>
              <div className="w-full bg-gray-800 h-2 rounded-full">
                <div className="bg-primary h-2 rounded-full" style={{ width: `${data.localizer_comparison.sam3.detection_iou}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="premium-card p-6">
          <h3 className="text-md font-semibold text-white mb-4">OCR Character Extraction Accuracy</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Grounding DINO</span>
                <span className="font-bold text-red-500">{data.localizer_comparison.grounding_dino.ocr_success_rate}% Success</span>
              </div>
              <div className="w-full bg-gray-800 h-2 rounded-full">
                <div className="bg-red-500 h-2 rounded-full" style={{ width: `${data.localizer_comparison.grounding_dino.ocr_success_rate}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>SAM 3</span>
                <span className="font-bold text-[#39FF14]">{data.localizer_comparison.sam3.ocr_success_rate}% Success</span>
              </div>
              <div className="w-full bg-gray-800 h-2 rounded-full">
                <div className="bg-primary h-2 rounded-full" style={{ width: `${data.localizer_comparison.sam3.ocr_success_rate}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="premium-card p-6">
          <h3 className="text-md font-semibold text-white mb-4">Track ID Consistency</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>BoT-SORT Tracker</span>
                <span className="font-bold text-[#39FF14]">{data.tracker_comparison.boxmot_botsort.id_consistency_score}% Retention</span>
              </div>
              <div className="w-full bg-gray-800 h-2 rounded-full">
                <div className="bg-primary h-2 rounded-full" style={{ width: `${data.tracker_comparison.boxmot_botsort.id_consistency_score}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>SAM 3 Native Single-Shot</span>
                <span className="font-bold text-amber-500">{data.tracker_comparison.sam3_native.id_consistency_score}% Retention</span>
              </div>
              <div className="w-full bg-gray-800 h-2 rounded-full">
                <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${data.tracker_comparison.sam3_native.id_consistency_score}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
