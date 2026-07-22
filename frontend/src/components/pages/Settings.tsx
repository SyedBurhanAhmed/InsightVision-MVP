import { Settings as SettingsIcon, Shield, Download, RotateCcw, Trash2, TrendingUp, Cloud, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../lib/api-config';

export default function Settings() {
  const [notifications, setNotifications] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [hardwareAcceleration, setHardwareAcceleration] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [storageLocation, setStorageLocation] = useState('');
  const [defaultModel, setDefaultModel] = useState('grounding_dino');
  const [trackingAlgorithm, setTrackingAlgorithm] = useState('botsort');
  const [cloudProvider, setCloudProvider] = useState('local');
  const [cloudApiKey, setCloudApiKey] = useState('');

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/config`)
      .then((res) => res.json())
      .then((data) => {
        setStorageLocation(data.storage_location || '');
        setDefaultModel(data.default_model || 'grounding_dino');
        setTrackingAlgorithm(data.tracking_algorithm || 'botsort');
        setHardwareAcceleration(!!data.hardware_acceleration);
        setNotifications(!!data.notifications);
        setAutoSave(!!data.auto_save);
        setCloudProvider(data.cloud_provider || 'local');
        setCloudApiKey(data.cloud_api_key || '');
      })
      .catch((err) => console.error("Failed to load settings config:", err));
  }, []);

  const handleSave = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storage_location: storageLocation,
          default_model: defaultModel,
          tracking_algorithm: trackingAlgorithm,
          hardware_acceleration: hardwareAcceleration,
          notifications: notifications,
          auto_save: autoSave,
          cloud_provider: cloudProvider,
          cloud_api_key: cloudApiKey
        })
      });
      if (res.ok) {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
    }
  };

  const handleReset = async () => {
    const defaultStorage = `/home/burhan/projects/InsightVision-MVP/backend/outputs`;
    try {
      const res = await fetch(`${API_BASE_URL}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storage_location: defaultStorage,
          default_model: 'grounding_dino',
          tracking_algorithm: 'botsort',
          hardware_acceleration: true,
          notifications: true,
          auto_save: true,
          cloud_provider: 'local',
          cloud_api_key: ''
        })
      });
      if (res.ok) {
        setStorageLocation(defaultStorage);
        setDefaultModel('grounding_dino');
        setTrackingAlgorithm('botsort');
        setHardwareAcceleration(true);
        setNotifications(true);
        setAutoSave(true);
        setCloudProvider('local');
        setCloudApiKey('');
        alert("Settings reset to defaults!");
      }
    } catch (err) {
      console.error("Failed to reset settings:", err);
    }
  };

  const handleClearCache = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/cache/clear`, { method: 'POST' });
      if (res.ok) {
        alert("Redis and in-memory caches cleared successfully!");
      }
    } catch (err) {
      console.error("Failed to clear cache:", err);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm("Are you sure you want to clear all session history? This action is irreversible.")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/session/history/clear`, { method: 'POST' });
      if (res.ok) {
        alert("Session history timeline cleared successfully!");
      }
    } catch (err) {
      console.error("Failed to clear history:", err);
    }
  };

  return (
    <div className="h-screen overflow-y-auto p-4 lg:p-8 custom-scrollbar relative">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-8 right-8 z-50 animate-pulse">
          <div className="bg-card border border-primary/30 p-4 rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.2)] flex items-center gap-3">
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
                    autoSave ? 'bg-primary shadow-[0_0_12px_rgba(6,182,212,0.4)]' : 'bg-gray-600'
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
                    notifications ? 'bg-primary shadow-[0_0_12px_rgba(6,182,212,0.4)]' : 'bg-gray-600'
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
                    hardwareAcceleration ? 'bg-primary shadow-[0_0_12px_rgba(6,182,212,0.4)]' : 'bg-gray-600'
                  }`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full transition-transform ${
                      hardwareAcceleration ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  ></div>
                </button>
              </div>

              {/* Multi-Camera Tracking */}
              <div className="flex items-center justify-between py-3 border-b border-[rgba(255,255,255,0.1)] opacity-50">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold">Cross-Camera Re-ID</p>
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-800 text-gray-400 px-1.5 py-0.5 rounded border border-gray-700">
                      Phase 2
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">Match target appearance embeddings across camera streams</p>
                </div>
                <button
                  disabled
                  className="w-12 h-6 rounded-full bg-slate-800 flex items-center px-1 cursor-not-allowed border border-gray-700"
                >
                  <div className="w-4 h-4 bg-gray-600 rounded-full translate-x-0"></div>
                </button>
              </div>

              {/* Storage Location */}
              <div className="py-3 border-b border-[rgba(255,255,255,0.1)]">
                <p className="text-white font-semibold mb-2">Storage Location</p>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={storageLocation}
                    onChange={(e) => setStorageLocation(e.target.value)}
                    className="flex-1 bg-[rgba(255,255,255,0.05)] border border-border rounded-lg px-4 py-2 text-white"
                  />
                </div>
              </div>

              {/* Default Model */}
              <div className="py-3">
                <p className="text-white font-semibold mb-2">Default Detection Model</p>
                <select
                  value={defaultModel}
                  onChange={(e) => setDefaultModel(e.target.value)}
                  className="w-full bg-[rgba(255,255,255,0.05)] border border-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                >
                  <option className="bg-black text-white" value="grounding_dino">Grounding DINO (Recommended)</option>
                  <option className="bg-black text-white" value="sam3">SAM 3</option>
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
                <select
                  value={trackingAlgorithm}
                  onChange={(e) => setTrackingAlgorithm(e.target.value)}
                  className="w-full bg-[rgba(255,255,255,0.05)] border border-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                >
                  <option className="bg-black text-white" value="botsort">BoT-SORT (Robust)</option>
                  <option className="bg-black text-white" value="bytetrack">ByteTrack (Fast)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Cloud Integration */}
          <div className="premium-card p-6">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Cloud className="w-5 h-5 text-primary" />
              Cloud Services
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-white font-semibold mb-2">Provider</label>
                <select
                  value={cloudProvider}
                  onChange={(e) => setCloudProvider(e.target.value)}
                  className="w-full bg-[rgba(255,255,255,0.05)] border border-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                >
                  <option className="bg-black text-white" value="local">Local (Edge Config)</option>
                  <option className="bg-black text-white" value="groq">Groq Cloud API</option>
                </select>
              </div>
              {cloudProvider === 'groq' && (
                <div>
                  <label className="block text-white font-semibold mb-2">Groq API Key</label>
                  <input
                    type="password"
                    value={cloudApiKey}
                    onChange={(e) => setCloudApiKey(e.target.value)}
                    placeholder="Enter Groq API Key (gsk_...)"
                    className="w-full bg-[rgba(255,255,255,0.05)] border border-border rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-primary"
                  />
                </div>
              )}
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
                <p className="text-white font-semibold mb-2">Data Processing & Privacy</p>
                <p className="text-sm text-gray-400 mb-3 leading-relaxed">
                  InsightVision processes video frames and runs inference locally on the Edge GPU. When "Local (Edge Config)" is selected, natural language queries are parsed locally using a local Gemma 4 model. If external cloud APIs are configured (e.g. Groq Cloud), query text is sent to the configured provider for parsing, but no video frames are transmitted.
                </p>
              </div>

              <div>
                <button onClick={handleClearCache} className="w-full btn-secondary py-3 text-left flex items-center justify-between">
                  <span>Clear Cache</span>
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div>
                <button onClick={handleClearHistory} className="w-full btn-secondary py-3 text-left flex items-center justify-between">
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
              <button onClick={handleSave} className="w-full btn-primary py-3 flex items-center justify-center gap-2 relative overflow-hidden group animate-none">
                <Download className="w-5 h-5 relative z-10" />
                <span className="relative z-10">Save Settings</span>
              </button>
              <button onClick={handleReset} className="w-full btn-secondary py-3 flex items-center justify-center gap-2">
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
                <span className="text-white font-mono">0.3.0 (API)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Platform</span>
                <span className="text-white">WSL2 / Ubuntu</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">License</span>
                <span className="text-primary font-semibold flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" /> Academic
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
