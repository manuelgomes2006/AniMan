import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../../services/auth/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, User, UserPlus, CheckCircle, RefreshCw, KeyRound, AlertCircle, X, Loader2, ExternalLink } from 'lucide-react';
import logoImg from '../../assets/logo.jpg';
import AnimeBackgroundSlideshow from '../../components/common/AnimeBackgroundSlideshow';

export default function SignupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, signInWithGoogle } = useAuth();

  const searchParams = new URLSearchParams(location.search);
  const initialEmail = searchParams.get('email') || '';

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      await signInWithGoogle('/');
    } catch (err: any) {
      console.error('[GOOGLE SIGN UP ERROR]', err);
      setError(err?.message || 'Failed to initialize Google Sign-In.');
    } finally {
      setGoogleLoading(false);
    }
  };

  // Verification Step state
  const [stepOfVerification, setStepOfVerification] = useState(false);
  const [otpToken, setOtpToken] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanUsername || !cleanPassword) {
      setError('Please fill out all required fields.');
      return;
    }

    if (cleanPassword !== confirmPassword.trim()) {
      setError('Passwords do not match.');
      return;
    }

    if (cleanPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Supabase Auth Registration
      const { data, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/login?verified=true`,
          data: {
            username: cleanUsername,
            display_name: username.trim(),
          }
        }
      });

      if (authError) {
        console.error('[AUTH SIGNUP ERROR]', authError);
        const msg = authError.message.toLowerCase();

        if (msg.includes('already registered') || msg.includes('user already exists')) {
          setError('An account with this email address already exists. Please Sign In.');
        } else {
          setError(authError.message);
        }
        setLoading(false);
        return;
      }

      // If user session is established immediately (or confirmation email sent)
      if (data?.session) {
        navigate('/', { replace: true });
      } else {
        setStepOfVerification(true);
      }
    } catch (err: any) {
      console.error('[AUTH SIGNUP CATCH]', err);
      setError(err?.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = otpToken.trim();
    if (!cleanToken || cleanToken.length < 6) {
      setOtpError('Please enter a valid 6-digit verification code.');
      return;
    }

    setVerifyingOtp(true);
    setOtpError(null);

    const cleanEmail = email.trim().toLowerCase();

    try {
      const { data, error: verifyErr } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'signup'
      });

      if (verifyErr) {
        console.error('[OTP VERIFICATION ERROR]', verifyErr);
        setOtpError(verifyErr.message || 'Invalid or expired verification code.');
        setVerifyingOtp(false);
        return;
      }

      if (data?.session) {
        navigate('/', { replace: true });
      } else {
        navigate('/login?verified=true', { replace: true });
      }
    } catch (err: any) {
      console.error('[OTP VERIFICATION CATCH]', err);
      setOtpError(err?.message || 'Verification failed. Please try again.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleResendVerification = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;
    setResending(true);
    setOtpError(null);

    try {
      const { error: resendErr } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/login?verified=true`
        }
      });

      if (resendErr) {
        setOtpError(resendErr.message);
      } else {
        setResendSuccess(true);
        setTimeout(() => setResendSuccess(false), 4000);
      }
    } catch (err: any) {
      console.error('Resend error:', err);
      setOtpError(err?.message || 'Failed to resend verification code.');
    } finally {
      setResending(false);
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

        <Link
          to="/login"
          className="px-5 py-2 rounded-full border border-white/70 hover:border-white text-white font-bold text-xs tracking-wider backdrop-blur-md bg-white/10 hover:bg-white/25 transition shadow-lg"
        >
          Login
        </Link>
      </header>

      {/* CENTERED GLASSMORPHISM CARD */}
      <main className="relative z-20 flex-1 flex items-center justify-center px-4 py-8 my-auto">
        <div className="relative w-full max-w-[430px] rounded-3xl p-7 sm:p-9 shadow-2xl backdrop-blur-2xl bg-white/[0.12] border border-white/30 text-white shadow-[0_12px_40px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in-95 duration-200">
          
          <Link
            to="/"
            className="absolute top-5 right-5 w-8 h-8 rounded-xl bg-black/60 hover:bg-black/85 border border-white/25 flex items-center justify-center text-white/80 hover:text-white transition cursor-pointer shadow-md"
            title="Close"
          >
            <X className="w-4 h-4" />
          </Link>

          <h1 className="text-2xl sm:text-3xl font-black text-center text-white tracking-tight mb-6 drop-shadow-sm">
            {stepOfVerification ? 'Verify Account' : 'Register'}
          </h1>

          {/* OTP Verification Step */}
          {stepOfVerification ? (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <p className="text-xs text-white/85 leading-relaxed">
                  We've sent a 6-digit verification code to <span className="font-bold text-purple-300">{email}</span>.
                </p>
              </div>

              {resendSuccess && (
                <div className="bg-emerald-950/75 border border-emerald-700 text-emerald-200 text-xs p-3 rounded-xl flex items-center justify-center gap-1.5 font-bold shadow-lg">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>New verification code sent!</span>
                </div>
              )}

              {otpError && (
                <div className="bg-rose-950/75 border border-rose-700 text-rose-200 text-xs p-3.5 rounded-2xl flex items-center gap-2 font-bold shadow-lg">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{otpError}</span>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="relative border-b-2 border-white/40 focus-within:border-white transition-colors pb-1">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpToken}
                    onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit Code"
                    className="w-full bg-transparent text-white placeholder-white/70 text-center tracking-[0.4em] font-mono text-lg py-2 focus:outline-none"
                  />
                  <KeyRound className="w-4 h-4 text-white/75 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <button
                  type="submit"
                  disabled={verifyingOtp}
                  className="w-full py-3 bg-[#0d1728]/95 hover:bg-[#0d1728] active:scale-[0.99] border border-white/20 text-white font-black text-sm rounded-xl shadow-xl transition flex items-center justify-center gap-2 cursor-pointer touch-manipulation disabled:opacity-60"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{verifyingOtp ? 'Verifying...' : 'Verify & Continue'}</span>
                </button>
              </form>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resending}
                  className="w-full py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                  <span>{resending ? 'Resending Code...' : 'Resend Code'}</span>
                </button>

                <Link
                  to="/login?verified=true"
                  className="text-center text-xs text-white/80 hover:text-white hover:underline py-1"
                >
                  Already verified? Sign In
                </Link>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-5 bg-rose-950/80 border border-rose-700 text-rose-200 text-xs p-3.5 rounded-2xl space-y-2 shadow-lg">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-rose-300">
                        {error.includes('GOOGLE_PROVIDER_DISABLED') ? 'Google Sign-In Disabled' : 'Registration Notice'}
                      </p>
                      <p className="text-[11px] text-rose-200 leading-relaxed">
                        {error.includes('GOOGLE_PROVIDER_DISABLED')
                          ? 'Google Sign-In needs to be enabled in your Supabase project under Authentication -> Providers.'
                          : error}
                      </p>
                      {(error.includes('already exists') || error.includes('already registered')) && (
                        <div className="pt-1 flex items-center gap-3 font-bold">
                          <Link
                            to={`/login?email=${encodeURIComponent(email)}`}
                            className="text-purple-300 hover:text-white underline"
                          >
                            Sign In &rarr;
                          </Link>
                          <Link
                            to={`/forgot-password?email=${encodeURIComponent(email)}`}
                            className="text-white/80 hover:text-white underline font-normal"
                          >
                            Reset Password
                          </Link>
                        </div>
                      )}
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

              <form onSubmit={handleSignup} className="space-y-5">
                {/* Username Input */}
                <div className="relative border-b-2 border-white/40 focus-within:border-white transition-colors pb-1">
                  <input
                    type="text"
                    required
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    className="w-full bg-transparent text-white placeholder-white/70 pr-8 py-2 text-sm focus:outline-none font-medium"
                  />
                  <User className="w-4 h-4 text-white/75 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Email Input */}
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

                {/* Password Input */}
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

                {/* Confirm Password Input */}
                <div className="relative border-b-2 border-white/40 focus-within:border-white transition-colors pb-1">
                  <input
                    type="password"
                    required
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm Password"
                    className="w-full bg-transparent text-white placeholder-white/70 pr-8 py-2 text-sm focus:outline-none font-medium"
                  />
                  <Lock className="w-4 h-4 text-white/75 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#0d1728]/95 hover:bg-[#0d1728] active:scale-[0.99] border border-white/20 text-white font-black text-sm rounded-xl shadow-xl transition flex items-center justify-center gap-2 cursor-pointer touch-manipulation disabled:opacity-60 mt-6"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{loading ? 'Creating Account...' : 'Register'}</span>
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
                  Already have an account?{' '}
                  <Link to="/login" className="text-white font-black hover:underline ml-1">
                    Login
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="relative z-10 py-3 text-center text-[11px] text-white/50">
        AniMan © {new Date().getFullYear()} • Anime Streaming
      </footer>
    </AnimeBackgroundSlideshow>
  );
}
