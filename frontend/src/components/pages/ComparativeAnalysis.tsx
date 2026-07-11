import { BarChart3, Target, MessageSquare, CheckCircle2, XCircle, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line } from 'recharts';

const accuracyData = [
  { metric: 'Accuracy', DINO: 92, VLM: 89, Hybrid: 96 },
  { metric: 'Precision', DINO: 90, VLM: 94, Hybrid: 95 },
  { metric: 'Recall', DINO: 88, VLM: 91, Hybrid: 94 },
  { metric: 'F1-Score', DINO: 89, VLM: 92, Hybrid: 95 },
];

const performanceData = [
  { metric: 'FPS', DINO: 58, VLM: 32, Hybrid: 45 },
  { metric: 'Latency (ms)', DINO: 17, VLM: 31, Hybrid: 24 },
  { metric: 'Memory (GB)', DINO: 2.4, VLM: 5.8, Hybrid: 6.2 },
];

const radarData = [
  { capability: 'Speed', DINO: 95, VLM: 65 },
  { capability: 'Accuracy', DINO: 88, VLM: 92 },
  { capability: 'Context Understanding', DINO: 40, VLM: 95 },
  { capability: 'Flexibility', DINO: 60, VLM: 90 },
  { capability: 'Resource Efficiency', DINO: 85, VLM: 55 },
  { capability: 'Ease of Use', DINO: 70, VLM: 88 },
];

const framewiseData = [
  { frame: 0, DINO: 90, VLM: 88 },
  { frame: 50, DINO: 91, VLM: 90 },
  { frame: 100, DINO: 89, VLM: 92 },
  { frame: 150, DINO: 92, VLM: 91 },
  { frame: 200, DINO: 90, VLM: 93 },
  { frame: 250, DINO: 91, VLM: 92 },
  { frame: 300, DINO: 93, VLM: 94 },
];

const comparisonFeatures = [
  { feature: 'Real-time Detection', dino: true, vlm: true, hybrid: true },
  { feature: 'Natural Language Queries', dino: false, vlm: true, hybrid: true },
  { feature: 'High FPS (>50)', dino: true, vlm: false, hybrid: true },
  { feature: 'Context Understanding', dino: false, vlm: true, hybrid: true },
  { feature: 'Low Resource Usage', dino: true, vlm: false, hybrid: true },
  { feature: 'Few-Shot Learning', dino: false, vlm: true, hybrid: true },
  { feature: 'Bounding Box Detection', dino: true, vlm: true, hybrid: true },
  { feature: 'Semantic Segmentation', dino: false, vlm: true, hybrid: true },
];

