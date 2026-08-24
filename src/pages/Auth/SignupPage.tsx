import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../../services/auth/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, User, UserPlus } from 'lucide-react';

export default function SignupPage() {
  const navigate = useNavigate();
  const { setGuestSession } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cleanUsername = username.trim() || email.split('@')[0] || 'Member';

      if (!isSupabaseConfigured()) {
        setGuestSession(email, cleanUsername);
        navigate('/', { replace: true });
        return;
      }

      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: cleanUsername,
            display_name: cleanUsername,
          }
        }
      });

      if (authError) {
        if (authError.message.toLowerCase().includes('already registered')) {
          setError('An account with this email already exists.');
          return;
        }
        // Fallback for dev / unconfigured Supabase database setup
        setGuestSession(email, cleanUsername);
        navigate('/', { replace: true });
        return;
      }

      if (data.user) {
        // Initialize profile row directly if trigger hasn't completed
        await supabase.from('profiles').upsert({
          id: data.user.id,
          username: cleanUsername,
          display_name: cleanUsername,
          avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'
        }, { onConflict: 'id' }).catch(() => {});

        await supabase.from('user_preferences').upsert({
          user_id: data.user.id,
          preferred_audio: 'sub',
          preferred_quality: 'auto',
          autoplay: true,
          autoplay_next: true,
          skip_intro: false,
          skip_outro: false
        }, { onConflict: 'user_id' }).catch(() => {});

        navigate('/', { replace: true });
      } else {
        setGuestSession(email, cleanUsername);
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      const cleanUsername = username.trim() || email.split('@')[0] || 'Member';
      setGuestSession(email, cleanUsername);
      navigate('/', { replace: true });
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
          <h2 className="text-lg font-extrabold text-white">Create an Account</h2>
          <p className="text-xs text-slate-400">Join AniWorld to save your watchlist and stream seamlessly.</p>
        </div>

        {error && (
          <div className="bg-rose-950/40 border border-rose-800 text-rose-300 text-xs p-3 rounded-xl text-center">
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
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="anime_fan99"
                className="w-full bg-[#050507] text-white placeholder-slate-500 pl-10 pr-4 py-3 rounded-xl border border-slate-800 focus:outline-none focus:border-purple-500 text-xs"
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                className="w-full bg-[#050507] text-white placeholder-slate-500 pl-10 pr-4 py-3 rounded-xl border border-slate-800 focus:outline-none focus:border-purple-500 text-xs"
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#050507] text-white placeholder-slate-500 pl-10 pr-4 py-3 rounded-xl border border-slate-800 focus:outline-none focus:border-purple-500 text-xs"
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
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
            <UserPlus className="w-4 h-4" />
            {loading ? 'Creating Account...' : 'Create Account'}
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
