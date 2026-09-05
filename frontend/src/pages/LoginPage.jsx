import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  Mail, Lock, ArrowRight, ArrowLeft, CheckCircle2, 
  ShieldCheck, Zap, TrendingUp, Sparkles, AlertCircle 
} from 'lucide-react';

export function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const justRegistered = location.state?.registered;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      await login(identifier, password);
      // PRD FR-1.3: Confirm org context or select workspace
      navigate('/select-workspace');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#FFFFFF]">
      
      {/* ── LEFT COLUMN: Login Form ── */}
      <div className="w-full lg:w-[48%] xl:w-[45%] flex flex-col justify-between p-8 sm:p-12 lg:p-16 z-10">
        
        {/* Top Header & Back link */}
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-1 group">
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
        <div className="max-w-md w-full mx-auto my-auto py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-[#111826] tracking-tight">
              Welcome back
            </h1>
            <p className="text-sm text-[#2E3141]/70 mt-2">
              Sign in to manage your quotations, approvals, and deal pipelines.
            </p>
          </div>

          {justRegistered && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Account created successfully! Please sign in with your credentials.</span>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#111826] mb-1.5">
                Email or Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 border border-neutral-300 rounded-xl text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#724B66]/30 focus:border-[#724B66] transition"
                  placeholder="name@company.com or EMP-1042.acme"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#111826]">
                  Password
                </label>
                <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('Please contact your administrator to reset your password.'); }} className="text-xs text-[#724B66] hover:underline font-medium">
                  Forgot password?
                </a>
              </div>
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
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-[#724B66] hover:bg-[#5a3a50] active:bg-[#4a2e42] shadow-sm hover:shadow-md transition-all duration-150 disabled:opacity-50 cursor-pointer"
              >
                <span>{loading ? 'Authenticating...' : 'Sign in to DealFlow360'}</span>
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-neutral-100 text-center">
            <p className="text-xs text-[#2E3141]/70">
              Don't have an account?{' '}
              <Link to="/register" className="font-bold text-[#724B66] hover:underline">
                Create an account for free
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-neutral-400 text-center lg:text-left">
          © 2026 DealFlow360. Secure 256-bit TLS encryption.
        </div>
      </div>

      {/* ── RIGHT COLUMN: High-Tech Grid & Graphics ── */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[55%] relative overflow-hidden bg-gradient-to-br from-[#2E3141] via-[#45203A] to-[#6A395C] p-12 text-white flex-col justify-between select-none">
        
        {/* Animated Cybernetic/Isometric Grid Overlay */}
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="login-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
                <circle cx="0" cy="0" r="1.5" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#login-grid)" />
          </svg>
        </div>

        {/* Ambient Glow Orbs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#724B66]/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Tagline */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-pink-200 border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-pink-300" />
            <span>Intelligent Deal Governance Engine</span>
          </div>
          <span className="font-['Caveat',cursive] text-2xl text-pink-200 font-bold">
            Simpler. Faster. Smarter.
          </span>
        </div>

        {/* Center Floating Glassmorphic Cards & Graphic */}
        <div className="relative z-10 my-auto py-8 space-y-5 max-w-lg mx-auto w-full">
          
          {/* Card 1: Fast Quotation Approval */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-5 rounded-2xl shadow-2xl space-y-3 transform hover:scale-[1.02] transition-transform duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Quotation #Q-8420 Approved</h4>
                  <p className="text-xs text-pink-100/70">Acme Enterprise • $124,500.00</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                0.0 pt Risk
              </span>
            </div>
            
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-400 to-teal-300 h-full w-[100%]" />
            </div>
            <div className="flex justify-between text-[10px] text-pink-100/60 font-mono">
              <span>Sales Manager: Confirmed</span>
              <span>Margin: 42.8% (Healthy)</span>
            </div>
          </div>

          {/* Card 2: Multi-Warehouse Split Metric */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-5 rounded-2xl shadow-2xl space-y-3 transform translate-x-4 hover:scale-[1.02] transition-transform duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Automated Fulfillment Split</h4>
                  <p className="text-xs text-pink-100/70">Optimized across Austin & Chicago Depots</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-400/20 text-purple-200 border border-purple-400/30">
                -32% Freight Cost
              </span>
            </div>
          </div>

          {/* Card 3: MRR Growth */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-5 rounded-2xl shadow-2xl space-y-2 transform hover:scale-[1.02] transition-transform duration-200">
            <div className="flex items-center justify-between text-xs text-pink-100/80">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-pink-300" />
                <span className="font-semibold">Recurring Revenue Growth</span>
              </div>
              <span className="text-emerald-300 font-bold">+28% this quarter</span>
            </div>
            <p className="text-xs text-pink-100/60 leading-relaxed">
              Automated daily proration invoices & contract renewals operating seamlessly.
            </p>
          </div>

        </div>

        {/* Bottom Testimonial Banner */}
        <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-violet-400 border-2 border-white/40 flex items-center justify-center text-xs font-bold">DR</div>
              <div className="w-8 h-8 rounded-full bg-pink-400 border-2 border-white/40 flex items-center justify-center text-xs font-bold">YS</div>
              <div className="w-8 h-8 rounded-full bg-blue-400 border-2 border-white/40 flex items-center justify-center text-xs font-bold">AM</div>
            </div>
            <div className="text-xs">
              <p className="font-bold text-white">Trusted by 500+ modern sales teams</p>
              <p className="text-[11px] text-pink-200/70">Average deal closure accelerated by 2x</p>
            </div>
          </div>

          <div className="text-amber-300 text-sm font-bold">
            ★★★★★ <span className="text-xs text-white font-medium">4.8/5</span>
          </div>
        </div>

      </div>

    </div>
  );
}
