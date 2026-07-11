import { Settings as SettingsIcon, Shield, Palette, Zap, Download, RotateCcw, Trash2, TrendingUp, Cloud, ExternalLink, X } from 'lucide-react';
import { useState } from 'react';

export default function Settings() {
  const [notifications, setNotifications] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [hardwareAcceleration, setHardwareAcceleration] = useState(true);
  const [accentColor, setAccentColor] = useState('#DC143C');
  const [showToast, setShowToast] = useState(false);

  const handleSave = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className="h-screen overflow-y-auto p-4 lg:p-8 custom-scrollbar relative">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-8 right-8 z-50 animate-pulse">
          <div className="bg-[#1a0509] border border-[#DC143C] p-4 rounded-lg shadow-[0_0_20px_rgba(220,20,60,0.4)] flex items-center gap-3">
            <Shield className="w-5 h-5 text-[#DC143C]" />
            <span className="text-white font-semibold tracking-wide pr-6">Settings Saved Successfully!</span>
            <button onClick={() => setShowToast(false)} className="text-gray-400 hover:text-white absolute right-4">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <SettingsIcon className="w-8 h-8 text-gray-400" strokeWidth={2} />
          <h1 className="text-4xl font-bold text-white">Settings</h1>
        </div>
        <p className="text-gray-400">Configure application preferences and system options</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Settings */}
          <div className="premium-card p-6">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-[#00D4FF]" />
              General Settings
            </h3>

            <div className="space-y-6">
              {/* Auto-save */}
              <div className="flex items-center justify-between py-3 border-b border-[rgba(255,255,255,0.1)]">
                <div>
                  <p className="text-white font-semibold">Auto-save Results</p>
                  <p className="text-sm text-gray-400">Automatically save detection results</p>
                </div>
                <button
                  onClick={() => setAutoSave(!autoSave)}
                  className={`w-12 h-6 rounded-full transition-all flex items-center px-1 ${
                    autoSave ? 'bg-[#39FF14] shadow-[0_0_12px_rgba(57,255,20,0.5)]' : 'bg-gray-600'
                  }`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full transition-transform ${
                      autoSave ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  ></div>
                </button>
              </div>

              {/* Notifications */}
              <div className="flex items-center justify-between py-3 border-b border-[rgba(255,255,255,0.1)]">
                <div>
                  <p className="text-white font-semibold">Notifications</p>
                  <p className="text-sm text-gray-400">Enable system notifications</p>
                </div>
                <button
                  onClick={() => setNotifications(!notifications)}
                  className={`w-12 h-6 rounded-full transition-all flex items-center px-1 ${
                    notifications ? 'bg-[#39FF14] shadow-[0_0_12px_rgba(57,255,20,0.5)]' : 'bg-gray-600'
                  }`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full transition-transform ${
                      notifications ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  ></div>
                </button>
              </div>

              {/* Hardware Acceleration */}
              <div className="flex items-center justify-between py-3 border-b border-[rgba(255,255,255,0.1)]">
                <div>
                  <p className="text-white font-semibold">Hardware Acceleration</p>
                  <p className="text-sm text-gray-400">Use GPU for faster processing</p>
                </div>
                <button
                  onClick={() => setHardwareAcceleration(!hardwareAcceleration)}
                  className={`w-12 h-6 rounded-full transition-all flex items-center px-1 ${
                    hardwareAcceleration ? 'bg-[#39FF14] shadow-[0_0_12px_rgba(57,255,20,0.5)]' : 'bg-gray-600'
                  }`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full transition-transform ${
                      hardwareAcceleration ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  ></div>
                </button>
              </div>

              {/* Storage Location */}
              <div className="py-3 border-b border-[rgba(255,255,255,0.1)]">
                <p className="text-white font-semibold mb-2">Storage Location</p>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value="/Users/insightvision/data"
                    readOnly
                    className="flex-1 bg-[rgba(255,255,255,0.05)] border border-[rgba(220,20,60,0.3)] rounded-lg px-4 py-2 text-white"
                  />
                  <button className="btn-secondary px-4">Browse</button>
                </div>
              </div>

              {/* Default Model */}
              <div className="py-3">
                <p className="text-white font-semibold mb-2">Default Detection Model</p>
                <select className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(220,20,60,0.3)] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#DC143C]">
                  <option className="bg-black text-white">Grounding DINO (Recommended)</option>
                  <option className="bg-black text-white">SAM 3</option>
                  <option className="bg-black text-white">Florence-2</option>
                  <option className="bg-black text-white">OWLv2</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tracking Defaults */}
          <div className="premium-card p-6">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#39FF14]" />
              Tracking Defaults
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-white font-semibold mb-2">Tracking Algorithm</label>
                <select className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(220,20,60,0.3)] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#DC143C]">
                  <option className="bg-black text-white" value="bytetrack">ByteTrack (Fast)</option>
                  <option className="bg-black text-white" value="deepsort">DeepSORT (Robust)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Cloud Integration */}
          <div className="premium-card p-6">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Cloud className="w-5 h-5 text-[#00FFFF]" />
              Cloud Services
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-white font-semibold mb-2">Provider</label>
                <select className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(220,20,60,0.3)] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#DC143C]">
                  <option className="bg-black text-white">Local (Edge Config)</option>
                  <option className="bg-black text-white">AWS (SageMaker)</option>
                  <option className="bg-black text-white">GCP (Vertex AI)</option>
                </select>
              </div>
              <div>
                <label className="block text-white font-semibold mb-2">API Endpoint / Key</label>
                <input
                  type="password"
                  placeholder="Enter API Key or Endpoint URL"
                  className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(220,20,60,0.3)] rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#DC143C]"
                />
              </div>
            </div>
          </div>

          {/* Performance Settings */}
          <div className="premium-card p-6">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#FFD60A]" />
              Performance Settings
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-white font-semibold mb-2">Target FPS</label>
                <select className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(220,20,60,0.3)] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#DC143C]">
                  <option className="bg-black text-white">30 FPS</option>
                  <option className="bg-black text-white">60 FPS (Max)</option>
                  <option className="bg-black text-white">Max Performance</option>
                </select>
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">Precision Mode</label>
                <select className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(220,20,60,0.3)] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#DC143C]">
                  <option className="bg-black text-white">FP16 (Recommended)</option>
                  <option className="bg-black text-white">FP32 (High Precision)</option>
                  <option className="bg-black text-white">INT8 (Fast)</option>
                </select>
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">Batch Size</label>
                <select className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(220,20,60,0.3)] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#DC143C]">
                  <option className="bg-black text-white">1 (Real-time)</option>
                  <option className="bg-black text-white">4</option>
                  <option className="bg-black text-white">8</option>
                  <option className="bg-black text-white">16</option>
                </select>
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">Multi-threading</label>
                <select className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(220,20,60,0.3)] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#DC143C]">
                  <option className="bg-black text-white">Auto (Recommended)</option>
                  <option className="bg-black text-white">2 threads</option>
                  <option className="bg-black text-white">4 threads</option>
                  <option className="bg-black text-white">8 threads</option>
                </select>
              </div>
            </div>
          </div>

          {/* Appearance Settings */}
          <div className="premium-card p-6">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Palette className="w-5 h-5 text-[#9D4EDD]" />
              Appearance
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-white font-semibold mb-2">Theme</label>
                <select className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(220,20,60,0.3)] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#DC143C]">
                  <option className="bg-black text-white">Dark (Default)</option>
                  <option className="bg-black text-white">Light</option>
                  <option className="bg-black text-white">Auto</option>
                </select>
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">Accent Color</label>
                <div className="grid grid-cols-6 gap-3">
                  {['#DC143C', '#FF0040', '#00D4FF', '#39FF14', '#9D4EDD', '#FFD60A'].map(color => (
                    <button
                      key={color}
                      onClick={() => setAccentColor(color)}
                      className={`w-full aspect-square rounded-lg border-2 transition-all ${
                        accentColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:border-white/50'
                      }`}
                      style={{ backgroundColor: color }}
                    ></button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">Animation Speed</label>
                <select className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(220,20,60,0.3)] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#DC143C]">
                  <option className="bg-black text-white">Normal</option>
                  <option className="bg-black text-white">Fast</option>
                  <option className="bg-black text-white">Slow</option>
                  <option className="bg-black text-white">None</option>
                </select>
              </div>
            </div>
          </div>

          {/* Privacy & Security */}
          <div className="premium-card p-6">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#39FF14]" />
              Privacy & Security
            </h3>

            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-[rgba(255,255,255,0.05)]">
                <p className="text-white font-semibold mb-2">Data Collection</p>
                <p className="text-sm text-gray-400 mb-3">
                  InsightVision processes all data locally. No personal or sensitive data is collected or sent to external servers.
                </p>
                <button className="text-sm text-[#00D4FF] hover:underline">Learn more about privacy</button>
              </div>

              <div>
                <button className="w-full btn-secondary py-3 text-left flex items-center justify-between">
                  <span>Clear Cache</span>
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div>
                <button className="w-full btn-secondary py-3 text-left flex items-center justify-between">
                  <span>Clear History</span>
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="premium-card p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button onClick={handleSave} className="w-full btn-primary py-3 flex items-center justify-center gap-2 relative overflow-hidden group">
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 slant-glow"></div>
                <Download className="w-5 h-5 relative z-10" />
                <span className="relative z-10">Save Settings</span>
              </button>
              <button className="w-full btn-secondary py-3 flex items-center justify-center gap-2">
                <RotateCcw className="w-5 h-5" />
                Reset to Default
              </button>
            </div>
          </div>

          {/* System Info */}
          <div className="premium-card p-6">
            <h3 className="text-xl font-semibold text-white mb-4">System Info</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Version</span>
                <span className="text-white">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Build</span>
                <span className="text-white">2026.01.26</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Platform</span>
                <span className="text-white">Web</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">License</span>
                <span className="text-[#39FF14] font-semibold flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" /> Verified
                </span>
              </div>
            </div>
            
            <button className="w-full mt-5 flex items-center justify-center gap-2 py-2.5 bg-[rgba(0,212,255,0.1)] border border-[#00D4FF]/30 text-[#00D4FF] rounded-lg text-sm hover:bg-[#00D4FF] hover:text-black transition-all shadow-[0_0_15px_rgba(0,212,255,0.15)]">
              <ExternalLink className="w-4 h-4" /> View Research Proposal
            </button>
          </div>

          {/* Updates */}
          <div className="premium-card p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Updates</h3>
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-[#39FF14]"></div>
                <span className="text-white font-semibold">Up to date</span>
              </div>
              <p className="text-sm text-gray-400">You're running the latest version</p>
            </div>
            <button className="w-full btn-secondary py-2 text-sm">
              Check for Updates
            </button>
          </div>

          {/* Help */}
          <div className="premium-card p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Help & Support</h3>
            <div className="space-y-2">
              <button className="w-full text-left py-2 text-sm text-gray-300 hover:text-white transition-colors">
                Documentation
              </button>
              <button className="w-full text-left py-2 text-sm text-gray-300 hover:text-white transition-colors">
                Report a Bug
              </button>
              <button className="w-full text-left py-2 text-sm text-gray-300 hover:text-white transition-colors">
                Feature Request
              </button>
              <button className="w-full text-left py-2 text-sm text-gray-300 hover:text-white transition-colors">
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