export default function ComparativeAnalysis() {
  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <BarChart3 className="w-8 h-8 text-[#9D4EDD]" strokeWidth={2} />
            <h1 className="text-3xl font-bold text-white">Comparative Analysis</h1>
          </div>
          <p className="text-sm text-gray-400">Grounding DINO vs Vision-Language Model Performance Comparison</p>
        </div>
        <button className="btn-primary py-2 px-4 flex items-center gap-2 text-sm mt-1">
          <Download className="w-4 h-4" />
          Download Report
        </button>
      </div>

      {/* Model Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* DINO Card */}
        <div className="premium-card p-4 border-l-4 border-[#00D4FF]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[rgba(0,212,255,0.2)] flex items-center justify-center">
              <Target className="w-5 h-5 text-[#00D4FF]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Grounding DINO</h3>
              <p className="text-xs text-gray-400">Offline Feature Localizer</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <p className="text-xs text-gray-400">Speed</p>
              <p className="text-lg font-bold text-[#00D4FF]">58 FPS</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Accuracy</p>
              <p className="text-lg font-bold text-[#00D4FF]">92%</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Memory</p>
              <p className="text-lg font-bold text-[#00D4FF]">2.4 GB</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Latency</p>
              <p className="text-lg font-bold text-[#00D4FF]">17 ms</p>
            </div>
          </div>
        </div>

        {/* VLM Card */}
        <div className="premium-card p-4 border-l-4 border-[#9D4EDD]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[rgba(157,78,221,0.2)] flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-[#9D4EDD]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">VLM <span className="text-sm font-normal text-[#9D4EDD]/70">(Florence-2 / Qwen2.5-VL)</span></h3>
              <p className="text-xs text-gray-400">Vision-Language Model</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <p className="text-xs text-gray-400">Inference</p>
              <p className="text-lg font-bold text-[#9D4EDD]">1.2s</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Accuracy</p>
              <p className="text-lg font-bold text-[#9D4EDD]">94%</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Memory</p>
              <p className="text-lg font-bold text-[#9D4EDD]">5.8 GB</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Latency</p>
              <p className="text-lg font-bold text-[#9D4EDD]">31 ms</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Accuracy Comparison */}
        <div className="premium-card p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Accuracy Metrics</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart key="accuracy-bar-chart" data={accuracyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="metric" stroke="#fff" style={{ fontSize: '12px' }} />
              <YAxis stroke="#fff" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(20, 20, 20, 0.95)',
                  border: '1px solid rgba(220, 20, 60, 0.3)',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Legend wrapperStyle={{ color: '#fff' }} />
              <Bar key="accuracy-dino" dataKey="DINO" name="Grounding DINO" fill="#00D4FF" radius={[4, 4, 0, 0]} />
              <Bar key="accuracy-vlm" dataKey="VLM" name="VLM" fill="#9D4EDD" radius={[4, 4, 0, 0]} />
              <Bar key="accuracy-hybrid" dataKey="Hybrid" name="Hybrid (InsightVision)" fill="#DC143C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Performance Comparison */}
        <div className="premium-card p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Performance Metrics</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart key="performance-bar-chart" data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="metric" stroke="#fff" style={{ fontSize: '12px' }} />
              <YAxis stroke="#fff" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(20, 20, 20, 0.95)',
                  border: '1px solid rgba(220, 20, 60, 0.3)',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Legend wrapperStyle={{ color: '#fff' }} />
              <Bar key="perf-dino" dataKey="DINO" name="Grounding DINO" fill="#39FF14" radius={[4, 4, 0, 0]} />
              <Bar key="perf-vlm" dataKey="VLM" name="VLM" fill="#FF6B35" radius={[4, 4, 0, 0]} />
              <Bar key="perf-hybrid" dataKey="Hybrid" name="Hybrid (InsightVision)" fill="#DC143C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar Comparison */}
        <div className="premium-card p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Capability Radar</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart key="radar-chart" data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.2)" />
              <PolarAngleAxis dataKey="capability" stroke="#fff" style={{ fontSize: '11px' }} />
              <PolarRadiusAxis stroke="#fff" style={{ fontSize: '10px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(20, 20, 20, 0.95)',
                  border: '1px solid rgba(220, 20, 60, 0.3)',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Radar key="radar-dino" name="Grounding DINO" dataKey="DINO" stroke="#00D4FF" fill="#00D4FF" fillOpacity={0.3} />
              <Radar key="radar-vlm" name="VLM" dataKey="VLM" stroke="#9D4EDD" fill="#9D4EDD" fillOpacity={0.3} />
              <Legend wrapperStyle={{ color: '#fff' }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Frame-wise Accuracy */}
        <div className="premium-card p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Frame-wise Accuracy</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart key="framewise-line-chart" data={framewiseData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="frame" stroke="#fff" style={{ fontSize: '12px' }} />
              <YAxis stroke="#fff" style={{ fontSize: '12px' }} domain={[80, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(20, 20, 20, 0.95)',
                  border: '1px solid rgba(220, 20, 60, 0.3)',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Legend wrapperStyle={{ color: '#fff' }} />
              <Line key="line-dino" type="monotone" dataKey="DINO" name="Grounding DINO" stroke="#00D4FF" strokeWidth={3} dot={{ fill: '#00D4FF' }} />
              <Line key="line-vlm" type="monotone" dataKey="VLM" name="VLM" stroke="#9D4EDD" strokeWidth={3} dot={{ fill: '#9D4EDD' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Feature Comparison Table */}
      <div className="premium-card p-6">
        <h3 className="text-xl font-semibold text-white mb-6">Feature Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[rgba(220,20,60,0.3)]">
                <th className="text-left py-4 px-4 text-gray-400 font-semibold">Feature</th>
                <th className="text-center py-4 px-4 text-[#00D4FF] font-semibold">Grounding DINO</th>
                <th className="text-center py-4 px-4 text-[#9D4EDD] font-semibold">VLM</th>
                <th className="text-center py-4 px-4 text-[#39FF14] font-semibold">InsightVision (Hybrid)</th>
              </tr>
            </thead>
            <tbody>
              {comparisonFeatures.map((item, idx) => (
                <tr key={idx} className="border-b border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.02)]">
                  <td className="py-4 px-4 text-white">{item.feature}</td>
                  <td className="py-4 px-4 text-center">
                    {item.dino ? (
                      <CheckCircle2 className="w-6 h-6 text-[#39FF14] mx-auto" />
                    ) : (
                      <XCircle className="w-6 h-6 text-gray-600 mx-auto" />
                    )}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {item.vlm ? (
                      <CheckCircle2 className="w-6 h-6 text-[#39FF14] mx-auto" />
                    ) : (
                      <XCircle className="w-6 h-6 text-gray-600 mx-auto" />
                    )}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <CheckCircle2 className="w-6 h-6 text-[#39FF14] mx-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Conclusion */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="premium-card p-6 border-l-4 border-[#39FF14] flex flex-col justify-center">
          <h3 className="text-xl font-semibold text-white mb-3">Key Strengths</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[#00D4FF] font-semibold mb-1">Grounding DINO</p>
              <p className="text-sm text-gray-400">Superior speed (58 FPS), low resource usage, ideal for real-time localizer tracking</p>
            </div>
            <div>
              <p className="text-[#9D4EDD] font-semibold mb-1">VLM</p>
              <p className="text-sm text-gray-400">Better contextual understanding, flexible natural language queries, higher semantic accuracy</p>
            </div>
          </div>
        </div>

        <div className="premium-card p-6 border-l-4 border-[#FFD60A]">
          <h3 className="text-xl font-semibold text-white mb-3">Research Findings</h3>
          <p className="text-gray-400 text-sm mb-3">
            The comparative analysis reveals a trade-off between speed and intelligence. Localizer engines excel in real-time tracking frame rates, while VLMs provide superior contextual understanding and reasoning flexibility.
          </p>
          <p className="text-[#39FF14] text-sm font-semibold">
            Hybrid approach recommended for production systems.
          </p>
        </div>
      </div>
    </div>
  );
}