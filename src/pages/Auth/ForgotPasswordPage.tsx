import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../services/auth/supabaseClient';
import { Mail, ArrowLeft, CheckCircle2, X } from 'lucide-react';
import logoImg from '../../assets/logo.jpg';
import AnimeBackgroundSlideshow from '../../components/common/AnimeBackgroundSlideshow';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (resetErr) {
        console.warn('[FORGOT PASSWORD NOTICE]', resetErr);
      }

      setSent(true);
    } catch (err: any) {
      console.warn('[FORGOT PASSWORD CATCH]', err);
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimeBackgroundSlideshow intervalMs={5500}>
      {/* TOP NAVBAR */}
      <header className="relative z-20 w-full px-5 sm:px-10 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden border-2 border-white/60 shadow-lg shadow-black/60 group-hover:scale-105 transition-transform bg-black flex items-center justify-center">
            <img src={logoImg} alt="AniMan Logo" className="w-full h-full object-cover object-center scale-[1.35]" />
          </div>
          <span className="font-black text-xl sm:text-2xl text-white tracking-tight drop-shadow-md">
            Ani<span className="text-purple-400">Man</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-white/90 drop-shadow">
          <Link to="/" className="hover:text-purple-300 transition">Home</Link>
          <Link to="/browse" className="hover:text-purple-300 transition">Browse</Link>
          <Link to="/browse?tab=genres" className="hover:text-purple-300 transition">Genres</Link>
          <Link to="/schedule" className="hover:text-purple-300 transition">Schedule</Link>
        </nav>

        <Link
          to="/login"
          className="px-5 py-2 rounded-full border border-white/70 hover:border-white text-white font-bold text-xs tracking-wider backdrop-blur-md bg-white/10 hover:bg-white/25 transition shadow-lg"
        >
          Login
        </Link>
      </header>

      {/* CENTERED GLASSMORPHISM CARD */}
      <main className="relative z-20 flex-1 flex items-center justify-center px-4 py-8 my-auto">
        <div className="relative w-full max-w-[420px] rounded-3xl p-7 sm:p-9 shadow-2xl backdrop-blur-2xl bg-white/[0.12] border border-white/30 text-white shadow-[0_12px_40px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in-95 duration-200">
          
          <Link
            to="/login"
            className="absolute top-5 right-5 w-8 h-8 rounded-xl bg-black/60 hover:bg-black/85 border border-white/25 flex items-center justify-center text-white/80 hover:text-white transition cursor-pointer shadow-md"
            title="Back to Login"
          >
            <X className="w-4 h-4" />
          </Link>

          <h1 className="text-2xl sm:text-3xl font-black text-center text-white tracking-tight mb-2 drop-shadow-sm">
            Reset Password
          </h1>
          <p className="text-xs text-white/80 text-center mb-6">
            Enter your email address to receive a password reset link.
          </p>

          {sent ? (
            <div className="bg-emerald-950/75 border border-emerald-700 text-emerald-200 text-xs p-4 rounded-2xl text-center space-y-3 shadow-lg">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <p className="font-extrabold text-white text-sm">Reset Link Sent!</p>
              <p className="text-white/90 leading-relaxed">
                If an account exists for <span className="font-bold text-purple-300">{email}</span>, a reset link has been dispatched to your inbox.
              </p>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-1.5 text-xs text-white bg-[#0d1728]/95 hover:bg-[#0d1728] border border-white/20 font-extrabold px-4 py-2.5 rounded-xl transition shadow-md"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Return to Login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-rose-950/75 border border-rose-700 text-rose-200 text-xs p-3 rounded-xl text-center font-bold">
                  {error}
                </div>
              )}

              <div className="relative border-b-2 border-white/40 focus-within:border-white transition-colors pb-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full bg-transparent text-white placeholder-white/70 pr-8 py-2 text-sm focus:outline-none font-medium"
                />
                <Mail className="w-4 h-4 text-white/75 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#0d1728]/95 hover:bg-[#0d1728] active:scale-[0.99] border border-white/20 text-white font-black text-sm rounded-xl shadow-xl transition flex items-center justify-center gap-2 cursor-pointer touch-manipulation disabled:opacity-60"
              >
                {loading ? 'Sending Link...' : 'Send Reset Link'}
              </button>

              <div className="text-center pt-2">
                <Link to="/login" className="text-xs text-white/80 hover:text-white hover:underline flex items-center justify-center gap-1.5 font-medium">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>

      <footer className="relative z-10 py-3 text-center text-[11px] text-white/50">
        AniMan © {new Date().getFullYear()} • Anime Streaming
      </footer>
    </AnimeBackgroundSlideshow>
  );
}
