import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  FileText, Users, Package, Repeat, Receipt, Activity,
  BarChart3, TrendingUp, Link as LinkIcon, Shield, Zap,
  Sliders, Clock, PieChart, Check, ArrowRight, Sparkles,
  HelpCircle, Factory, Cpu, HeartPulse, Store, Briefcase,
  GraduationCap, MoreHorizontal,
  Mail, ChevronDown, CheckCircle2
} from 'lucide-react';


const LinkedinIcon = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.64a1.66 1.66 0 0 0-1.66 1.66 1.66 1.66 0 0 0 1.66 1.66 1.66 1.66 0 0 0 1.66-1.66 1.66 1.66 0 0 0-1.66-1.66Z" />
  </svg>
);

const GithubIcon = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2Z" />
  </svg>
);

const YoutubeIcon = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M21.58 7.19a2.5 2.5 0 0 0-1.76-1.77C18.26 5 12 5 12 5s-6.26 0-7.82.42a2.5 2.5 0 0 0-1.76 1.77C2 8.75 2 12 2 12s0 3.25.42 4.81a2.5 2.5 0 0 0 1.76 1.77C5.74 19 12 19 12 19s6.26 0 7.82-.42a2.5 2.5 0 0 0 1.76-1.77C22 15.25 22 12 22 12s0-3.25-.42-4.81ZM10 15V9l5.2 3-5.2 3Z" />
  </svg>
);

