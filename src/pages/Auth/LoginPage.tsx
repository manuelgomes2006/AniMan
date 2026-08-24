import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../../services/auth/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, LogIn } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signInWithGoogle } = useAuth();

  const searchParams = new URLSearchParams(location.search);
  const redirectUrl = searchParams.get('redirect') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        throw new Error('Unable to sign in. Check your email and password.');
      }

      if (data.session) {
        navigate(redirectUrl, { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Unable to sign in. Check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-[#0D0D12] border border-slate-800/90 p-8 rounded-3xl shadow-2xl">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2 text-2xl font-black text-white tracking-tight">
            <span>Ani</span>
            <span className="text-purple-400">World</span>
          </Link>
          <h2 className="text-lg font-extrabold text-white">Welcome back 👋</h2>
          <p className="text-xs text-slate-400">Sign in to sync your watch history and list.</p>
        </div>

        {error && (
          <div className="bg-rose-950/40 border border-rose-800 text-rose-300 text-xs p-3 rounded-xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                className="w-full bg-[#050507] text-white placeholder-slate-500 pl-10 pr-4 py-3 rounded-xl border border-slate-800 focus:outline-none focus:border-purple-500 text-xs"
              />
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-300">Password</label>
              <Link to="/forgot-password" className="text-[11px] text-purple-400 hover:underline font-bold">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#050507] text-white placeholder-slate-500 pl-10 pr-4 py-3 rounded-xl border border-slate-800 focus:outline-none focus:border-purple-500 text-xs"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-purple-950/60 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="relative border-t border-slate-800/80 my-4">
          <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-[#0D0D12] px-2 text-[10px] text-slate-500 font-bold uppercase">
            OR
          </span>
        </div>

        <button
          onClick={signInWithGoogle}
          className="w-full py-2.5 bg-[#050507] hover:bg-slate-900 text-slate-200 font-bold text-xs rounded-xl border border-slate-800 transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Continue with Google</span>
        </button>

        <p className="text-center text-xs text-slate-400 pt-2">
          Don't have an account?{' '}
          <Link to="/signup" className="text-purple-400 hover:underline font-bold">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
