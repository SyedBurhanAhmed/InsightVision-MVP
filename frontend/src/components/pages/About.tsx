import { Info, Users, Award, BookOpen, Link2, Mail, ExternalLink, Shield, Target, Brain, Server, Layers, Camera, Code, Zap, Activity } from 'lucide-react';

const teamMembers = [
  {
    name: 'Syed Burhan Ahmed',
    role: 'Lead AI Engineer',
    email: 'your.email@university.edu',
    linkedin: '#',
  },
  {
    name: 'Waleed Ahmed',
    role: 'AI/ML Engineer',
    email: 'member2@university.edu',
    linkedin: '#',
  },
  {
    name: 'Fatima Surraya Islam',
    role: 'Web Developer',
    email: 'member3@university.edu',
    linkedin: '#',
  },
];

const technologies = [
  { name: 'YOLOv11', category: 'Object Detection', color: '#00D4FF', icon: Target },
  { name: 'Florence-2', category: 'Vision-Language', color: '#00FFFF', icon: Brain },
  { name: 'FastAPI (Microservice)', category: 'Backend', color: '#9D4EDD', icon: Server },
  { name: 'PyTorch', category: 'Deep Learning', color: '#FF6B35', icon: Layers },
  { name: 'OpenCV', category: 'Computer Vision', color: '#39FF14', icon: Camera },
  { name: 'React', category: 'Frontend', color: '#00D4FF', icon: Code },
  { name: 'TensorRT', category: 'Optimization', color: '#FFD60A', icon: Zap },
  { name: 'DeepSORT', category: 'Tracking', color: '#FF0040', icon: Activity },
];

const features = [
  'Real-time object detection with YOLO',
  'Natural language vision queries',
  'Multi-object tracking with persistent IDs',
  'Few-shot learning for custom objects',
  'Comparative analysis (YOLO vs VLM)',
  'Performance monitoring & optimization',
  'Semantic segmentation',
  'Session history & export',
];

