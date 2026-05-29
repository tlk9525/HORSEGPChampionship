import { useState } from 'react';

import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Trophy,
} from 'lucide-react';
import { UserRole, register } from '../services/api';

interface RegisterPageProps {
  onNavigate: (page: string) => void;
}

export default function RegisterPage({
  onNavigate,
}: RegisterPageProps) {

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('owner');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      if (password !== confirmPassword) {
        throw new Error('Password confirmation does not match');
      }

      const { user } = await register(name, email, password, role);

      alert('Account created. You can login now.');
      onNavigate('login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 pt-24 pb-12">

      <div className="w-full max-w-6xl grid lg:grid-cols-2 overflow-hidden rounded-3xl border border-white/10 bg-[#111111] shadow-2xl shadow-black/40">

        {/* LEFT */}
        <div className="relative hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-[#e10600] to-[#7a0000] overflow-hidden">

          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,white,transparent_40%)]" />

          <div className="relative z-10">

            <div className="flex items-center gap-3 mb-6">

              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                <Trophy className="w-8 h-8 text-white" />
              </div>

              <div>

                <h1 className="text-3xl font-black text-white">
                  HORSE RACING
                </h1>

                <p className="text-white/70 text-sm tracking-widest uppercase">
                  Tournament System
                </p>

              </div>
            </div>

            <h2 className="text-5xl font-black text-white leading-tight mb-6">
              Create Account
            </h2>

            <p className="text-white/80 text-lg leading-relaxed max-w-md">
              Join the racing platform and manage horses,
              tournaments, jockeys and live race analytics.
            </p>

          </div>

          <div className="grid grid-cols-3 gap-4 relative z-10">

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10">
              <div className="text-3xl font-black text-white mb-1">
                250+
              </div>

              <div className="text-white/70 text-sm">
                Racing Horses
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10">
              <div className="text-3xl font-black text-white mb-1">
                180+
              </div>

              <div className="text-white/70 text-sm">
                Professional Jockeys
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10">
              <div className="text-3xl font-black text-white mb-1">
                24
              </div>

              <div className="text-white/70 text-sm">
                Active Tournaments
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT */}
        <div className="p-8 lg:p-14 flex items-center justify-center bg-[#111111]">

          <div className="w-full max-w-md">

            <div className="mb-10">

              <p className="text-[#e10600] uppercase tracking-[0.25em] text-sm font-bold mb-3">
                Register
              </p>

              <h2 className="text-4xl font-black text-white mb-3">
                Create Account
              </h2>

              <p className="text-gray-400 leading-relaxed">
                Create your account as Horse Owner, Jockey, Referee or Spectator to access the correct tournament area.
              </p>

            </div>

            <form className="space-y-6">

              {/* FULL NAME */}
              <div>

                <label className="block text-sm text-gray-300 mb-2 font-medium">
                  Full Name
                </label>

                <div className="relative">

                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />

                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Enter your full name"
                    className="w-full h-14 bg-[#0a0a0a] border border-white/10 rounded-xl pl-12 pr-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#e10600]"
                  />

                </div>
              </div>

              {/* EMAIL */}
              <div>

                <label className="block text-sm text-gray-300 mb-2 font-medium">
                  Email Address
                </label>

                <div className="relative">

                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />

                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Enter your email"
                    className="w-full h-14 bg-[#0a0a0a] border border-white/10 rounded-xl pl-12 pr-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#e10600]"
                  />

                </div>
              </div>

              {/* PASSWORD */}
              <div>

                <label className="block text-sm text-gray-300 mb-2 font-medium">
                  Role
                </label>

                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value as UserRole)}
                  className="w-full h-14 bg-[#0a0a0a] border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-[#e10600]"
                >
                  <option value="owner">Horse Owner</option>
                  <option value="jockey">Jockey</option>
                  <option value="referee">Referee</option>
                  <option value="spectator">Spectator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* PASSWORD */}
              <div>

                <label className="block text-sm text-gray-300 mb-2 font-medium">
                  Password
                </label>

                <div className="relative">

                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />

                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter password"
                    className="w-full h-14 bg-[#0a0a0a] border border-white/10 rounded-xl pl-12 pr-14 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#e10600]"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(!showPassword)
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >

                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}

                  </button>

                </div>
              </div>

              {/* CONFIRM PASSWORD */}
              <div>

                <label className="block text-sm text-gray-300 mb-2 font-medium">
                  Confirm Password
                </label>

                <div className="relative">

                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />

                  <input
                    type={
                      showConfirmPassword
                        ? 'text'
                        : 'password'
                    }
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Confirm password"
                    className="w-full h-14 bg-[#0a0a0a] border border-white/10 rounded-xl pl-12 pr-14 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#e10600]"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        !showConfirmPassword
                      )
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >

                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}

                  </button>

                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300 text-sm">
                  {error}
                </div>
              )}

              {/* BUTTON */}
              <button
                type="button"
                onClick={submit}
                disabled={isSubmitting}
                className="w-full h-14 rounded-xl bg-[#e10600] hover:bg-[#c00500] transition-all text-white font-bold text-lg shadow-lg shadow-[#e10600]/30"
              >
                {isSubmitting ? 'Please wait...' : 'Create Account'}
              </button>

              {/* LOGIN */}
              <div className="text-center pt-2 text-gray-400 text-sm">

                Already have an account?

                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="ml-2 text-[#e10600] font-semibold hover:text-red-400 transition-colors"
                >
                  Login
                </button>

              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
