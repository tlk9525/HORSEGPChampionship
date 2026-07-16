import { useEffect, useState } from 'react';

import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Trophy,
  User,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  AuthUser,
  UserRole,
  login,
  register,
} from '../services/api';

interface LoginPageProps {
  initialMode?: 'login' | 'register';
  onLogin: (user: AuthUser) => void;
}

export default function LoginPage({
  initialMode = 'login',
  onLogin,
}: LoginPageProps) {

  const [showPassword, setShowPassword] =
    useState(false);

  const [isRegister, setIsRegister] =
    useState(initialMode === 'register');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('spectator');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVerificationHelp, setShowVerificationHelp] = useState(false);

  useEffect(() => {
    setIsRegister(initialMode === 'register');
  }, [initialMode]);

  const submit = async () => {
    setError('');
    setNotice('');
    setShowVerificationHelp(false);
    setIsSubmitting(true);

    try {
      if (isRegister) {
        if (password !== confirmPassword) {
          throw new Error('Password confirmation does not match');
        }

        const result = await register(name, email, password, role);

        if (
          result.requiresEmailVerification ||
          (role === 'spectator' && !result.user.emailVerifiedAt)
        ) {
          setNotice(
            'Account created. Check your email and verify your address before placing a bet.'
          );
          setShowVerificationHelp(true);
          setIsRegister(false);
          setPassword('');
          setConfirmPassword('');
          return;
        }

        if (result.requiresApproval || result.user.status !== 'active') {
          setNotice(
            result.message ||
              'Account request submitted. Please wait for Admin approval before logging in.'
          );
          setIsRegister(false);
          return;
        }

        const loginResult = await login(email, password);
        onLogin(loginResult.user);
      } else {
        const result = await login(email, password);
        onLogin(result.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#071a2f] flex items-center justify-center px-4 pt-24 pb-12">

      <div className="w-full max-w-6xl grid lg:grid-cols-2 overflow-hidden rounded-3xl border border-white/10 bg-[#0b223d] shadow-2xl shadow-[#071a2f]/40">

        {/* LEFT SIDE */}
        <div className="relative hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-[#d4af37] to-[#7a0000] overflow-hidden">

          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,white,transparent_40%)]" />

          <div className="relative z-10">

            <div className="flex items-center gap-3 mb-6">

              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                <Trophy className="w-8 h-8 text-white" />
              </div>

              <div>

                <h1 className="text-3xl font-black text-white leading-tight">
                  HORSE RACING
                </h1>

                <p className="text-white/70 text-sm tracking-widest uppercase">
                  Tournament System
                </p>

              </div>
            </div>

            <h2 className="text-5xl font-black text-white leading-tight mb-6">

              {isRegister
                ? 'Create Account'
                : 'Welcome Back'}

            </h2>

            <p className="text-white/80 text-lg leading-relaxed max-w-md">

              {isRegister
                ? 'Join the most advanced horse racing platform and manage races, horses and tournaments.'
                : 'Access tournaments, manage horses, monitor performance and track live races.'}

            </p>

          </div>

          <div className="relative z-10 rounded-2xl border border-white/10 bg-white/10 p-5 text-white/80 backdrop-blur-md">
            Role-based access for Admin, Owner, Jockey, Referee and Spectator workflows.
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="p-8 lg:p-14 flex items-center justify-center bg-[#0b223d]">

          <div className="w-full max-w-md">

            <div className="mb-10">

              <p className="text-[#d4af37] uppercase tracking-[0.25em] text-sm font-bold mb-3">

                {isRegister
                  ? 'Create Account'
                  : 'Sign In'}

              </p>

              <h2 className="text-4xl font-black text-white mb-3">

                {isRegister
                  ? 'Register Account'
                  : 'Login Account'}

              </h2>

              <p className="text-gray-400 leading-relaxed">

                {isRegister
                  ? 'Create your account to continue.'
                  : 'Enter your email and password to continue.'}

              </p>

            </div>

            <form className="space-y-6">

              {/* FULL NAME */}
              {isRegister && (
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
                      className="w-full h-14 bg-[#071a2f] border border-white/10 rounded-xl pl-12 pr-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#d4af37] transition-all"
                    />

                  </div>
                </div>
              )}

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
                    className="w-full h-14 bg-[#071a2f] border border-white/10 rounded-xl pl-12 pr-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#d4af37] transition-all"
                  />

                </div>
              </div>

              {/* PASSWORD */}
              {isRegister && (
                <div>
                  <label className="block text-sm text-gray-300 mb-2 font-medium">
                    Role
                  </label>

                  <select
                    value={role}
                    onChange={(event) => setRole(event.target.value as UserRole)}
                    className="w-full h-14 bg-[#071a2f] border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-[#d4af37] transition-all"
                  >
                    <option value="owner">Horse Owner</option>
                    <option value="jockey">Jockey</option>
                    <option value="referee">Referee</option>
                    <option value="spectator">Spectator</option>
                  </select>
                </div>
              )}

              {/* PASSWORD */}
              <div>

                <label className="block text-sm text-gray-300 mb-2 font-medium">
                  Password
                </label>

                <div className="relative">

                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />

                  <input
                    type={
                      showPassword
                        ? 'text'
                        : 'password'
                    }
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="w-full h-14 bg-[#071a2f] border border-white/10 rounded-xl pl-12 pr-14 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#d4af37] transition-all"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        !showPassword
                      )
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
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
              {isRegister && (
                <div>

                  <label className="block text-sm text-gray-300 mb-2 font-medium">
                    Confirm Password
                  </label>

                  <div className="relative">

                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />

                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Confirm password"
                      className="w-full h-14 bg-[#071a2f] border border-white/10 rounded-xl pl-12 pr-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#d4af37] transition-all"
                    />

                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300 text-sm">
                  {error}
                </div>
              )}

              {notice && (
                <div className="rounded-xl border border-[#d4af37]/40 bg-[#d4af37]/10 px-4 py-3 text-[#f6d77a] text-sm">
                  {notice}
                  {showVerificationHelp && (
                    <Link
                      to="/verify-email"
                      className="mt-2 block font-semibold underline underline-offset-4 hover:text-white"
                    >
                      Didn&apos;t receive it? Resend the verification email
                    </Link>
                  )}
                </div>
              )}

              {/* OPTIONS */}
              {!isRegister && (
                <div className="flex items-center justify-between text-sm">

                  <label className="flex items-center gap-2 text-gray-400 cursor-pointer">

                    <input
                      type="checkbox"
                      className="accent-[#d4af37]"
                    />

                    Remember me

                  </label>

                  <button
                    type="button"
                    className="text-[#d4af37] hover:text-red-400 transition-colors"
                  >
                    Forgot Password?
                  </button>

                </div>
              )}

              {/* BUTTON */}
              <button
                type="button"
                onClick={submit}
                disabled={isSubmitting}
                className="w-full h-14 rounded-xl bg-[#d4af37] hover:bg-[#b8892d] transition-all text-white font-bold text-lg shadow-lg shadow-[#d4af37]/30"
              >

                {isSubmitting
                  ? 'Please wait...'
                  : isRegister
                  ? 'Create Account'
                  : 'Login'}

              </button>

              {/* SWITCH MODE */}
              <div className="text-center pt-4 text-gray-400 text-sm">

                {isRegister
                  ? 'Already have an account?'
                  : 'Don’t have an account?'}

                <button
                  type="button"
                  onClick={() =>
                    setIsRegister(
                      !isRegister
                    )
                  }
                  className="ml-2 text-[#d4af37] font-semibold hover:text-red-400 transition-colors"
                >

                  {isRegister
                    ? 'Login'
                    : 'Create Account'}

                </button>

              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
