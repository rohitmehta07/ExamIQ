import React, { useState } from 'react';
import {
  GraduationCap,
  User,
  Lock,
  Mail,
  Sparkles,
  Cpu,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';

interface Props {
  onLoginSuccess: (user: { access_token: string; role: string; full_name: string; email: string }) => void;
}

export const LoginPage: React.FC<Props> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const role = 'STUDENT';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDemoLogin = async (demoEmail: string, demoPass: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.login(demoEmail, demoPass);
      onLoginSuccess(res);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'LOGIN') {
        const res = await api.login(email, password);
        onLoginSuccess(res);
      } else {
        const res = await api.register(email, password, fullName, role);
        onLoginSuccess(res);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl"></div>
      </div>

      {/* Top Banner Header */}
      <header className="relative z-10 px-6 sm:px-8 py-5 flex items-center justify-between border-b border-slate-800/60 backdrop-blur-md bg-slate-950/50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-white text-xl tracking-tight">EXAMIQ</span>
            </div>
            <p className="text-xs text-slate-400">Intelligent Academic Exam Strategy Platform</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>Local RapidOCR & TF-IDF Embeddings</span>
          </div>
          <button
            type="button"
            onClick={() => handleDemoLogin('demo@examiq.edu', 'DemoStudent123!')}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 text-xs font-semibold text-slate-300 hover:text-white transition shadow-sm cursor-pointer disabled:opacity-50"
            title="Explore with pre-seeded demo account"
          >
            Try Demo Account
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto p-6 md:p-12 flex flex-col lg:flex-row items-center justify-center gap-12">
        {/* Left Column: Product Value */}
        <div className="flex-1 space-y-6 max-w-lg text-left">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Academic Preparation Platform</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-tight">
            Turn your study material into an <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">intelligent exam strategy.</span>
          </h1>

          <p className="text-slate-300 text-sm md:text-base leading-relaxed">
            ExamIQ ingests course notes, professor slides, and previous year papers to calculate an explainable
            Preparation Priority, generate structured marking rubrics, and deliver personalized study schedules.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <div className="text-xs font-bold text-slate-200">Explainable Priority Ranks</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Calculated from past exam evidence and syllabus weight.</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <div className="text-xs font-bold text-slate-200">Answer Coach & Rubrics</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Step-by-step guidance grounded in your course materials.</div>
            </div>
          </div>
        </div>

        {/* Right Column: Custom Auth Card */}
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="flex border-b border-slate-800">
            <button
              onClick={() => { setMode('LOGIN'); setError(null); }}
              className={`flex-1 py-3 text-sm font-bold border-b-2 transition cursor-pointer ${
                mode === 'LOGIN'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('REGISTER'); setError(null); }}
              className={`flex-1 py-3 text-sm font-bold border-b-2 transition cursor-pointer ${
                mode === 'REGISTER'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'REGISTER' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Rohith V"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@college.edu"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Authenticating...' : mode === 'LOGIN' ? 'Sign In to ExamIQ' : 'Create ExamIQ Account'}
            </button>
          </form>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => handleDemoLogin('demo@examiq.edu', 'DemoStudent123!')}
              disabled={loading}
              className="text-xs text-slate-400 hover:text-indigo-300 transition cursor-pointer font-medium inline-flex items-center space-x-1.5 py-1 px-2.5 rounded-lg hover:bg-slate-800/60 border border-transparent hover:border-slate-800"
            >
              <span>Want a quick preview?</span>
              <span className="text-indigo-400 font-semibold underline underline-offset-2">Try Demo Account</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-8 py-5 border-t border-slate-800/60 bg-slate-950/70 text-center text-xs text-slate-400 flex items-center justify-center">
        <div>
          ExamIQ — Human-Centered Academic Preparation System. Built with PyMuPDF, RapidOCR ONNX, and TF-IDF/SVD.
        </div>
      </footer>
    </div>
  );
};

