import {
  Info, Users, Award, BookOpen, Link2, Mail, ExternalLink, Shield,
  Target, Brain, Server, Layers, Camera, Code, Activity, Database,
  Wifi, Eye, FlaskConical, Globe
} from 'lucide-react';
import burhanProfile from '../../assets/burhan.png';

// ─── Team ─────────────────────────────────────────────────────────────────────
// Burhan's contact info is confirmed. Waleed and Fatima contact info are
// intentional TODO placeholders — do NOT guess.

const teamMembers = [
  {
    name: 'Syed Burhan Ahmed',
    role: 'AI/ML Architecture & Backend Pipeline Lead',
    contribution:
      'Owns the detection/tracking/OCR pipeline architecture and the dual-backend ' +
      '(Grounding DINO / SAM 3) evaluation and integration. Designed and implemented the ' +
      'WebSocket live session system and the three-tier benchmark methodology that drives ' +
      'every architectural decision in the shipped system.',
    email: 'syedburhanahmedd@gmail.com',
    linkedin: 'https://www.linkedin.com/in/syed-burhan-ahmed/',
    github: 'https://github.com/SyedBurhanAhmed',
    website: 'https://syedburhanahmed.dev/',
    emailDisplay: 'syedburhanahmedd@gmail.com',
    image: burhanProfile,
  },
  {
    name: 'Waleed Ahmed',
    role: 'Model Research & Technical Documentation',
    contribution:
      // TODO: confirm full wording with Waleed before defense
      'Contributed to the literature review and candidate model identification during the ' +
      'three-tier evaluation process — helping determine which open-source models ' +
      '(Grounding DINO, SAM 3, Florence-2, Qwen2.5-VL, OmDet-Turbo, CLIP, etc.) were ' +
      'worth benchmarking — and maintained technical documentation across the project.',
    // TODO: confirm Waleed's email and LinkedIn before defense
    email: 'Wal33d.ahm.d@gmail.com',
    linkedin: '#',
    github: '#',
    emailDisplay: 'Wal33d.ahm.d@gmail.com',
  },
  {
    name: 'Fatima Surraya Islam',
    role: 'UI/UX Design & Full-Stack / Mobile Development',
    contribution:
      // TODO: confirm full wording with Fatima before defense
      'Created the early Figma UI/UX design and built the initial frontend implementation. ' +
      'Independently developed a separate backend and Flutter mobile app on a parallel branch, ' +
      'with reconciliation of her backend work against the main system\'s API surface ' +
      'via a unified contract forming part of the integration effort.',
    // TODO: confirm Fatima's email and LinkedIn before defense
    email: 'Fatimaislam1611@gmail.com',
    linkedin: '#',
    github: '#',
    emailDisplay: 'Fatimaislam1611@gmail.com',
  },
];

// ─── Technologies (verified against requirements.txt and backend imports) ─────
// Removed: TensorRT (not present anywhere in the codebase)
// Removed: DeepSORT (only BoT-SORT and ByteTrack are implemented)
// Removed: Florence-2 (evaluated as candidate during benchmark; NOT shipped)
// Added: SAM 3, Gemma 4, BoT-SORT, WebSocket, Redis, TypeScript

const technologies = [
  { name: 'Grounding DINO', category: 'Object Detection', color: '#00D4FF', icon: Target },
  { name: 'SAM 3', category: 'Promptable Segmentation', color: '#00FFFF', icon: Eye },
  { name: 'Gemma 4 (google/gemma-4-E2B-it)', category: 'Vision-Language / OCR', color: '#FF6B35', icon: Brain },
  { name: 'BoT-SORT (via BoxMOT)', category: 'Multi-Object Tracking', color: '#FF0040', icon: Activity },
  { name: 'FastAPI + WebSocket', category: 'Backend & Live Protocol', color: '#9D4EDD', icon: Server },
  { name: 'Redis', category: 'Inference Caching', color: '#FFD60A', icon: Database },
  { name: 'React + TypeScript', category: 'Frontend', color: '#00D4FF', icon: Code },
  { name: 'PyTorch', category: 'Deep Learning Runtime', color: '#EE4B2B', icon: Layers },
  { name: 'OpenCV', category: 'Video Processing', color: '#39FF14', icon: Camera },
  { name: 'Groq API (LLaMA 3)', category: 'Query Parsing (Cloud fallback)', color: '#A0A0FF', icon: Wifi },
];

