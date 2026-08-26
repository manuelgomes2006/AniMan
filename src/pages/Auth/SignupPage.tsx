import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../../services/auth/supabaseClient';
import { Mail, Lock, User, UserPlus, CheckCircle, RefreshCw, KeyRound, ArrowRight, AlertCircle } from 'lucide-react';

export default function SignupPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const initialEmail = searchParams.get('email') || '';

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (stepOfVerification) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-md w-full space-y-6 bg-[#0D0D12] border border-slate-800/90 p-6 sm:p-8 rounded-3xl shadow-2xl text-center">
          <div className="w-16 h-16 bg-purple-600/20 border border-purple-500/40 rounded-full flex items-center justify-center mx-auto text-purple-400">
            <Mail className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-black text-white">Step of Verification 📧</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              We've sent a verification code / link to <span className="font-bold text-purple-400">{email}</span>. Enter the code below or click the verification link in your email.
            </p>
          </div>

          {resendSuccess && (
            <div className="bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs p-3 rounded-xl flex items-center justify-center gap-1.5 font-bold">
              <CheckCircle className="w-4 h-4" /> New verification code sent to your inbox!
            </div>
          )}

          {otpError && (
            <div className="bg-rose-950/40 border border-rose-800 text-rose-300 text-xs p-3 rounded-xl font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{otpError}</span>
            </div>
          )}

          <form onSubmit={handleVerifyOtp} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 text-left">6-Digit Verification Code</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpToken}
                  onChange={(e) => setOtpToken(e.target.value)}
                  placeholder="123456"
                  className="w-full bg-[#050507] text-white text-center tracking-[0.4em] font-mono text-base placeholder-slate-600 px-4 py-3 rounded-xl border border-purple-800/80 focus:outline-none focus:border-purple-400"
                />
                <KeyRound className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button
              type="submit"
              disabled={verifyingOtp}
              className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-purple-950/60 transition flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
            >
              <span>{verifyingOtp ? 'Verifying Code...' : 'Verify Code'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="relative border-t border-slate-800/80 my-4">
            <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-[#0D0D12] px-2 text-[10px] text-slate-500 font-bold uppercase">
              OR
            </span>
          </div>

          <div className="space-y-3 pt-1">
            <Link
              to="/login?verified=true"
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-extrabold text-xs rounded-xl transition flex items-center justify-center cursor-pointer touch-manipulation"
            >
              Already Clicked Email Confirmation Link? Sign In 🚀
            </Link>

            <button
              onClick={handleResendVerification}
              disabled={resending}
              className="w-full py-2.5 bg-[#050507] hover:bg-slate-900 text-slate-400 hover:text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
            >
              <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
              {resending ? 'Sending Code...' : 'Resend Verification Email'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md w-full space-y-6 bg-[#0D0D12] border border-slate-800/90 p-6 sm:p-8 rounded-3xl shadow-2xl">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2 text-2xl font-black text-white tracking-tight">
            <span>Ani</span>
            <span className="text-purple-400">World</span>
          </Link>
          <h2 className="text-lg font-extrabold text-white">Create an Account</h2>
          <p className="text-xs text-slate-400">Sign up with your username and email to get started.</p>
        </div>

        {error && (
          <div className="bg-rose-950/40 border border-rose-800 text-rose-300 text-xs p-4 rounded-2xl leading-relaxed flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Username <span className="text-purple-400 font-normal">(Required Handle)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="sonava_official"
                className="w-full bg-[#050507] text-white placeholder-slate-500 pl-10 pr-4 py-3 rounded-xl border border-slate-800 focus:outline-none focus:border-purple-500 text-xs font-medium"
              />
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Email Address <span className="text-purple-400 font-normal">(Required Email)</span>
            </label>
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
            <label className="block text-xs font-bold text-slate-300 mb-1">Password</label>
            <div className="relative">
              <input
                type="password"
                required
                minLength={6}
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

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Confirm Password</label>
            <div className="relative">
              <input
                type="password"
                required
                minLength={6}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
            <UserPlus className="w-4 h-4" />
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 pt-2">
          Already have an account?{' '}
          <Link to="/login" className="text-purple-400 hover:underline font-bold">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
