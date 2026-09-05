import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../../services/auth/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, LogIn, CheckCircle, AlertCircle, Trash2, X, Loader2, ExternalLink } from 'lucide-react';
import logoImg from '../../assets/logo.jpg';
import AnimeBackgroundSlideshow from '../../components/common/AnimeBackgroundSlideshow';

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
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
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

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      await signInWithGoogle(redirectUrl);
    } catch (err: any) {
      console.error('[GOOGLE SIGN IN ERROR]', err);
      setError(err?.message || 'Failed to initialize Google Sign-In.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AnimeBackgroundSlideshow intervalMs={5500}>
      {/* TOP NAVBAR (Matching Reference Image + Website Elements) */}
      <header className="relative z-20 w-full px-5 sm:px-10 py-5 flex items-center justify-between">
        {/* Brand Logo on Left */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden border-2 border-white/60 shadow-lg shadow-black/60 group-hover:scale-105 transition-transform bg-black flex items-center justify-center">
            <img src={logoImg} alt="AniMan Logo" className="w-full h-full object-cover object-center scale-[1.35]" />
          </div>
          <span className="font-black text-xl sm:text-2xl text-white tracking-tight drop-shadow-md">
            Ani<span className="text-purple-400">Man</span>
          </span>
        </Link>

        {/* Website Navigation Links in Center */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-white/90 drop-shadow">
          <Link to="/" className="hover:text-purple-300 transition">
            Home
          </Link>
          <Link to="/browse" className="hover:text-purple-300 transition">
            Browse
          </Link>
          <Link to="/browse?tab=genres" className="hover:text-purple-300 transition">
            Genres
          </Link>
          <Link to="/schedule" className="hover:text-purple-300 transition">
            Schedule
          </Link>
        </nav>

        {/* Top-Right Pill Action Button */}
        <Link
          to="/signup"
          className="px-5 py-2 rounded-full border border-white/70 hover:border-white text-white font-bold text-xs tracking-wider backdrop-blur-md bg-white/10 hover:bg-white/25 transition shadow-lg"
        >
          Sign Up
        </Link>
      </header>

      {/* CENTERED GLASSMORPHISM CARD (Matching Reference Image) */}
      <main className="relative z-20 flex-1 flex items-center justify-center px-4 py-8 my-auto">
        <div className="relative w-full max-w-[420px] rounded-3xl p-7 sm:p-9 shadow-2xl backdrop-blur-2xl bg-white/[0.12] border border-white/30 text-white shadow-[0_12px_40px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in-95 duration-200">
          
          {/* Top-Right Close Button ("X") */}
          <Link
            to="/"
            className="absolute top-5 right-5 w-8 h-8 rounded-xl bg-black/60 hover:bg-black/85 border border-white/25 flex items-center justify-center text-white/80 hover:text-white transition cursor-pointer shadow-md"
            title="Close"
          >
            <X className="w-4 h-4" />
          </Link>

          {/* Card Title */}
          <h1 className="text-2xl sm:text-3xl font-black text-center text-white tracking-tight mb-7 drop-shadow-sm">
            Login
          </h1>

          {/* Feedback & Alert Banners */}
          {isAccountDeleted && (
            <div className="mb-5 bg-rose-950/75 border border-rose-700 text-rose-200 text-xs p-3.5 rounded-2xl flex items-center gap-2.5 font-bold shadow-lg">
              <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Your account has been permanently deleted.</span>
            </div>
          )}

          {verifiedSuccess && !isAccountDeleted && (
            <div className="mb-5 bg-emerald-950/75 border border-emerald-700 text-emerald-200 text-xs p-3.5 rounded-2xl flex items-center gap-2.5 font-bold shadow-lg">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Email verified! You can now sign in below.</span>
            </div>
          )}

          {error && (
            <div className="mb-5 bg-rose-950/80 border border-rose-700 text-rose-200 text-xs p-3.5 rounded-2xl space-y-2 shadow-lg">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-rose-300">
                    {error.includes('GOOGLE_PROVIDER_DISABLED') ? 'Google Sign-In Disabled' : 'Sign In Notice'}
                  </p>
                  <p className="text-[11px] text-rose-200 leading-relaxed">
                    {error.includes('GOOGLE_PROVIDER_DISABLED')
                      ? 'Google Sign-In needs to be enabled in your Supabase project under Authentication -> Providers.'
                      : error}
                  </p>
                </div>
              </div>
              {error.includes('GOOGLE_PROVIDER_DISABLED') && (
                <div className="pt-1">
                  <a
                    href="https://supabase.com/dashboard/project/gxcflibgvgvnwhngxygl/auth/providers"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[11px] font-bold transition shadow"
                  >
                    <span>Open Supabase Providers Settings</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Minimalist Underline Email Input */}
            <div className="relative border-b-2 border-white/40 focus-within:border-white transition-colors pb-1">
              <input
                type="email"
                required
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full bg-transparent text-white placeholder-white/70 pr-8 py-2 text-sm focus:outline-none font-medium"
              />
              <Mail className="w-4 h-4 text-white/75 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Minimalist Underline Password Input */}
            <div className="relative border-b-2 border-white/40 focus-within:border-white transition-colors pb-1">
              <input
                type="password"
                required
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-transparent text-white placeholder-white/70 pr-8 py-2 text-sm focus:outline-none font-medium"
              />
              <Lock className="w-4 h-4 text-white/75 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Remember Me & Forgot Password Row */}
            <div className="flex items-center justify-between text-xs text-white/90 font-semibold pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="accent-purple-600 rounded w-4 h-4 cursor-pointer"
                />
                <span>Remember me</span>
              </label>

              <Link
                to="/forgot-password"
                className="text-white/85 hover:text-white hover:underline transition"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Dark Rounded Submit Button */}
            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full py-3 bg-[#0d1728]/95 hover:bg-[#0d1728] active:scale-[0.99] border border-white/20 text-white font-black text-sm rounded-xl shadow-xl transition flex items-center justify-center gap-2 cursor-pointer touch-manipulation disabled:opacity-60"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Logging in...' : 'Login'}</span>
            </button>
          </form>

          {/* Social OAuth & Switch Link */}
          <div className="mt-5 space-y-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading || googleLoading}
              className="w-full py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/25 border border-white/25 text-white font-bold text-xs rounded-xl backdrop-blur-md transition flex items-center justify-center gap-2.5 cursor-pointer touch-manipulation shadow-md disabled:opacity-60"
            >
              {googleLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Connecting to Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            <p className="text-center text-xs text-white/85 font-medium pt-1">
              Don't have an account?{' '}
              <Link to="/signup" className="text-white font-black hover:underline ml-1">
                Register
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-3 text-center text-[11px] text-white/50">
        AniMan © {new Date().getFullYear()} • Anime Streaming
      </footer>
    </AnimeBackgroundSlideshow>
  );
}
