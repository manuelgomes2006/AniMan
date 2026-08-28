import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../services/auth/supabaseClient';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import logoImg from '../../assets/logo.jpg';

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
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md w-full space-y-6 bg-[#0D0D12] border border-slate-800/90 p-8 rounded-3xl shadow-2xl">
        <div className="flex flex-col items-center text-center space-y-3">
          <Link to="/" className="flex flex-col items-center gap-2 group">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-purple-500/60 shadow-2xl shadow-purple-950/80 group-hover:scale-105 transition-transform bg-black flex items-center justify-center">
              <img src={logoImg} alt="AniMan Logo" className="w-full h-full object-cover object-center" />
            </div>
            <span className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none mt-1">
              Ani<span className="text-purple-400">Man</span>
            </span>
          </Link>
          <div className="space-y-1">
            <h2 className="text-lg font-extrabold text-white">Reset Your Password</h2>
            <p className="text-xs text-slate-400">Enter your email address to receive a password reset link.</p>
          </div>
        </div>

        {sent ? (
          <div className="bg-purple-950/40 border border-purple-800 text-purple-300 text-xs p-4 rounded-2xl text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-purple-400 mx-auto" />
            <p className="font-extrabold text-white text-sm">Reset Link Dispatched!</p>
            <p className="text-slate-300 leading-relaxed">
              If an account is associated with <span className="font-bold text-purple-300">{email}</span>, a password reset link has been sent to your inbox.
            </p>
            <div className="pt-2">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-1.5 text-xs text-white bg-purple-600 hover:bg-purple-500 font-extrabold px-4 py-2 rounded-xl transition shadow-md"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Return to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-rose-950/40 border border-rose-800 text-rose-300 text-xs p-3 rounded-xl text-center font-bold">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full bg-[#050507] text-white placeholder-slate-500 pl-10 pr-4 py-3 rounded-xl border border-slate-800 focus:outline-none focus:border-purple-500 text-xs font-medium"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-purple-950/60 transition cursor-pointer"
            >
              {loading ? 'Sending Link...' : 'Send Reset Link'}
            </button>

            <div className="text-center pt-2">
              <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white font-semibold">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
