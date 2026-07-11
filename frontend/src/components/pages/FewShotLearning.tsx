import { useState } from 'react';
import { Sparkles, Upload, Plus, CheckCircle2, XCircle, Play } from 'lucide-react';

const learnedObjects = [
  {
    id: 1,
    name: 'Company Logo',
    samples: 3,
    trained: true,
    accuracy: 96,
    createdAt: '2 hours ago',
    color: '#FF0040'
  },
  {
    id: 2,
    name: 'Safety Helmet',
    samples: 5,
    trained: true,
    accuracy: 94,
    createdAt: '1 day ago',
    color: '#FFD60A'
  },
  {
    id: 3,
    name: 'Custom Tool',
    samples: 2,
    trained: false,
    accuracy: 0,
    createdAt: '10 min ago',
    color: '#9D4EDD'
  },
];

export default function FewShotLearning() {
  const [isTraining, setIsTraining] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [newObjectName, setNewObjectName] = useState('');
  const [autoLabel, setAutoLabel] = useState(true);
  const [baseModel, setBaseModel] = useState('groundingdino');

  const handleStartTraining = () => {
    setIsTraining(true);
    setTimeout(() => {
      setIsTraining(false);
    }, 3000);
  };

  return (
    <div className="h-screen flex flex-col p-4 overflow-hidden">
      {/* Header */}
      <div className="mb-4 shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <Sparkles className="w-6 h-6 text-[#FF6B35]" strokeWidth={2} />
          <h1 className="text-3xl font-bold text-white">Few-Shot Learning</h1>
        </div>
        <p className="text-sm text-gray-400">Train AI to recognize custom objects with minimal samples</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_24rem] gap-4 flex-1 min-h-0">
        {/* Training Interface */}
        <div className="flex flex-col gap-4 overflow-y-auto pr-2">
          {/* New Object Registration */}
          {showUpload ? (
            <div className="premium-card p-6 flex flex-col flex-grow">
              <h3 className="text-xl font-semibold text-white mb-4">Register New Object</h3>
              
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">Object Name</label>
                <input
                  type="text"
                  value={newObjectName}
                  onChange={(e) => setNewObjectName(e.target.value)}
                  placeholder="e.g., Custom Badge, Specific Tool"
                  className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(220,20,60,0.3)] rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#DC143C]"
                />
              </div>

              <div className="mb-6 flex justify-between items-center p-3 rounded-lg border border-[#00D4FF]/30 bg-[#00D4FF]/5">
                <div>
                  <h4 className="text-white text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#00D4FF]" /> AI-Assisted Annotation
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">Powered by Florence-2 Auto-Labeling</p>
                </div>
                <button
                  onClick={() => setAutoLabel(!autoLabel)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${autoLabel ? 'bg-[#00D4FF]' : 'bg-gray-600'}`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${autoLabel ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="mb-6 flex-1">
                <label className="block text-sm text-gray-400 mb-2">Upload Training Samples (1-5 images)</label>
                <div className="grid grid-cols-5 gap-3">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <div
                      key={num}
                      className="aspect-square border-2 border-dashed border-[rgba(220,20,60,0.3)] rounded-lg flex items-center justify-center hover:border-[#DC143C] transition-colors cursor-pointer bg-black/20"
                    >
                      <div className="text-center">
                        <Upload className="w-5 h-5 text-gray-500 mx-auto mb-1" />
                        <p className="text-[10px] text-gray-500">{num}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-[10px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded text-[#DC143C] bg-[#DC143C]/10 border border-[#DC143C]/20">One-Shot Mode</span>
                  <p className="text-xs text-gray-400">Upload 1 image for One-Shot, 5 for optimal accuracy.</p>
                </div>
              </div>

              <div className="flex gap-3 shrink-0">
                {isTraining ? (
                  <div className="flex-1 bg-[rgba(220,20,60,0.1)] border border-[#DC143C] py-2.5 px-4 rounded-lg relative overflow-hidden flex flex-col justify-center">
                    <div className="absolute left-0 top-0 bottom-0 bg-[#DC143C]/20 animate-pulse" style={{ width: '60%' }}></div>
                    <div className="relative z-10 flex justify-between items-center">
                      <span className="text-sm font-semibold text-[#DC143C] flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border-2 border-[#DC143C] border-t-transparent animate-spin"/>
                        Refining Embeddings...
                      </span>
                      <span className="text-xs text-[#DC143C] font-mono">15s remaining</span>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleStartTraining}
                    className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!newObjectName.trim()}
                  >
                    <Play className="w-4 h-4" />
                    Start Training
                  </button>
                )}
                <button
                  onClick={() => setShowUpload(false)}
                  className="btn-secondary px-6 py-2.5 text-sm"
                  disabled={isTraining}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="premium-card p-6">
              <div className="text-center py-12">
                <div className="w-20 h-20 rounded-full bg-[rgba(255,107,53,0.2)] flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-10 h-10 text-[#FF6B35]" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-2">Add New Object Class</h3>
                <p className="text-gray-400 mb-6">Upload 1-5 sample images to train the model</p>
                <button
                  onClick={() => setShowUpload(true)}
                  className="btn-primary px-8 py-3"
                >
                  Register New Object
                </button>
              </div>
            </div>
          )}

          {/* Content replaced by direct inline interaction */}

          {/* How It Works */}
          <div className="premium-card p-6 flex-grow flex flex-col justify-center">
            <h3 className="text-xl font-semibold text-white mb-4">How Few-Shot Learning Works</h3>
            
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-[rgba(0,212,255,0.2)] flex items-center justify-center flex-shrink-0">
                  <span className="text-[#00D4FF] font-bold">1</span>
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">Upload Samples</h4>
                  <p className="text-sm text-gray-400">Provide 1-5 images of the object you want to detect</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-[rgba(57,255,20,0.2)] flex items-center justify-center flex-shrink-0">
                  <span className="text-[#39FF14] font-bold">2</span>
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">Quick Training</h4>
                  <p className="text-sm text-gray-400">Model adapts to recognize your custom object (takes ~30 seconds)</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-[rgba(157,78,221,0.2)] flex items-center justify-center flex-shrink-0">
                  <span className="text-[#9D4EDD] font-bold">3</span>
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">Deploy & Detect</h4>
                  <p className="text-sm text-gray-400">Start detecting your custom object in real-time</p>
                </div>
              </div>
            </div>
          </div>

          {/* End of Left Column Contents */}
        </div>

        {/* Learned Objects Panel */}
        <div className="space-y-4 overflow-y-auto pr-2 pb-2">
          {/* Training Settings */}
          <div className="premium-card p-5">
            <h3 className="text-lg font-semibold text-white mb-4">Training Settings</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Base Model</label>
                <select 
                  value={baseModel}
                  onChange={(e) => setBaseModel(e.target.value)}
                  className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(220,20,60,0.3)] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#DC143C]"
                >
                  <option className="bg-black text-white" value="groundingdino">Grounding DINO (Precision)</option>
                  <option className="bg-black text-white" value="sam3">SAM 3 (Instance Segmentation)</option>
                  <option className="bg-black text-white" value="dino-gemma4">DINO + Gemma 4 VLM</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Confidence Threshold</label>
                <select className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(220,20,60,0.3)] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#DC143C]" defaultValue="0.50">
                  <option className="bg-black text-white" value="0.25">0.25 (Low)</option>
                  <option className="bg-black text-white" value="0.50">0.50 (Balanced)</option>
                  <option className="bg-black text-white" value="0.75">0.75 (Strict)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">IoU Threshold</label>
                <select className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(220,20,60,0.3)] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#DC143C]" defaultValue="0.50">
                  <option className="bg-black text-white" value="0.45">0.45</option>
                  <option className="bg-black text-white" value="0.50">0.50 (Standard)</option>
                  <option className="bg-black text-white" value="0.60">0.60 (Strict)</option>
                </select>
              </div>

              <div className="pt-3 mt-4 border-t border-[rgba(255,255,255,0.1)]">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Expected VRAM Impact</span>
                  <span className="text-xs font-mono text-[#FFD60A] bg-[#FFD60A]/10 px-2 py-1 rounded border border-[#FFD60A]/20">
                    {baseModel === 'groundingdino' ? '+1.2 GB' : baseModel === 'sam3' ? '+2.4 GB' : '+3.1 GB'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Learned Objects List */}
          <div className="premium-card p-5 overflow-y-auto" style={{ maxHeight: '60vh', scrollbarWidth: 'thin', scrollbarColor: 'rgba(220,20,60,0.6) transparent' }}>
            <h3 className="text-lg font-semibold text-white mb-3">Custom Objects</h3>
            
            <div className="space-y-3">
              {learnedObjects.map((obj) => (
                <div
                  key={obj.id}
                  className="p-4 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(220,20,60,0.3)]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: obj.color }}
                      ></div>
                      <span className="font-semibold text-white">{obj.name}</span>
                    </div>
                    {obj.trained ? (
                      <CheckCircle2 className="w-5 h-5 text-[#39FF14]" />
                    ) : (
                      <XCircle className="w-5 h-5 text-gray-600" />
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Samples</span>
                      <span className="text-white">{obj.samples}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status</span>
                      <span className={obj.trained ? 'text-[#39FF14]' : 'text-gray-500'}>
                        {obj.trained ? 'Trained' : 'Pending'}
                      </span>
                    </div>
                    {obj.trained && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Accuracy</span>
                        <span className="text-white">{obj.accuracy}%</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-400">Created</span>
                      <span className="text-white">{obj.createdAt}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3 pt-3 border-t border-[rgba(255,255,255,0.1)]">
                    {obj.trained ? (
                      <>
                        <button className="flex-1 text-xs py-2 px-3 rounded bg-[rgba(57,255,20,0.1)] text-[#39FF14] border border-[#39FF14]/30 hover:bg-[rgba(57,255,20,0.2)]">
                          Use Model
                        </button>
                        <button className="flex-1 text-xs py-2 px-3 rounded bg-[rgba(255,255,255,0.05)] text-gray-300 border border-[rgba(220,20,60,0.3)]">
                          Retrain
                        </button>
                      </>
                    ) : (
                      <button className="flex-1 text-xs py-2 px-3 rounded bg-[rgba(255,107,53,0.1)] text-[#FF6B35] border border-[#FF6B35]/30 hover:bg-[rgba(255,107,53,0.2)]">
                        Continue Training
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Restored Statistics at the very bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4 shrink-0 pb-2">
        <div className="premium-card p-4 text-center">
          <p className="text-3xl font-bold text-[#00D4FF] mb-1" style={{ textShadow: '0 0 15px rgba(0,212,255,0.5)' }}>{learnedObjects.length}</p>
          <p className="text-xs text-gray-400 uppercase tracking-wider">Total Custom Objects</p>
        </div>
        <div className="premium-card p-4 text-center">
          <p className="text-3xl font-bold text-[#39FF14] mb-1" style={{ textShadow: '0 0 15px rgba(57,255,20,0.5)' }}>
            {learnedObjects.filter(o => o.trained).length}
          </p>
          <p className="text-xs text-gray-400 uppercase tracking-wider">Active Trained Models</p>
        </div>
        <div className="premium-card p-4 text-center">
          <p className="text-3xl font-bold text-[#DC143C] mb-1" style={{ textShadow: '0 0 15px rgba(220,20,60,0.5)' }}>
            {Math.round(learnedObjects.filter(o => o.trained).reduce((acc, o) => acc + o.accuracy, 0) / (learnedObjects.filter(o => o.trained).length || 1))}%
          </p>
          <p className="text-xs text-gray-400 uppercase tracking-wider">Average Model Accuracy</p>
        </div>
      </div>
    </div>
  );
}