export default function About() {
  return (
    <div className="min-h-screen max-h-[100vh] overflow-y-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Info className="w-8 h-8 text-[#FFB3C6]" strokeWidth={2} />
          <h1 className="text-4xl font-bold text-white">About InsightVision</h1>
        </div>
        <p className="text-gray-400">Final Year Project 2026</p>
      </div>

      {/* Project Overview */}
      <div className="premium-card p-8 mb-8">
        <h2 className="text-3xl font-bold text-white mb-4">
          <span className="text-[#DC143C]">Insight</span>Vision
        </h2>
        <p className="text-xl text-gray-300 mb-6">
          Vision-Language Empowered Object Tracking & Detection System
        </p>
        <p className="text-gray-400 leading-relaxed mb-4">
          InsightVision is an advanced computer vision platform that bridges traditional object detection
          with cutting-edge vision-language models. The system enables users to interact with visual data
          using natural language queries while maintaining the speed and efficiency of traditional CV approaches.
        </p>
        <p className="text-gray-400 leading-relaxed">
          This research project explores the trade-offs between classical deep learning methods (YOLO) and
          modern vision-language models (VLMs), providing comprehensive comparative analysis for real-world
          computer vision applications.
        </p>
      </div>

      {/* Key Features */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="premium-card p-6">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Award className="w-6 h-6 text-[#FFD60A]" />
            Key Features
          </h3>
          <div className="space-y-3">
            {features.map((feature, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-[#DC143C] mt-2 flex-shrink-0"></div>
                <p className="text-gray-300">{feature}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="premium-card p-6">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#00D4FF]" />
            Research Objectives
          </h3>
          <div className="space-y-4">
            <div>
              <h4 className="text-white font-semibold mb-2">1. Comparative Analysis</h4>
              <p className="text-sm text-gray-400">
                Evaluate performance differences between YOLO and VLM approaches in terms of accuracy,
                speed, and resource utilization.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-2">2. Natural Language Interface</h4>
              <p className="text-sm text-gray-400">
                Develop an intuitive query system that allows users to interact with visual data using
                natural language instead of complex APIs.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-2">3. Real-world Applications</h4>
              <p className="text-sm text-gray-400">
                Demonstrate practical use cases in surveillance, monitoring, and automated visual analysis.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Technologies Used */}
      <div className="premium-card p-6 mb-8">
        <h3 className="text-2xl font-bold text-white mb-6">Technologies Used</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {technologies.map((tech) => (
            <div
              key={tech.name}
              className="p-4 rounded-lg border transition-all hover:scale-105 flex items-center gap-3"
              style={{
                backgroundColor: `${tech.color}10`,
                borderColor: `${tech.color}40`,
              }}
            >
              <tech.icon className="w-8 h-8 opacity-80" style={{ color: tech.color }} />
              <div>
                <p className="font-bold text-white mb-1 leading-tight">{tech.name}</p>
                <p className="text-xs text-gray-400">{tech.category}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team Section */}
      <div className="premium-card p-6 mb-8">
        <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Users className="w-6 h-6 text-[#39FF14]" />
          Project Team
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {teamMembers.map((member, idx) => (
            <div key={idx} className="p-6 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(220,20,60,0.3)]">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#DC143C] to-[#9D4EDD] mx-auto mb-4 flex items-center justify-center">
                <span className="text-3xl font-bold text-white">
                  {member.name.replace('[Your Name]', 'YN').split(' ').map(n => n[0]).join('').slice(0, 2).replace('[', '')}
                </span>
              </div>
              <h4 className="text-xl font-bold text-white text-center mb-2">{member.name}</h4>
              <p className="text-sm text-gray-400 text-center mb-4">{member.role}</p>
              <div className="flex justify-center gap-3">
                <a href={`mailto:${member.email}`} className="text-gray-400 hover:text-[#DC143C] hover:drop-shadow-[0_0_8px_rgba(220,20,60,0.8)] transition-all duration-300">
                  <Mail className="w-5 h-5" />
                </a>
                <a href={member.linkedin} className="text-gray-400 hover:text-[#DC143C] hover:drop-shadow-[0_0_8px_rgba(220,20,60,0.8)] transition-all duration-300">
                  <Link2 className="w-5 h-5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Project Details */}
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-6 mb-8">
        <div className="premium-card p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Project Information</h3>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-[rgba(255,255,255,0.1)]">
              <span className="text-gray-400">Project Type</span>
              <span className="text-white">Final Year Project (FYP)</span>
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
            <a href="#" className="flex items-center justify-between py-3 px-4 rounded-lg bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] transition-all">
              <div className="flex items-center gap-3">
                <ExternalLink className="w-5 h-5 text-white" />
                <span className="text-white">GitHub Repository</span>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </a>
            <a href="#" className="flex items-center justify-between py-3 px-4 rounded-lg bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] transition-all">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-white" />
                <span className="text-white">Documentation</span>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </a>
            <a href="#" className="flex items-center justify-between py-3 px-4 rounded-lg bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] transition-all">
              <div className="flex items-center gap-3">
                <Award className="w-5 h-5 text-white" />
                <span className="text-white">Research Paper</span>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </a>
            <a href="#" className="flex items-center justify-between py-3 px-4 rounded-lg bg-[rgba(255,255,255,0.05)} hover:bg-[rgba(255,255,255,0.1)] transition-all">
              <div className="flex items-center gap-3">
                <Info className="w-5 h-5 text-white" />
                <span className="text-white">Project Presentation</span>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </a>
          </div>
        </div>
      </div>

      {/* Ethics & Privacy */}
      <div className="premium-card p-6 border-l-4 border-[#39FF14]">
        <h3 className="text-xl font-semibold text-white mb-4">Ethics & Privacy Statement</h3>
        <p className="text-gray-400 mb-4">
          InsightVision is developed for academic and research purposes. All processing is performed locally,
          and no personal identifiable information (PII) is collected or stored. This system is designed with
          privacy-first principles and complies with academic research ethics guidelines.
        </p>
        <div className="flex items-start gap-3 mt-4 text-sm text-gray-400 bg-amber-500/10 p-4 rounded-lg border border-amber-500/20">
          <Shield className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p>
            This application is not intended for deployment in production environments handling sensitive
            personal data or surveillance without proper ethical review and legal compliance.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-12 pt-8 border-t border-[rgba(220,20,60,0.3)]">
        <p className="text-gray-400 mb-2">© 2026 InsightVision Project. All rights reserved.</p>
        <p className="text-sm text-gray-500">
          Built with ❤️ for advancing computer vision research
        </p>
      </div>
    </div>
  );
}
