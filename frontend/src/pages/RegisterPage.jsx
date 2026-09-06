import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../api/client.js';
import {
  User, Mail, Phone, Lock, ArrowRight, ArrowLeft,
  CheckCircle2, ShieldCheck, Sparkles, AlertCircle, Layers, Check
} from 'lucide-react';
import icn from "../assets/icon.png"

export function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (!agreedToTerms) {
      setError('Please agree to the Terms of Service to continue.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/register', {
        full_name: fullName,
        email,
        password,
        phone_number: phone || undefined,
      });
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const perks = [
    'No credit card required for standard registration',
    'Full access to quotation builder & approval engine',
    'Warehouse split optimization & inventory tracking',
    'Automated daily proration & recurring billing',
  ];

  return (
    <div className="min-h-screen w-full flex bg-[#FFFFFF]">

      {/* ── LEFT COLUMN: Registration Form ── */}
      <div className="w-full lg:w-[48%] xl:w-[45%] flex flex-col justify-between p-8 sm:p-12 lg:p-14 z-10 overflow-y-auto">

        {/* Top Header & Back link */}
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-1 group">
            <img src={icn} alt="Logo" className='h-10 w-auto' />
            <span className="text-2xl font-bold tracking-tight text-[#111826]">
              DealFlow<span className="text-[#724B66] font-extrabold">360</span>
            </span>
          </Link>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2E3141]/70 hover:text-[#724B66] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to website</span>
          </Link>
        </div>

        {/* Center Form Area */}
        <div className="max-w-md w-full mx-auto my-auto py-6">
          <div className="mb-6">
            <h1 className="text-3xl font-extrabold text-[#111826] tracking-tight">
              Create your account
            </h1>
            <p className="text-sm text-[#2E3141]/70 mt-1.5">
              Start configuring quotes, approvals, and deal pipelines in minutes.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-3.5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#111826] mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 border border-neutral-300 rounded-xl text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#724B66]/30 focus:border-[#724B66] transition"
                  placeholder="e.g. Alex Morgan"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#111826] mb-1">
                Work Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 border border-neutral-300 rounded-xl text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#724B66]/30 focus:border-[#724B66] transition"
                  placeholder="alex@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#111826] mb-1">
                Phone Number <span className="text-neutral-400 text-[10px] font-normal tracking-normal">(optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 border border-neutral-300 rounded-xl text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#724B66]/30 focus:border-[#724B66] transition"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#111826] mb-1">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 border border-neutral-300 rounded-xl text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#724B66]/30 focus:border-[#724B66] transition"
                    placeholder="Min 6 chars"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#111826] mb-1">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 border border-neutral-300 rounded-xl text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#724B66]/30 focus:border-[#724B66] transition"
                    placeholder="Repeat password"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 rounded text-[#724B66] focus:ring-[#724B66]"
                />
                <span className="text-xs text-[#2E3141]/75 leading-relaxed">
                  I agree to the <a href="#terms" onClick={(e) => e.preventDefault()} className="text-[#724B66] font-semibold hover:underline">Terms of Service</a> and <a href="#privacy" onClick={(e) => e.preventDefault()} className="text-[#724B66] font-semibold hover:underline">Privacy Policy</a>.
                </span>
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-[#724B66] hover:bg-[#5a3a50] active:bg-[#4a2e42] shadow-sm hover:shadow-md transition-all duration-150 disabled:opacity-50 cursor-pointer"
              >
                <span>{loading ? 'Creating account...' : 'Create free account'}</span>
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-neutral-100 text-center">
            <p className="text-xs text-[#2E3141]/70">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-[#724B66] hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-neutral-400 text-center lg:text-left">
          © 2026 DealFlow360. Made with ❤️ for modern B2B teams.
        </div>
      </div>

      {/* ── RIGHT COLUMN: High-Tech Grid & Graphics ── */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[55%] relative overflow-hidden bg-gradient-to-br from-[#2E3141] via-[#4A2341] to-[#724B66] p-12 text-white flex-col justify-between select-none">

        {/* Animated Cybernetic / Grid Pattern Overlay */}
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="register-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
                <circle cx="0" cy="0" r="1.5" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#register-grid)" />
          </svg>
        </div>

        {/* Ambient Glows */}
        <div className="absolute top-10 right-10 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-[#724B66]/50 rounded-full blur-3xl pointer-events-none" />

        {/* Top Tagline */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3.5 py-1">
            {/* <Sparkles className="w-3.5 h-3.5 text-pink-300" />
            <span>Complete Deal Management</span> */}
          </div>
          <span className="font-['Caveat',cursive] text-2xl text-pink-200 font-bold">
            One platform. Every stage.
          </span>
        </div>

        {/* Center Graphic & Highlights Area */}
        <div className="relative z-10 my-auto py-8 space-y-6 max-w-lg mx-auto w-full">

          <div className="space-y-3">
            <h3 className="text-3xl font-extrabold text-white tracking-tight leading-snug">
              Everything modern teams need to <br />
              <span className="font-['Caveat',cursive] text-4xl text-pink-200">close bigger deals.</span>
            </h3>
            <p className="text-xs text-pink-100/75 leading-relaxed">
              Connect quotations, multi-tier approval chains, and automated warehouse fulfillment splits in a single unified workspace.
            </p>
          </div>

          {/* Feature checklist */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-5 rounded-2xl shadow-xl space-y-3">
            {perks.map((perk, i) => (
              <div key={i} className="flex items-center gap-2.5 text-xs text-pink-100 font-medium">
                <div className="w-4 h-4 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 flex items-center justify-center text-[10px] shrink-0">
                  <Check className="w-3 h-3" />
                </div>
                <span>{perk}</span>
              </div>
            ))}
          </div>

          {/* Mini quote testimonial card */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-sm font-bold">
              🚀
            </div>
            <div className="text-xs text-pink-100">
              <p className="font-semibold text-white">"Cut our quote approval cycle by 65%"</p>
              <p className="text-[11px] text-pink-200/70">Verified enterprise customer metrics</p>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-pink-200/80">
          <span>Enterprise-grade RBAC & Multi-tenant security</span>
          <span className="font-mono text-[11px]">SOC2 Type II Ready</span>
        </div>

      </div>

    </div>
  );
}