// ─── Features (real, specific capabilities — no generic boilerplate) ──────────
// NOTE: "few-shot learning" intentionally NOT used. Grounding DINO and SAM 3
// operate via open-vocabulary / zero-shot detection through text prompts.
// NOTE: "session history & export" → history viewing only; no export endpoint exists.

const features = [
  'Natural-language target acquisition on live video — describe a target in plain English; system locks on and tracks it continuously across frames',
  'Persistent multi-object tracking via BoT-SORT: track_id maintained continuously across the full live stream, not re-derived per query',
  'Runtime-swappable detection backend (Grounding DINO ↔ SAM 3) — switchable live in the session init payload with no redeploy required',
  'Pending-target acquisition — lock-on triggers automatically when a described target enters frame, even if the command was issued before the target is visible',
  'Live RTSP camera integration with interactive mid-stream querying',
  'OCR follow-up queries with multi-frame voting across 4–5 sampled crops for accuracy',
  'Semantic segmentation via SAM 3 on tracked regions (on-demand)',
  'Session history timeline — view-only (export not yet implemented)',
  'Rigorous three-tier evaluation methodology (closed-source ceiling → human baseline → open-source candidates) underpinning every architectural decision',
];

export default function About() {
  return (
    <div className="min-h-screen max-h-[100vh] overflow-y-auto p-8 custom-scrollbar">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Info className="w-8 h-8 text-primary" strokeWidth={2} />
          <h1 className="text-4xl font-bold text-white">About InsightVision</h1>
        </div>
        <p className="text-gray-400">Final Year Capstone Project 2026 — University of Management and Technology</p>
      </div>

      {/* Project Overview */}
      <div className="premium-card p-8 mb-8">
        <h2 className="text-3xl font-bold text-white mb-4">
          <span className="text-primary">Insight</span>Vision
        </h2>
        <p className="text-xl text-gray-300 mb-6">
          Vision-Language Empowered Object Tracking & Detection System
        </p>
        <p className="text-gray-400 leading-relaxed mb-4">
          InsightVision is a hybrid computer vision pipeline enabling operators to describe a surveillance target
          in plain English and have the system automatically locate, lock onto, and continuously track it across
          a live video stream. Rather than choosing between a fast localizer or a powerful language model,
          the system splits the workload: a compact open-vocabulary detector (Grounding DINO or SAM 3) handles
          per-frame bounding box prediction at real-time rates, while a Vision-Language Model (Gemma 4) handles
          OCR follow-ups and complex visual queries only when explicitly triggered.
        </p>
        <p className="text-gray-400 leading-relaxed">
          The architecture emerged from a structured three-tier evaluation study comparing closed-source VLM ceilings,
          a human-expert baseline, and multiple open-source candidates — including OmDet-Turbo, CLIP, Florence-2,
          Qwen2.5-VL, and Grounding DINO — across cold lock-on latency, bounding box quality, VRAM footprint,
          and downstream OCR reliability. Every design decision in the shipped system traces back to a measured
          result from that study.
        </p>
      </div>

      {/* Key Features + Research Objectives */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="premium-card p-6">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Award className="w-6 h-6 text-primary" />
            Key Capabilities
          </h3>
          <div className="space-y-3">
            {features.map((feature, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                <p className="text-gray-300 text-sm leading-relaxed">{feature}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="premium-card p-6">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            Research Objectives
          </h3>
          <div className="space-y-5">
            <div>
              <h4 className="text-white font-semibold mb-2">1. Localizer Backend Trade-off Study</h4>
              <p className="text-sm text-gray-400 leading-relaxed">
                Measure and compare Grounding DINO vs SAM 3 on cold lock-on latency (ms), bounding box IoU quality,
                peak VRAM footprint (GB), and downstream OCR reliability — using real benchmark runs, not literature estimates.
                The benchmark data is live-accessible from the Performance screen.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-2">2. Hybrid Architecture Justification</h4>
              <p className="text-sm text-gray-400 leading-relaxed">
                Demonstrate that a split pipeline (compact open-vocabulary localizer + on-demand VLM) outperforms
                a single end-to-end VLM for continuous tracking in terms of latency, VRAM budget, and frame throughput —
                quantified via the three-tier comparative study.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-2">3. Natural-Language Interaction for Live Video</h4>
              <p className="text-sm text-gray-400 leading-relaxed">
                Evaluate plain-English target specification as an alternative to pre-defined detection classes
                or region-of-interest annotations in a live-stream surveillance context — supporting mid-stream
                re-targeting without pipeline interruption.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Technologies Used */}
      <div className="premium-card p-6 mb-8">
        <h3 className="text-2xl font-bold text-white mb-2">Technologies Used</h3>
        <p className="text-sm text-gray-500 mb-6 italic">
          Verified against <code className="text-gray-400">requirements.txt</code> and backend source imports.
          TensorRT, DeepSORT, and Florence-2 are NOT in this list — they were evaluated candidates but are not
          shipped components.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {technologies.map((tech) => (
            <div
              key={tech.name}
              className="p-4 rounded-lg border transition-all hover:scale-105 flex flex-col gap-2"
              style={{
                backgroundColor: `${tech.color}10`,
                borderColor: `${tech.color}40`,
              }}
            >
              <tech.icon className="w-7 h-7 opacity-80" style={{ color: tech.color }} />
              <div>
                <p className="font-bold text-white text-sm leading-tight mb-1">{tech.name}</p>
                <p className="text-xs text-gray-400">{tech.category}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team Section */}
      <div className="premium-card p-6 mb-8">
        <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          Project Team
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {teamMembers.map((member, idx) => (
            <div key={idx} className="p-6 rounded-lg bg-muted border border-border hover:border-primary/30 transition-all flex flex-col">
              {member.image ? (
                <div className="w-20 h-20 rounded-full mx-auto mb-4 flex-shrink-0 overflow-hidden ring-2 ring-primary/20">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover"
                    style={{ objectPosition: 'center 20%' }}
                  />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/40 mx-auto mb-4 flex items-center justify-center flex-shrink-0 ring-2 ring-primary/20">
                  <span className="text-3xl font-bold text-white tracking-wider">
                    {member.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
              )}
              <h4 className="text-xl font-bold text-white text-center mb-1">{member.name}</h4>
              <p className="text-xs font-semibold text-primary text-center mb-3 leading-snug tracking-wide uppercase">{member.role}</p>
              <p className="text-xs text-gray-400 leading-relaxed mb-4 text-center flex-1">{member.contribution}</p>
              <div className="space-y-2 border-t border-[rgba(255,255,255,0.08)] pt-3">
                <div className="flex items-center gap-2 justify-center">
                  <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  {member.email !== '#' ? (
                    <a href={`mailto:${member.email}`} className="text-xs text-primary hover:underline truncate">
                      {member.emailDisplay}
                    </a>
                  ) : (
                    <span className="text-xs text-amber-400 italic">{member.emailDisplay}</span>
                  )}
                </div>
                <div className="flex justify-center gap-3">
                  {member.linkedin && member.linkedin !== '#' && (
                    <a href={member.linkedin} target="_blank" rel="noreferrer"
                      className="text-muted-foreground hover:text-primary transition-all duration-300"
                      title="LinkedIn">
                      <Link2 className="w-5 h-5" />
                    </a>
                  )}
                  {member.github && member.github !== '#' && (
                    <a href={member.github} target="_blank" rel="noreferrer"
                      className="text-muted-foreground hover:text-primary transition-all duration-300"
                      title="GitHub">
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  )}
                  {member.website && member.website !== '#' && (
                    <a href={member.website} target="_blank" rel="noreferrer"
                      className="text-muted-foreground hover:text-primary transition-all duration-300"
                      title="Website">
                      <Globe className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Project Details + Resources */}
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-6 mb-8">
        <div className="premium-card p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Project Information</h3>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-[rgba(255,255,255,0.1)]">
              <span className="text-gray-400">Project Type</span>
              <span className="text-white">Final Year Capstone Project (FYCP)</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[rgba(255,255,255,0.1)]">
              <span className="text-gray-400">Department</span>
              <span className="text-white">Artificial Intelligence</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[rgba(255,255,255,0.1)]">
              <span className="text-gray-400">University</span>
              <span className="text-white">University of Management and Technology</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[rgba(255,255,255,0.1)]">
              <span className="text-gray-400">Supervisor</span>
              <span className="text-white">Dr. Muhammad Azeem Javed</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[rgba(255,255,255,0.1)]">
              <span className="text-gray-400">Year</span>
              <span className="text-white">2026</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[rgba(255,255,255,0.1)]">
              <span className="text-gray-400">Backend API</span>
              <span className="text-white font-mono text-sm">FastAPI 0.3.0 · WebSocket /ws/session</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-400">Status</span>
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#39FF14] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#39FF14]"></span>
                </span>
                <span className="text-[#39FF14]">Active Development</span>
              </div>
            </div>
          </div>
        </div>

        <div className="premium-card p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Resources & Links</h3>
          <div className="space-y-3">
            {/* TODO: replace '#' with real GitHub repo URL before defense */}
            <a href="#" className="flex items-center justify-between py-3 px-4 rounded-lg bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] transition-all">
              <div className="flex items-center gap-3">
                <ExternalLink className="w-5 h-5 text-white" />
                <span className="text-white text-sm">GitHub Repository</span>
              </div>
              <span className="text-xs text-amber-400 italic">TODO</span>
            </a>
            {/* TODO: replace '#' with real documentation URL before defense */}
            <a href="#" className="flex items-center justify-between py-3 px-4 rounded-lg bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] transition-all">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-white" />
                <span className="text-white text-sm">Documentation</span>
              </div>
              <span className="text-xs text-amber-400 italic">TODO</span>
            </a>
            {/* TODO: replace '#' with real presentation URL before defense */}
            <a href="#" className="flex items-center justify-between py-3 px-4 rounded-lg bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] transition-all">
              <div className="flex items-center gap-3">
                <Info className="w-5 h-5 text-white" />
                <span className="text-white text-sm">Project Presentation</span>
              </div>
              <span className="text-xs text-amber-400 italic">TODO</span>
            </a>
            {/*
              NOTE: The InsightVision paper is an arXiv preprint (not yet published).
              The link below is for the SEPARATE published IEEE paper on fall detection.
              Do NOT conflate this with InsightVision's own paper.
            */}
            <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-[rgba(255,165,0,0.07)] border border-amber-500/20 transition-all">
              <div className="flex items-center gap-3">
                <FlaskConical className="w-5 h-5 text-amber-400" />
                <div>
                  <span className="text-white text-sm block">Related Publication</span>
                  <span className="text-xs text-gray-400">Fall Detection System, ICIC 2025 (IEEE, 2026)</span>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Ethics & Privacy */}
      <div className="premium-card p-6 border-l-4 border-primary mb-8">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Ethics & Privacy Statement
        </h3>
        <p className="text-gray-400 leading-relaxed mb-4">
          InsightVision's core function is processing live video containing identifiable individuals.
          That video data constitutes personal data under standard data-protection frameworks while a session is active.
          The following statements are accurate for the current prototype:
        </p>
        <ul className="space-y-3 mb-5">
          <li className="flex items-start gap-3 text-sm text-gray-300">
            <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0"></div>
            <span>
              <strong className="text-white">All inference is on-device.</strong> Video frames are processed locally
              on the host GPU. No frame data, detections, or crops are transmitted to any external cloud service
              during inference — including when the Groq API is active (only the text of a natural-language
              query is sent, not any image).
            </span>
          </li>
          <li className="flex items-start gap-3 text-sm text-gray-300">
            <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0"></div>
            <span>
              <strong className="text-white">No persistent identity database.</strong> Tracking is session-scoped —
              <code className="text-gray-400 text-xs bg-gray-800 px-1 py-0.5 rounded mx-1">track_id</code>
              values reset on every new session and carry no cross-session identity linkage.
              No facial recognition or biometric embedding is performed.
            </span>
          </li>
          <li className="flex items-start gap-3 text-sm text-gray-300">
            <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0"></div>
            <span>
              <strong className="text-white">Cross-session re-identification is deferred.</strong> Cross-camera
              appearance-embedding matching (which would enable persistent identity linking) is a planned Phase 2
              capability and is not present in this prototype. The toggle is disabled in Settings.
            </span>
          </li>
          <li className="flex items-start gap-3 text-sm text-gray-300">
            <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0"></div>
            <span>
              <strong className="text-white">Academic prototype only.</strong> This system is not cleared for
              deployment as a production surveillance tool. Any real-world deployment would require independent
              ethical review, informed consent frameworks, and legal compliance with applicable data protection law.
            </span>
          </li>
        </ul>
        <div className="flex items-start gap-3 text-sm text-gray-400 bg-amber-500/10 p-4 rounded-lg border border-amber-500/20">
          <Shield className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p>
            This application is developed strictly for academic research and Capstone Project demonstration purposes.
            It is not intended for use in production environments handling sensitive personal data
            without proper ethical review, legal compliance, and institutional oversight.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-12 pt-8 border-t border-border">
        <p className="text-gray-400 mb-2">© 2026 InsightVision Project — University of Management and Technology</p>
        <p className="text-sm text-gray-500">
          Built for advancing computer vision research · Capstone Defense 2026
        </p>
      </div>
    </div>
  );
}
