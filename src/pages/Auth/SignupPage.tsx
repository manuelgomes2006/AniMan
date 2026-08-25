import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../services/auth/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { registerLocalAccount } from '../../services/auth/localAuthStore';
import { Mail, Lock, User, UserPlus, CheckCircle, RefreshCw } from 'lucide-react';

export default function SignupPage() {
  const navigate = useNavigate();
  const { setGuestSession } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Email verification state
  const [verificationSent, setVerificationSent] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim() || cleanEmail.split('@')[0] || 'Member';
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setError('Please enter a valid email address and password.');
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
      // Register local account backup for mobile & offline compatibility
      registerLocalAccount(cleanEmail, cleanPassword, cleanUsername);

      const { data, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/login?verified=true`,
          data: {
            username: cleanUsername,
            display_name: cleanUsername,
          }
        }
      });

      if (authError) {
        console.warn('[AUTH SIGNUP NOTICE]', authError);
        const msg = authError.message.toLowerCase();

        if (msg.includes('already registered') || msg.includes('user already exists')) {
          setError('An account with this email address already exists. Please Sign In.');
          setLoading(false);
          return;
        }
      }

      // If Supabase session returned immediately
      if (data?.session) {
        setGuestSession(cleanEmail, cleanUsername);
        navigate('/', { replace: true });
        return;
      }

      // Automatically authenticate session for mobile users
      setGuestSession(cleanEmail, cleanUsername);
      setVerificationSent(true);
    } catch (err: any) {
      console.warn('[AUTH SIGNUP CATCH]', err);
      registerLocalAccount(cleanEmail, cleanPassword, cleanUsername);
      setGuestSession(cleanEmail, cleanUsername);
      navigate('/', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;
    setResending(true);
    try {
      await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/login?verified=true`
        }
      });
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 4000);
    } catch (err: any) {
      console.warn('Resend error:', err);
    } finally {
      setResending(false);
    }
  };

  const handleDirectProceed = () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim() || cleanEmail.split('@')[0] || 'Member';
    setGuestSession(cleanEmail, cleanUsername);
    navigate('/', { replace: true });
  };

  if (verificationSent) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-md w-full space-y-6 bg-[#0D0D12] border border-slate-800/90 p-6 sm:p-8 rounded-3xl shadow-2xl text-center">
          <div className="w-16 h-16 bg-purple-600/20 border border-purple-500/40 rounded-full flex items-center justify-center mx-auto text-purple-400">
            <Mail className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-black text-white">Account Created! 🎉</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Your account <span className="font-bold text-purple-400">{email}</span> is ready. Click below to stream on AniWorld.
            </p>
          </div>

          {resendSuccess && (
            <div className="bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs p-3 rounded-xl flex items-center justify-center gap-1.5 font-bold">
              <CheckCircle className="w-4 h-4" /> Verification link sent!
            </div>
          )}

          <div className="space-y-3 pt-2">
            <button
              onClick={handleDirectProceed}
              className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-purple-950/60 transition cursor-pointer touch-manipulation"
            >
              Start Streaming Now 🚀
            </button>

            <button
              onClick={handleResendVerification}
              disabled={resending}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
            >
              <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
              {resending ? 'Sending Link...' : 'Send Email Verification Link'}
            </button>

            <Link
              to="/login"
              className="block text-center text-xs text-slate-400 hover:text-purple-400 font-bold pt-1"
            >
              Back to Sign In
            </Link>
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
          <p className="text-xs text-slate-400">Join AniWorld to save your watchlist and stream seamlessly.</p>
        </div>

        {error && (
          <div className="bg-rose-950/40 border border-rose-800 text-rose-300 text-xs p-3 rounded-xl text-center leading-relaxed font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Username</label>
            <div className="relative">
              <input
                type="text"
                required
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="anime_fan99"
                className="w-full bg-[#050507] text-white placeholder-slate-500 pl-10 pr-4 py-3 rounded-xl border border-slate-800 focus:outline-none focus:border-purple-500 text-xs font-medium"
              />
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

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
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 pt-2">
          Already have an account?{' '}
          <Link to="/signup" className="text-purple-400 hover:underline font-bold">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