export const LandingPage = () => {
  const { token } = useAuth();
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [demoEmail, setDemoEmail] = useState('');
  const [demoSubmitted, setDemoSubmitted] = useState(false);

  const handleBookDemo = (e) => {
    e.preventDefault();
    if (!demoEmail) return;
    setDemoSubmitted(true);
    setTimeout(() => {
      setDemoModalOpen(false);
      setDemoSubmitted(false);
      setDemoEmail('');
    }, 2500);
  };

  const modules = [
    { name: 'Quotations', icon: FileText, color: 'text-[#724B66] bg-[#724B66]/10' },
    { name: 'Approvals', icon: Users, color: 'text-rose-600 bg-rose-50' },
    { name: 'Fulfillment', icon: Package, color: 'text-purple-600 bg-purple-50' },
    { name: 'Subscriptions', icon: Repeat, color: 'text-cyan-600 bg-cyan-50' },
    { name: 'Invoicing', icon: Receipt, color: 'text-emerald-600 bg-emerald-50' },
    { name: 'Deal Health', icon: Activity, color: 'text-indigo-600 bg-indigo-50' },
    { name: 'Reports', icon: BarChart3, color: 'text-amber-600 bg-amber-50' },
    { name: 'Analytics', icon: TrendingUp, color: 'text-blue-600 bg-blue-50' },
    { name: 'Integrations', icon: LinkIcon, color: 'text-pink-600 bg-pink-50' },
  ];

  const features = [
    {
      title: 'Create & manage quotations',
      desc: 'Generate accurate quotes with real-time pricing and validation.',
      icon: FileText,
      iconBg: 'bg-[#724B66]/10 text-[#724B66]'
    },
    {
      title: 'Automate approvals',
      desc: 'Ensure compliance with configurable rules and thresholds.',
      icon: Users,
      iconBg: 'bg-amber-100 text-amber-700'
    },
    {
      title: 'Track fulfillment',
      desc: 'Plan, ship and monitor deliveries seamlessly.',
      icon: Package,
      iconBg: 'bg-purple-100 text-purple-700'
    },
    {
      title: 'Manage subscriptions',
      desc: 'Handle recurring revenue with ease.',
      icon: Repeat,
      iconBg: 'bg-cyan-100 text-cyan-700'
    },
    {
      title: 'Generate invoices',
      desc: 'Bill accurately and on time.',
      icon: Receipt,
      iconBg: 'bg-blue-100 text-blue-700'
    },
    {
      title: 'Get actionable insights',
      desc: 'Identify risks, track performance and drive growth.',
      icon: BarChart3,
      iconBg: 'bg-indigo-100 text-indigo-700'
    },
    {
      title: 'Manage questions',
      desc: 'Create, organize and maintain Q&A for your deals.',
      icon: HelpCircle,
      iconBg: 'bg-violet-100 text-violet-700'
    }
  ];

  const industries = [
    { name: 'Manufacturing', icon: Factory },
    { name: 'Technology', icon: Cpu },
    { name: 'Healthcare', icon: HeartPulse },
    { name: 'Retail & Distribution', icon: Store },
    { name: 'Professional Services', icon: Briefcase },
    { name: 'Education', icon: GraduationCap },
    { name: 'and more...', icon: MoreHorizontal },
  ];

  const valuePillars = [
    { title: 'Reliable', desc: 'Secure and trustworthy infrastructure', icon: Shield },
    { title: 'Efficient', desc: 'Automate work and save time', icon: Zap },
    { title: 'Collaborative', desc: 'Unite teams and customers', icon: Users },
    { title: 'Flexible', desc: 'Adaptable to your business needs', icon: Sliders },
    { title: 'Insightful', desc: 'Turn data into actionable insights', icon: Clock },
    { title: 'Scalable', desc: 'Grow without limitations', icon: TrendingUp },
  ];

  const stats = [
    { value: '2x', label: 'Faster deal closure', sub: '↑ vs manual process', icon: Zap },
    { value: '30%', label: 'Higher win rates', sub: '↑ with better insights', icon: BarChart3 },
    { value: '50%', label: 'Less manual work', sub: '↑ through automation', icon: Clock },
    { value: '4.8/5', label: 'User satisfaction', sub: '↑ from customer teams', icon: Users },
    { value: '100%', label: 'Audit ready', sub: '↑ compliant & secure', icon: Shield },
  ];

  const team = [
    {
      name: 'Devyash Rasela',
      role: 'Full Stack Developer',
      quote: 'Builds ideas into reality.',
      bgColor: 'bg-violet-100',
      photoUrl: 'https://raw.githubusercontent.com/devyashrasela/dormpay/refs/heads/main/frontend/src/assets/devyash.avif',
      linkedin: 'https://linkedin.com/in/devyash-rasela',
      github: 'https://github.com/devyashrasela',
      email: 'mailto:devyashrasela@gmail.com'
    },
    {
      name: 'Basil Zafar',
      role: 'Frontend Developer',
      quote: 'Designs delightful experiences.',
      bgColor: 'bg-rose-100',
      photoUrl: 'https://raw.githubusercontent.com/devyashrasela/dormpay/refs/heads/main/frontend/src/assets/basil.avif',
      linkedin: 'https://linkedin.com',
      github: 'https://github.com',
      email: 'mailto:basilzafar2424@gmail.com'
    },
    {
      name: 'Mayank Padhi',
      role: 'UI/UX Designer',
      quote: 'Turns complexity into simplicity.',
      bgColor: 'bg-pink-100',
      photoUrl: 'https://raw.githubusercontent.com/devyashrasela/dormpay/refs/heads/main/frontend/src/assets/mayank.avif',
      linkedin: 'https://linkedin.com',
      github: 'https://github.com',
      email: 'mailto:padhimayank@gmail.com'
    }
  ];

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#111826] font-sans selection:bg-[#724B66]/20 selection:text-[#724B66]">

      {/* ── 1. Top Navigation Bar ── */}
      <header className="sticky top-0 z-50 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-neutral-200/60">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-10">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-1.5 group">
              <span className="text-2xl font-bold tracking-tight text-[#111826]">
                DealFlow<span className="text-[#724B66] font-extrabold">360</span>
              </span>
            </Link>

            {/* Nav links */}
            <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#2E3141]/80">
              <a href="#product" className="hover:text-[#724B66] transition-colors">Product</a>
              <a href="#solutions" className="hover:text-[#724B66] transition-colors">Solutions</a>
              <a href="#industries" className="hover:text-[#724B66] transition-colors">Industries</a>
              <a href="#pricing" className="hover:text-[#724B66] transition-colors">Pricing</a>
              <a href="#team" className="hover:text-[#724B66] transition-colors">Team</a>
              <a href="#resources" className="hover:text-[#724B66] transition-colors">Resources</a>
              <a href="#help" className="hover:text-[#724B66] transition-colors">Help</a>
            </nav>
          </div>

          {/* Nav Actions */}
          <div className="flex items-center gap-4">
            {token ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#724B66] hover:bg-[#5e3d54] active:bg-[#4d3245] text-white font-medium text-sm shadow-sm transition duration-150 group"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-semibold text-[#2E3141] hover:text-[#724B66] transition-colors px-3 py-2"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#724B66] hover:bg-[#5e3d54] active:bg-[#4d3245] text-white font-medium text-sm shadow-sm transition duration-150 group"
                >
                  <span>Get started free</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── 2. Hero Section ── */}
      <section className="relative pt-12 pb-20 overflow-hidden bg-gradient-to-b from-[#FFFFFF] via-[#FAF9FA] to-[#FFFFFF]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

            {/* Left Hero Content */}
            <div className="lg:col-span-7 space-y-6">
              {/* Badge */}
              <div className="inline-flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-widest uppercase text-[#724B66] bg-[#724B66]/10 px-3 py-1 rounded-full border border-[#724B66]/20">
                  B2B DEAL MANAGEMENT PLATFORM
                </span>
              </div>

              {/* Main Headline with Brush/Cursive Accent */}
              <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-[#111826] leading-[1.12]">
                Turn opportunities <br />
                <span className="relative inline-block font-['Caveat',cursive] text-6xl sm:text-7xl font-bold text-[#724B66] -rotate-1 mt-1">
                  into real business.
                  <svg className="absolute -bottom-2 left-0 w-full text-[#724B66]/30 h-3" viewBox="0 0 100 20" preserveAspectRatio="none">
                    <path d="M0,15 Q50,0 100,15" stroke="currentColor" strokeWidth="6" fill="none" strokeLinecap="round" />
                  </svg>
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-lg text-[#2E3141]/75 max-w-xl leading-relaxed pt-1">
                From quotations to payments — a complete deal management platform for modern B2B teams.
              </p>

              {/* Hero CTA Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to={token ? "/dashboard" : "/register"}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#724B66] hover:bg-[#5e3d54] active:bg-[#4d3245] text-white font-semibold text-base shadow-md hover:shadow-lg transition-all duration-150 group"
                >
                  <span>{token ? 'Go to Dashboard' : 'Get started free'}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>

                <button
                  onClick={() => setDemoModalOpen(true)}
                  className="inline-flex items-center px-6 py-3.5 rounded-xl bg-white hover:bg-neutral-50 text-[#2E3141] font-semibold text-base border border-neutral-300 shadow-xs transition"
                >
                  Book a demo
                </button>
              </div>

              {/* Guarantee points */}
              <div className="flex flex-wrap items-center gap-6 pt-3 text-xs text-[#2E3141]/70 font-medium">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#724B66]" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#724B66]" />
                  <span>Quick setup</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#724B66]" />
                  <span>Cancel anytime</span>
                </div>
              </div>
            </div>

            {/* Right Hero Graphic with Doodle and Paper Airplane */}
            <div className="lg:col-span-5 relative flex flex-col items-center">

              {/* Handwritten note top right */}
              <div className="absolute -top-10 right-4 flex flex-col items-center text-center select-none pointer-events-none">
                <span className="font-['Caveat',cursive] text-2xl font-bold text-[#724B66] leading-tight rotate-3">
                  One platform. <br />
                  Every stage. <br />
                  More growth.
                </span>
                <svg className="w-12 h-10 text-[#724B66] -rotate-12 mt-1" viewBox="0 0 50 40" fill="none">
                  <path d="M10,5 Q25,25 40,30" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
                  <path d="M35,22 L42,32 L30,33" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              {/* Airplane Illustration Container */}
              <div className="relative w-full max-w-sm aspect-square flex items-center justify-center">

                {/* Airplane trajectory dashed loop */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 300 300">
                  <path
                    d="M 50 220 C 100 240, 200 220, 210 160 C 220 90, 140 100, 160 170 C 180 230, 250 140, 270 80"
                    fill="none"
                    stroke="#724B66"
                    strokeWidth="2"
                    strokeDasharray="5 5"
                    opacity="0.4"
                  />
                  {/* Floating trajectory speed lines */}
                  <line x1="280" y1="65" x2="295" y2="60" stroke="#724B66" strokeWidth="2" opacity="0.6" strokeLinecap="round" />
                  <line x1="285" y1="80" x2="298" y2="78" stroke="#724B66" strokeWidth="2" opacity="0.6" strokeLinecap="round" />
                  <line x1="275" y1="95" x2="290" y2="98" stroke="#724B66" strokeWidth="2" opacity="0.6" strokeLinecap="round" />
                </svg>

                {/* Origami Paper Airplane */}
                <div className="relative z-10 transform -rotate-12 hover:scale-105 transition-transform duration-300">
                  <svg className="w-48 h-48 drop-shadow-xl" viewBox="0 0 200 200" fill="none">
                    {/* Origami folds in #724B66 shades */}
                    <polygon points="170,30 30,120 90,140" fill="#724B66" />
                    <polygon points="170,30 90,140 130,170" fill="#5E3D54" />
                    <polygon points="170,30 130,170 140,110" fill="#8B6080" />
                    <polygon points="170,30 90,140 100,100" fill="#9E7392" opacity="0.6" />
                  </svg>
                </div>

                {/* Floating pill: Faster approvals */}
                <div className="absolute top-16 right-0 bg-white/95 backdrop-blur-xs py-2 px-3.5 rounded-full shadow-md border border-neutral-200/80 flex items-center gap-2 animate-bounce duration-1000">
                  <div className="w-4 h-4 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 text-xs">⚡</div>
                  <span className="text-xs font-bold text-[#111826]">Faster approvals</span>
                </div>

                {/* Floating pill: Higher customer */}
                <div className="absolute bottom-14 left-4 bg-white/95 backdrop-blur-xs py-2 px-3.5 rounded-full shadow-md border border-neutral-200/80 flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs">📊</div>
                  <span className="text-xs font-bold text-[#111826]">Higher customer win rate</span>
                </div>

                {/* Bottom-right script: Simpler. Faster. Smarter. */}
                <div className="absolute -bottom-2 right-4 text-right">
                  <span className="font-['Caveat',cursive] text-2xl font-bold text-[#724B66] -rotate-3 block">
                    Simpler. <br />
                    Faster. <br />
                    Smarter.
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Modules Strip ("EVERYTHING YOU NEED. NOTHING YOU DON'T.") ── */}
      <section className="py-16 bg-[#FAFAFA] border-y border-neutral-200/60">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-[#2E3141]/60">
              EVERYTHING YOU NEED. NOTHING YOU DON'T.
            </p>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-3">
            {modules.map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.name}
                  className="bg-white p-4 rounded-2xl border border-neutral-200/70 shadow-xs hover:shadow-md hover:-translate-y-1 transition duration-200 flex flex-col items-center text-center gap-2.5 group cursor-default"
                >
                  <div className={`p-3 rounded-xl ${m.color} group-hover:scale-110 transition-transform`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-[#111826]">{m.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 4. A Closer Look: Built for the Entire Deal Lifecycle ── */}
      <section id="product" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">

            {/* Left: Summary & Illustrated Checklist Card */}
            <div className="lg:col-span-5 space-y-8 sticky top-28">
              <div>
                <span className="text-[11px] font-bold tracking-widest uppercase text-[#724B66] bg-[#724B66]/10 px-3 py-1 rounded-full border border-[#724B66]/20">
                  A CLOSER LOOK
                </span>
                <h2 className="text-4xl font-extrabold text-[#111826] mt-4 leading-tight">
                  Built for the <br />
                  <span className="font-['Caveat',cursive] text-5xl font-bold text-[#724B66] inline-block -rotate-1">
                    entire deal lifecycle.
                  </span>
                </h2>
                <p className="text-[#2E3141]/75 mt-3 text-sm leading-relaxed">
                  DealFlow360 brings your sales, finance, and operations teams together with complete visibility and control.
                </p>
                <div className="pt-4">
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#724B66] hover:bg-[#5e3d54] text-white font-semibold text-sm shadow-sm transition group"
                  >
                    <span>Explore all features</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>

              {/* Interactive Illustration Card */}
              <div className="p-6 bg-gradient-to-br from-[#FAFAFA] to-[#F3F2F2] rounded-3xl border border-neutral-200/80 shadow-sm relative overflow-hidden">
                <div className="space-y-3 max-w-xs">
                  {/* Mock Checklist Card */}
                  <div className="bg-white p-4 rounded-xl shadow-xs border border-neutral-200/70 space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                      <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center text-[10px]">✓</div>
                      <span>Quote sent</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-700">
                      <div className="w-4 h-4 rounded-full bg-amber-100 flex items-center justify-center text-[10px]">✓</div>
                      <span>Approval in progress</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#724B66]">
                      <div className="w-4 h-4 rounded-full bg-[#724B66]/10 flex items-center justify-center text-[10px]">✓</div>
                      <span>Order confirmed</span>
                    </div>
                  </div>

                  {/* Growth graphic footer */}
                  <div className="pt-2 flex items-center justify-between text-xs text-[#2E3141]/70">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#724B66]/20 flex items-center justify-center text-[#724B66] font-bold">
                        👨‍💼
                      </div>
                      <span className="font-semibold text-[#111826]">Deal Pipeline</span>
                    </div>
                    <span className="font-['Caveat',cursive] text-lg font-bold text-[#724B66]">
                      From quote to growth ↗
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: 7 Feature Rows */}
            <div className="lg:col-span-7 space-y-4">
              {features.map((f, idx) => {
                const Icon = f.icon;
                return (
                  <div
                    key={idx}
                    className="p-5 bg-white rounded-2xl border border-neutral-200/70 hover:border-[#724B66]/40 hover:shadow-md transition duration-150 flex items-start gap-4 group"
                  >
                    <div className={`p-3 rounded-xl ${f.iconBg} shrink-0 group-hover:scale-105 transition-transform`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-base font-bold text-[#111826] group-hover:text-[#724B66] transition-colors">
                        {f.title}
                      </h4>
                      <p className="text-xs text-[#2E3141]/70 mt-1 leading-relaxed">
                        {f.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </section>

      {/* ── 5. Built for Every Industry ── */}
      <section id="industries" className="py-20 bg-[#FAF9FA] border-y border-neutral-200/60">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <span className="text-[11px] font-bold tracking-widest uppercase text-[#724B66] bg-[#724B66]/10 px-3 py-1 rounded-full border border-[#724B66]/20">
            BUILT FOR EVERY INDUSTRY
          </span>
          <h2 className="text-4xl font-extrabold text-[#111826] mt-3 tracking-tight">
            Powering B2B businesses everywhere.
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4 mt-12">
            {industries.map((ind) => {
              const Icon = ind.icon;
              return (
                <div
                  key={ind.name}
                  className="bg-white p-6 rounded-2xl border border-neutral-200/70 shadow-xs hover:shadow-md hover:-translate-y-1 transition duration-200 flex flex-col items-center text-center gap-3 cursor-default"
                >
                  <div className="p-3.5 rounded-xl bg-[#724B66]/10 text-[#724B66]">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-semibold text-[#111826] leading-snug">{ind.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 6. Value Pillars (Reliable. Simple. Built to Scale.) ── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <span className="text-[11px] font-bold tracking-widest uppercase text-[#724B66] bg-[#724B66]/10 px-3 py-1 rounded-full border border-[#724B66]/20">
            WHY CHOOSE DEALFLOW360
          </span>
          <h2 className="text-4xl font-extrabold text-[#111826] mt-3 tracking-tight">
            Reliable. Simple. <span className="font-['Caveat',cursive] text-5xl font-bold text-[#724B66]">Built to Scale.</span>
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-12">
            {valuePillars.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.title}
                  className="p-5 bg-white rounded-2xl border border-neutral-200/70 shadow-xs hover:border-[#724B66]/40 hover:shadow-sm transition text-center flex flex-col items-center gap-2"
                >
                  <div className="p-3 rounded-full bg-[#724B66]/10 text-[#724B66]">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-[#111826] mt-1">{p.title}</h4>
                  <p className="text-[11px] text-[#2E3141]/70 leading-normal">{p.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 7. Stats Banner + MEET THE TEAM (REPLACING 2x LINE WITH TEAM CARDS) ── */}
      <section id="team" className="py-24 bg-gradient-to-b from-[#FAF9FA] via-white to-[#FAF9FA] border-t border-neutral-200/60">
        <div className="max-w-7xl mx-auto px-6">

          {/* Top 5 Impact Stats */}
          <div className="text-center mb-10">
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#724B66]">
              WHY DEALFLOW360
            </span>
            <h3 className="text-3xl font-extrabold text-[#111826] mt-1">
              More deals. <span className="font-['Caveat',cursive] text-4xl text-[#724B66]">Greater impact.</span>
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-20">
            {stats.map((s, idx) => {
              const Icon = s.icon;
              return (
                <div
                  key={idx}
                  className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-xs text-center flex flex-col items-center justify-between hover:shadow-md transition"
                >
                  <div className="p-2.5 rounded-full bg-[#724B66]/10 text-[#724B66] mb-3">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-3xl font-extrabold text-[#111826] tracking-tight">{s.value}</span>
                    <p className="text-xs font-bold text-[#111826] mt-1">{s.label}</p>
                    <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">{s.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Meet The Team Section */}
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#724B66] bg-[#724B66]/10 px-3 py-1 rounded-full border border-[#724B66]/20">
              MEET THE TEAM
            </span>
            <h2 className="text-4xl font-extrabold text-[#111826] mt-3 tracking-tight">
              The people behind <span className="font-['Caveat',cursive] text-5xl text-[#724B66]">DealFlow360.</span>
            </h2>
            <p className="text-[#2E3141]/75 text-sm mt-3 leading-relaxed">
              A small team with a big vision — to make B2B deal management simpler, smarter, and more accessible for everyone.
            </p>
          </div>

          {/* 4 Team Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {team.map((member) => (
              <div
                key={member.name}
                className="bg-white p-7 rounded-3xl border border-neutral-200/80 shadow-xs hover:shadow-xl hover:-translate-y-1.5 transition-all duration-200 flex flex-col items-center text-center group"
              >
                {/* Avatar with tinted circular backdrop & doodle rays */}
                <div className="relative mb-5">
                  <div className={`w-40 h-40 rounded-full ${member.bgColor} p-1.5 flex items-center justify-center shadow-inner overflow-hidden ring-4 ring-white`}>
                    <img
                      src={member.photoUrl}
                      alt={member.name}
                      className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        // Fallback in case of network block
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = `<span class="text-2xl font-bold text-[#724B66]">${member.name.split(' ').map(n => n[0]).join('')}</span>`;
                      }}
                    />
                  </div>
                  {/* Cute doodle rays */}
                  <div className="absolute -top-1 -right-2 text-[#724B66] font-mono text-xs select-none pointer-events-none">
                    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                      <line x1="10" y1="2" x2="10" y2="6" stroke="#724B66" strokeWidth="2" strokeLinecap="round" />
                      <line x1="16" y1="5" x2="13" y2="8" stroke="#724B66" strokeWidth="2" strokeLinecap="round" />
                      <line x1="4" y1="5" x2="7" y2="8" stroke="#724B66" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>

                {/* Name & Role */}
                <h4 className="text-lg font-bold text-[#111826]">{member.name}</h4>
                <p className="text-xs font-semibold text-[#724B66] mt-0.5">{member.role}</p>

                {/* Motto Quote */}
                <p className="text-xs text-[#2E3141]/70 italic mt-3 mb-6 min-h-[32px] flex items-center justify-center">
                  "{member.quote}"
                </p>

                {/* Social Links */}
                <div className="flex items-center gap-3 pt-3 border-t border-neutral-100 w-full justify-center">
                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="w-8 h-8 rounded-full bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white flex items-center justify-center transition-colors text-xs"
                    title="LinkedIn"
                  >
                    <LinkedinIcon className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href={member.github}
                    target="_blank"
                    rel="noreferrer"
                    className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-800 text-neutral-700 hover:text-white flex items-center justify-center transition-colors text-xs"
                    title="GitHub"
                  >
                    <GithubIcon className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href={member.email}
                    className="w-8 h-8 rounded-full bg-[#724B66]/10 hover:bg-[#724B66] text-[#724B66] hover:text-white flex items-center justify-center transition-colors text-xs"
                    title="Email"
                  >
                    <Mail className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── 8. Wave Plum CTA Section ── */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#4A243E] via-[#5C2E4E] to-[#3E1A33] text-white py-24">

        {/* Subtle background curved wave lines */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1440 600" fill="none">
            <path d="M0,200 C320,350, 420,100, 740,250 C1060,400, 1200,150, 1440,280 L1440,600 L0,600 Z" fill="white" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <span className="text-[11px] font-bold tracking-widest uppercase text-pink-200/90 bg-white/10 px-3 py-1 rounded-full border border-white/20">
                LET'S BUILD TOGETHER
              </span>

              <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Ready to transform <br />
                <span className="font-['Caveat',cursive] text-5xl sm:text-6xl text-pink-200 font-bold -rotate-1 inline-block mt-1">
                  your deal management?
                </span>
              </h2>

              <p className="text-sm text-pink-100/80 max-w-lg leading-relaxed">
                Join growing B2B teams that are closing more deals, faster.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white hover:bg-neutral-100 text-[#4A243E] font-bold text-sm shadow-xl transition duration-150 group"
                >
                  <span>Get started free</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>

                <button
                  onClick={() => setDemoModalOpen(true)}
                  className="inline-flex items-center px-6 py-3.5 rounded-xl bg-transparent hover:bg-white/10 text-white font-semibold text-sm border border-white/30 transition"
                >
                  Talk to an expert
                </button>
              </div>
            </div>

            {/* Right Checklist & Doodles */}
            <div className="lg:col-span-5 flex flex-col justify-center space-y-6">
              {/* <div className="space-y-3 text-sm text-pink-50 font-medium">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white text-xs">✓</div>
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white text-xs">✓</div>
                  <span>Setup in minutes</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white text-xs">✓</div>
                  <span>Full feature access</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white text-xs">✓</div>
                  <span>Dedicated support</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white text-xs">✓</div>
                  <span>Cancel anytime</span>
                </div>
              </div> */}

              {/* Hand-drawn Sparkle text */}
              <div className="pt-2 text-right">
                <div className="inline-flex flex-col items-end">
                  <span className="font-['Caveat',cursive] text-3xl font-bold text-pink-200 rotate-2">
                    Same workflow. <br />
                    Bigger possibilities.
                  </span>
                  <div className="text-pink-300 mr-4">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 9. Footer ── */}
      <footer className="bg-white border-t border-neutral-200 text-sm text-[#2E3141]/75">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8">

            {/* Brand column */}
            <div className="col-span-2 space-y-4">
              <Link to="/" className="flex items-center gap-1">
                <span className="text-2xl font-bold tracking-tight text-[#111826]">
                  DealFlow<span className="text-[#724B66] font-extrabold">360</span>
                </span>
              </Link>
              <p className="text-xs text-[#2E3141]/60">
                Deals today. Growth tomorrow.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg bg-neutral-100 hover:bg-[#724B66] hover:text-white flex items-center justify-center transition-colors text-neutral-600">
                  <LinkedinIcon className="w-4 h-4" />
                </a>
                <a href="https://github.com" target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg bg-neutral-100 hover:bg-[#724B66] hover:text-white flex items-center justify-center transition-colors text-neutral-600">
                  <GithubIcon className="w-4 h-4" />
                </a>
                <a href="https://youtube.com" target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg bg-neutral-100 hover:bg-[#724B66] hover:text-white flex items-center justify-center transition-colors text-neutral-600">
                  <YoutubeIcon className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Product */}
            <div>
              <h5 className="font-bold text-xs uppercase tracking-wider text-[#111826] mb-3">Product</h5>
              <ul className="space-y-2 text-xs">
                <li><a href="#product" className="hover:text-[#724B66] transition-colors">Overview</a></li>
                <li><a href="#product" className="hover:text-[#724B66] transition-colors">Features</a></li>
                <li><a href="#product" className="hover:text-[#724B66] transition-colors">Integrations</a></li>
                <li><a href="#pricing" className="hover:text-[#724B66] transition-colors">Pricing</a></li>
                <li><a href="#product" className="hover:text-[#724B66] transition-colors">What's New</a></li>
              </ul>
            </div>

            {/* Solutions */}
            <div>
              <h5 className="font-bold text-xs uppercase tracking-wider text-[#111826] mb-3">Solutions</h5>
              <ul className="space-y-2 text-xs">
                <li><a href="#solutions" className="hover:text-[#724B66] transition-colors">For Sales Teams</a></li>
                <li><a href="#solutions" className="hover:text-[#724B66] transition-colors">For Finance Teams</a></li>
                <li><a href="#solutions" className="hover:text-[#724B66] transition-colors">For Operations</a></li>
                <li><a href="#solutions" className="hover:text-[#724B66] transition-colors">For Customers</a></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h5 className="font-bold text-xs uppercase tracking-wider text-[#111826] mb-3">Resources</h5>
              <ul className="space-y-2 text-xs">
                <li><a href="#resources" className="hover:text-[#724B66] transition-colors">Blog</a></li>
                <li><a href="#resources" className="hover:text-[#724B66] transition-colors">Guides</a></li>
                <li><a href="#help" className="hover:text-[#724B66] transition-colors">Help Center</a></li>
                <li><a href="#resources" className="hover:text-[#724B66] transition-colors">API Docs</a></li>
              </ul>
            </div>

            {/* Company & Lang */}
            <div>
              <h5 className="font-bold text-xs uppercase tracking-wider text-[#111826] mb-3">Company</h5>
              <ul className="space-y-2 text-xs mb-4">
                <li><a href="#team" className="hover:text-[#724B66] transition-colors">About</a></li>
                <li><a href="#team" className="hover:text-[#724B66] transition-colors">Careers</a></li>
                <li><a href="#team" className="hover:text-[#724B66] transition-colors">Contact</a></li>
                <li><a href="#team" className="hover:text-[#724B66] transition-colors">Privacy</a></li>
                <li><a href="#team" className="hover:text-[#724B66] transition-colors">Terms</a></li>
              </ul>

              {/* Language pill */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-neutral-200 text-xs bg-neutral-50 text-[#111826]">
                <span>🇮🇳</span>
                <span className="font-medium">English</span>
                <ChevronDown className="w-3 h-3 text-neutral-400" />
              </div>
            </div>

          </div>

          {/* Bottom Bar */}
          <div className="pt-12 mt-12 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#2E3141]/60">
            <p>© 2026 DealFlow360. All rights reserved.</p>
            <p className="flex items-center gap-1">
              Made with <span className="text-rose-500">❤️</span> for modern B2B teams.
            </p>
          </div>
        </div>
      </footer>

      {/* Demo Modal */}
      {demoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-neutral-200 p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-[#111826]">Book a Personalized Demo</h3>
              <button onClick={() => setDemoModalOpen(false)} className="text-neutral-400 hover:text-[#111826]">✕</button>
            </div>
            {demoSubmitted ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h4 className="text-base font-bold text-[#111826]">Demo Request Received!</h4>
                <p className="text-xs text-[#2E3141]/70">Our enterprise solution engineer will reach out within 2 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleBookDemo} className="space-y-3">
                <p className="text-xs text-[#2E3141]/70">
                  See how DealFlow360 streamlines quotes, approvals, and fulfillment for your organization.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-[#111826] uppercase tracking-wider mb-1">Work Email</label>
                  <input
                    type="email"
                    value={demoEmail}
                    onChange={e => setDemoEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg outline-none focus:border-[#724B66]"
                  />
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setDemoModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-lg">Cancel</button>
                  <button type="submit" className="px-4 py-2 text-xs font-semibold text-white bg-[#724B66] hover:bg-[#5e3d54] rounded-lg">Schedule Demo</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
