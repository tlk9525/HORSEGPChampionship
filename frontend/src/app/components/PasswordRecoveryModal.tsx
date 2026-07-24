import { useEffect, useState } from 'react';
import {
  Check,
  Clipboard,
  Clock3,
  KeyRound,
  Mail,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';

import {
  PasswordResetStatus,
  completePasswordReset,
  getPasswordResetStatus,
  requestPasswordReset,
} from '../services/api';

interface PasswordRecoveryModalProps {
  initialEmail: string;
  onClose: () => void;
}

const STORAGE_KEY = 'horse-racing-password-recovery-code';

const requirementsFor = (password: string) => [
  { label: '8+ characters', met: password.length >= 8 },
  { label: 'A letter', met: /[A-Za-z]/.test(password) },
  { label: 'A number', met: /\d/.test(password) },
  {
    label: 'A special character',
    met: /[!@#$%^&*()_+\-={}\[\]:;"'<>,.?/\\|`~]/.test(password),
  },
  { label: 'No spaces', met: password.length > 0 && !/\s/.test(password) },
];

export default function PasswordRecoveryModal({
  initialEmail,
  onClose,
}: PasswordRecoveryModalProps) {
  const [email, setEmail] = useState(initialEmail);
  const [recoveryCode, setRecoveryCode] = useState(
    () => localStorage.getItem(STORAGE_KEY) || '',
  );
  const [status, setStatus] = useState<PasswordResetStatus>(
    recoveryCode ? 'pending' : 'unknown',
  );
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isWorking, setIsWorking] = useState(false);
  const requirements = requirementsFor(newPassword);
  const isPasswordValid = requirements.every((item) => item.met);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  const submitRequest = async () => {
    setError('');
    setMessage('');
    if (!email.trim()) {
      setError('Enter the email address for your account.');
      return;
    }
    setIsWorking(true);
    try {
      const result = await requestPasswordReset(email.trim());
      localStorage.setItem(STORAGE_KEY, result.recoveryCode);
      setRecoveryCode(result.recoveryCode);
      setStatus('pending');
      setMessage(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit request');
    } finally {
      setIsWorking(false);
    }
  };

  const checkStatus = async () => {
    if (!recoveryCode) return;
    setError('');
    setMessage('');
    setIsWorking(true);
    try {
      const result = await getPasswordResetStatus(recoveryCode);
      setStatus(result.status);
      if (result.status === 'pending') {
        setMessage('Your request is still waiting for Admin approval.');
      } else if (result.status === 'approved') {
        setMessage('Approved. Choose your new password within 24 hours.');
      } else if (result.status === 'rejected') {
        setError('Admin rejected this password reset request.');
      } else if (result.status === 'expired') {
        setError('This password reset request expired. Submit a new request.');
      } else if (result.status === 'unknown') {
        setError('Recovery code not found. Submit a new request.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to check approval');
    } finally {
      setIsWorking(false);
    }
  };

  const finishReset = async () => {
    setError('');
    setMessage('');
    if (!isPasswordValid) {
      setError('Please meet all password requirements.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Password confirmation does not match.');
      return;
    }
    setIsWorking(true);
    try {
      const result = await completePasswordReset(recoveryCode, newPassword);
      localStorage.removeItem(STORAGE_KEY);
      setStatus('completed');
      setMessage(result.message);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password');
    } finally {
      setIsWorking(false);
    }
  };

  const startOver = () => {
    localStorage.removeItem(STORAGE_KEY);
    setRecoveryCode('');
    setStatus('unknown');
    setMessage('');
    setError('');
  };

  return (
    <div
      className="fixed inset-0 z-[10030] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="password-recovery-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-[#0b223d] p-6 shadow-2xl sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#d4af37]/15 text-[#d4af37]">
              <KeyRound className="h-6 w-6" />
            </div>
            <h2 id="password-recovery-title" className="text-2xl font-black text-white">
              Recover your password
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-gray-400">
              Admin must approve your request before you can choose a new password.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white"
            aria-label="Close password recovery"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!recoveryCode ? (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-300">
                Account email
              </span>
              <span className="relative block">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="h-12 w-full rounded-xl border border-white/10 bg-[#071a2f] pl-12 pr-4 text-white outline-none focus:border-[#d4af37]"
                />
              </span>
            </label>
            <button
              type="button"
              onClick={submitRequest}
              disabled={isWorking}
              className="h-12 w-full rounded-xl bg-[#d4af37] font-bold text-[#071a2f] hover:bg-[#e4c45b] disabled:opacity-50"
            >
              {isWorking ? 'Sending request...' : 'Send request to Admin'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-[#071a2f] p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-white">
                {status === 'approved' ? (
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                ) : (
                  <Clock3 className="h-5 w-5 text-[#d4af37]" />
                )}
                Request status: <span className="capitalize text-[#d4af37]">{status}</span>
              </div>
              <p className="text-xs leading-relaxed text-gray-400">
                This browser saved your private recovery code. Keep it private until the
                reset is complete.
              </p>
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-black/20 px-3 py-2">
                <code className="min-w-0 flex-1 truncate text-xs text-gray-300">
                  {recoveryCode}
                </code>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(recoveryCode)}
                  className="text-gray-400 hover:text-white"
                  aria-label="Copy recovery code"
                >
                  <Clipboard className="h-4 w-4" />
                </button>
              </div>
            </div>

            {status === 'approved' && (
              <>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-gray-300">
                    New password
                  </span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="h-12 w-full rounded-xl border border-white/10 bg-[#071a2f] px-4 text-white outline-none focus:border-[#d4af37]"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-gray-300">
                    Confirm new password
                  </span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="h-12 w-full rounded-xl border border-white/10 bg-[#071a2f] px-4 text-white outline-none focus:border-[#d4af37]"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-[#071a2f]/70 p-3 text-xs">
                  {requirements.map((item) => (
                    <span
                      key={item.label}
                      className={`flex items-center gap-1.5 ${
                        item.met ? 'text-emerald-400' : 'text-gray-500'
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" />
                      {item.label}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={finishReset}
                  disabled={isWorking || !isPasswordValid}
                  className="h-12 w-full rounded-xl bg-emerald-500 font-bold text-[#071a2f] hover:bg-emerald-400 disabled:opacity-50"
                >
                  {isWorking ? 'Resetting password...' : 'Set new password'}
                </button>
              </>
            )}

            {status !== 'approved' && status !== 'completed' && (
              <button
                type="button"
                onClick={checkStatus}
                disabled={isWorking}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#d4af37] font-bold text-[#071a2f] hover:bg-[#e4c45b] disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isWorking ? 'animate-spin' : ''}`} />
                Check Admin decision
              </button>
            )}

            {['rejected', 'expired', 'unknown', 'completed'].includes(status) && (
              <button
                type="button"
                onClick={status === 'completed' ? onClose : startOver}
                className="h-11 w-full rounded-xl border border-white/10 font-semibold text-gray-200 hover:bg-white/5"
              >
                {status === 'completed' ? 'Return to login' : 'Submit a new request'}
              </button>
            )}
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}
        {message && (
          <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
