import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../../services/auth/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, LogIn, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import logoImg from '../../assets/logo.jpg';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, signInWithGoogle } = useAuth();

  const searchParams = new URLSearchParams(location.search);
  const redirectUrl = searchParams.get('redirect') || '/';
  const isVerified = searchParams.get('verified') === 'true';
  const isAccountDeleted = searchParams.get('account_deleted') === 'true';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifiedSuccess, setVerifiedSuccess] = useState(isVerified);

  useEffect(() => {
    if (!authLoading && user) {
      navigate(redirectUrl, { replace: true });
    }
  }, [user, authLoading, navigate, redirectUrl]);

  useEffect(() => {
    // Handle Supabase Auth hash tokens (e.g. #access_token=...&type=signup)
    if (window.location.hash.includes('access_token') || window.location.hash.includes('type=signup')) {
      setVerifiedSuccess(true);
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          navigate('/', { replace: true });
        }
      });
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setError('Please enter both your email address and password.');
      setLoading(false);
      return;
    }

    try {
      // Supabase Auth Authentication
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword
      });

      if (authError) {
        console.error('[AUTH LOGIN]', authError);

        const msg = authError.message.toLowerCase();
        if (msg.includes('email not confirmed')) {
          setError('Your email verification is pending. Please check your inbox and click the confirmation link before logging in.');
        } else if (msg.includes('invalid login credentials')) {
          setError('Invalid login credentials. Please check your email and password.');
        } else {
          setError(authError.message);
        }
        setLoading(false);
        return;
      }

      if (data?.session) {
        navigate(redirectUrl, { replace: true });
      }
    } catch (err: any) {
      console.error('[AUTH LOGIN EXCEPTION]', err);
      setError(err?.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md w-full space-y-6 bg-[#0D0D12] border border-slate-800/90 p-6 sm:p-8 rounded-3xl shadow-2xl">
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
            <h2 className="text-lg font-extrabold text-white">Welcome Back 👋</h2>
            <p className="text-xs text-slate-400">Sign in to your AniMan account to stream seamlessly.</p>
          </div>
        </div>

        {isAccountDeleted && (
          <div className="bg-rose-950/60 border border-rose-800 text-rose-200 text-xs p-4 rounded-2xl flex items-center gap-3 font-bold leading-relaxed">
            <Trash2 className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <p className="font-extrabold text-white">Account Deleted</p>
              <p className="text-[11px] text-rose-300 font-normal">
                Your account and associated personal data have been permanently deleted. You have been signed out.
              </p>
            </div>
          </div>
        )}

        {verifiedSuccess && !isAccountDeleted && (
          <div className="bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs p-3.5 rounded-xl flex items-center justify-center gap-2 text-center font-bold">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Email verified successfully! You can now sign in below.</span>
          </div>
        )}

        {error && (
          <div className="bg-rose-950/40 border border-rose-800 text-rose-300 text-xs p-4 rounded-2xl leading-relaxed">
            <div className="flex items-center gap-2 font-extrabold text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <input
                type="email"
                required
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                className="w-full bg-[#050507] text-white placeholder-slate-500 pl-10 pr-4 py-3 rounded-xl border border-slate-800 focus:outline-none focus:border-purple-500 text-xs font-medium"
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
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#050507] text-white placeholder-slate-500 pl-10 pr-4 py-3 rounded-xl border border-slate-800 focus:outline-none focus:border-purple-500 text-xs font-medium"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-purple-950/60 transition flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
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
          className="w-full py-3 bg-[#050507] hover:bg-slate-900 active:bg-slate-800 text-slate-200 font-bold text-xs rounded-xl border border-slate-800 transition flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
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
