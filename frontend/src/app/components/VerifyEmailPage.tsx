import { FormEvent, useEffect, useRef, useState } from 'react';
import { CheckCircle2, LoaderCircle, Mail, RefreshCw, XCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

import { resendVerificationEmail, verifyEmail } from '../services/api';

type VerificationState = 'checking' | 'success' | 'error';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token')?.trim() || '';
  const verificationStarted = useRef(false);
  const [state, setState] = useState<VerificationState>(token ? 'checking' : 'error');
  const [message, setMessage] = useState(
    token ? 'Checking your verification link...' : 'This verification link is missing its token.'
  );
  const [email, setEmail] = useState('');
  const [resendMessage, setResendMessage] = useState('');
  const [resendError, setResendError] = useState('');
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (!token || verificationStarted.current) return;
    verificationStarted.current = true;

    verifyEmail(token)
      .then((result) => {
        setState('success');
        setMessage(result.message || 'Your email has been verified.');
      })
      .catch((error) => {
        setState('error');
        setMessage(
          error instanceof Error
            ? error.message
            : 'This verification link is invalid or has expired.'
        );
      });
  }, [token]);

  const resend = async (event: FormEvent) => {
    event.preventDefault();
    setResendMessage('');
    setResendError('');

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setResendError('Enter the email address you registered with.');
      return;
    }

    setIsResending(true);
    try {
      const result = await resendVerificationEmail(normalizedEmail);
      setResendMessage(
        result.message ||
          'If that account exists and still needs verification, a new email has been sent.'
      );
    } catch (error) {
      setResendError(error instanceof Error ? error.message : 'Unable to resend the email.');
    } finally {
      setIsResending(false);
    }
  };

  const StatusIcon =
    state === 'checking' ? LoaderCircle : state === 'success' ? CheckCircle2 : XCircle;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#071a2f] px-4 py-16 text-white">
      <div className="mx-auto max-w-lg rounded-3xl border border-white/10 bg-[#0b223d] p-8 shadow-2xl sm:p-10">
        <div
          className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full ${
            state === 'success'
              ? 'bg-emerald-500/15 text-emerald-300'
              : state === 'error'
                ? 'bg-red-500/15 text-red-300'
                : 'bg-[#d4af37]/15 text-[#f6d77a]'
          }`}
        >
          <StatusIcon className={`h-8 w-8 ${state === 'checking' ? 'animate-spin' : ''}`} />
        </div>

        <div className="text-center">
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.22em] text-[#d4af37]">
            Email verification
          </p>
          <h1 className="mb-3 text-3xl font-black">
            {state === 'checking'
              ? 'Verifying your email'
              : state === 'success'
                ? 'Email verified'
                : 'Verification unsuccessful'}
          </h1>
          <p className="text-gray-300">{message}</p>
        </div>

        {state === 'error' && (
          <form onSubmit={resend} className="mt-8 space-y-4 border-t border-white/10 pt-8">
            <div>
              <label htmlFor="resend-email" className="mb-2 block text-sm font-medium text-gray-300">
                Send a new verification link
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                <input
                  id="resend-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter your email"
                  className="h-14 w-full rounded-xl border border-white/10 bg-[#071a2f] pl-12 pr-4 text-white placeholder:text-gray-500 focus:border-[#d4af37] focus:outline-none"
                />
              </div>
            </div>

            {resendError && <p className="text-sm text-red-300">{resendError}</p>}
            {resendMessage && <p className="text-sm text-emerald-300">{resendMessage}</p>}

            <button
              type="submit"
              disabled={isResending}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#d4af37] font-bold text-white transition-colors hover:bg-[#b8892d] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${isResending ? 'animate-spin' : ''}`} />
              {isResending ? 'Sending...' : 'Resend verification email'}
            </button>
          </form>
        )}

        <Link
          to="/login"
          className="mt-8 block text-center font-semibold text-[#d4af37] transition-colors hover:text-[#f6d77a]"
        >
          Continue to login
        </Link>
      </div>
    </div>
  );
}
