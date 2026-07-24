import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  Pencil,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';

import { AuthUser, changePassword, updateAccountName } from '../services/api';

interface AccountMenuProps {
  currentUser: AuthUser;
  onLogout: () => void;
  onUserUpdate: (user: AuthUser) => void;
  mobile?: boolean;
}

const passwordChecks = (password: string) => [
  { label: '8+ characters', met: password.length >= 8 },
  { label: 'A letter', met: /[A-Za-z]/.test(password) },
  { label: 'A number', met: /\d/.test(password) },
  {
    label: 'A special character',
    met: /[!@#$%^&*()_+\-={}\[\]:;"'<>,.?/\\|`~]/.test(password),
  },
  { label: 'No spaces', met: password.length > 0 && !/\s/.test(password) },
];

export default function AccountMenu({
  currentUser,
  onLogout,
  onUserUpdate,
  mobile = false,
}: AccountMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAccountInfo, setShowAccountInfo] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [displayName, setDisplayName] = useState(currentUser.name);
  const [nameMessage, setNameMessage] = useState('');
  const [nameError, setNameError] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const initials = currentUser.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  const checks = passwordChecks(newPassword);
  const isNewPasswordValid = checks.every((check) => check.met);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setShowNameModal(false);
        setShowPasswordModal(false);
      }
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const openNameModal = () => {
    setIsOpen(false);
    setShowNameModal(true);
    setDisplayName(currentUser.name);
    setNameMessage('');
    setNameError('');
  };

  const submitNameChange = async () => {
    const normalizedName = displayName.trim().replace(/\s+/g, ' ');
    setNameMessage('');
    setNameError('');
    if (normalizedName.length < 2) {
      setNameError('Name must contain at least 2 characters.');
      return;
    }
    if (normalizedName.length > 100) {
      setNameError('Name must not exceed 100 characters.');
      return;
    }

    setIsSavingName(true);
    try {
      const result = await updateAccountName(normalizedName);
      onUserUpdate(result.user);
      setDisplayName(result.user.name);
      setNameMessage(result.message);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Unable to update name');
    } finally {
      setIsSavingName(false);
    }
  };

  const openPasswordModal = () => {
    setIsOpen(false);
    setShowPasswordModal(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setMessage('');
    setError('');
  };

  const submitPasswordChange = async () => {
    setMessage('');
    setError('');
    if (!isNewPasswordValid) {
      setError('Please meet all password requirements.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password confirmation does not match.');
      return;
    }

    setIsSaving(true);
    try {
      const result = await changePassword(currentPassword, newPassword);
      setMessage(result.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to change password');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className={`relative ${mobile ? 'w-full' : ''}`} ref={menuRef}>
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className={`flex items-center rounded-xl border border-white/10 bg-white/5 text-white transition-all hover:border-[#d4af37]/40 hover:bg-white/10 ${
            mobile ? 'w-full gap-3 px-3 py-3 text-left' : 'gap-3 px-2 py-1.5'
          }`}
          aria-expanded={isOpen}
          aria-haspopup="menu"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#d4af37] to-[#8b5a24] text-sm font-black text-[#071a2f]">
            {initials || <UserRound className="h-5 w-5" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold">{currentUser.name}</span>
            <span className="block text-[11px] uppercase tracking-wider text-[#d8d2c4]">
              {currentUser.role}
            </span>
          </span>
          <ChevronDown
            className={`h-4 w-4 text-gray-400 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isOpen && (
          <div
            className={`z-[10020] mt-3 overflow-hidden rounded-2xl border border-white/10 bg-[#0b223d] shadow-2xl shadow-black/50 ${
              mobile ? 'w-full' : 'absolute right-0 w-[340px]'
            }`}
            role="menu"
          >
            <div className="border-b border-white/10 p-5 text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#d4af37] to-[#8b5a24] text-xl font-black text-[#071a2f]">
                {initials}
              </div>
              <p className="truncate text-sm text-gray-400">{currentUser.email}</p>
              <h2 className="mt-1 text-xl font-black text-white">
                Hi, {currentUser.name.split(/\s+/)[0]}!
              </h2>
            </div>

            <div className="space-y-2 p-3">
              <button
                type="button"
                onClick={() => setShowAccountInfo((show) => !show)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-gray-200 transition-colors hover:bg-white/5"
                role="menuitem"
              >
                <UserRound className="h-5 w-5 text-[#d4af37]" />
                <span className="font-semibold">View account information</span>
              </button>

              {showAccountInfo && (
                <dl className="mx-2 space-y-2 rounded-xl border border-white/10 bg-[#071a2f] p-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Name</dt>
                    <dd className="text-right font-semibold text-white">{currentUser.name}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Email</dt>
                    <dd className="break-all text-right font-semibold text-white">
                      {currentUser.email}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Role</dt>
                    <dd className="font-semibold capitalize text-white">{currentUser.role}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Status</dt>
                    <dd className="font-semibold capitalize text-emerald-400">
                      {currentUser.status}
                    </dd>
                  </div>
                </dl>
              )}

              <button
                type="button"
                onClick={openNameModal}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-gray-200 transition-colors hover:bg-white/5"
                role="menuitem"
              >
                <Pencil className="h-5 w-5 text-[#d4af37]" />
                <span className="font-semibold">Change name</span>
              </button>

              <button
                type="button"
                onClick={openPasswordModal}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-gray-200 transition-colors hover:bg-white/5"
                role="menuitem"
              >
                <KeyRound className="h-5 w-5 text-[#d4af37]" />
                <span className="font-semibold">Change password</span>
              </button>

              <button
                type="button"
                onClick={onLogout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-red-300 transition-colors hover:bg-red-500/10"
                role="menuitem"
              >
                <LogOut className="h-5 w-5" />
                <span className="font-semibold">Sign out</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {showNameModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[10030] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-name-title"
          >
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0b223d] p-6 shadow-2xl sm:p-8">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#d4af37]/15 text-[#d4af37]">
                    <Pencil className="h-5 w-5" />
                  </div>
                  <h2 id="change-name-title" className="text-2xl font-black text-white">
                    Change your name
                  </h2>
                  <p className="mt-1 text-sm text-gray-400">
                    This name appears in your profile and throughout the system.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNameModal(false)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white"
                  aria-label="Close change name dialog"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-300">
                  Display name
                </span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  maxLength={100}
                  autoFocus
                  className="h-12 w-full rounded-xl border border-white/10 bg-[#071a2f] px-4 text-white outline-none transition-colors focus:border-[#d4af37]"
                />
                <span className="mt-2 block text-right text-xs text-gray-500">
                  {displayName.trim().length}/100
                </span>
              </label>

              {nameError && (
                <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {nameError}
                </p>
              )}
              {nameMessage && (
                <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                  {nameMessage}
                </p>
              )}

              <button
                type="button"
                onClick={submitNameChange}
                disabled={
                  isSavingName ||
                  displayName.trim().length < 2 ||
                  displayName.trim() === currentUser.name
                }
                className="mt-5 h-12 w-full rounded-xl bg-[#d4af37] font-bold text-[#071a2f] transition-colors hover:bg-[#e4c45b] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSavingName ? 'Saving name...' : 'Save name'}
              </button>
            </div>
          </div>,
          document.body,
        )}

      {showPasswordModal &&
        createPortal(
          (
        <div
          className="fixed inset-0 z-[10030] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="change-password-title"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-[#0b223d] p-6 shadow-2xl sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#d4af37]/15 text-[#d4af37]">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h2 id="change-password-title" className="text-2xl font-black text-white">
                  Change password
                </h2>
                <p className="mt-1 text-sm text-gray-400">
                  Confirm your current password, then choose a new one.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white"
                aria-label="Close change password dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {[
                {
                  label: 'Current password',
                  value: currentPassword,
                  setValue: setCurrentPassword,
                },
                { label: 'New password', value: newPassword, setValue: setNewPassword },
                {
                  label: 'Confirm new password',
                  value: confirmPassword,
                  setValue: setConfirmPassword,
                },
              ].map((field) => (
                <label key={field.label} className="block">
                  <span className="mb-2 block text-sm font-semibold text-gray-300">
                    {field.label}
                  </span>
                  <span className="relative block">
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      value={field.value}
                      onChange={(event) => field.setValue(event.target.value)}
                      className="h-12 w-full rounded-xl border border-white/10 bg-[#071a2f] px-4 pr-12 text-white outline-none transition-colors focus:border-[#d4af37]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords((show) => !show)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                      aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'}
                    >
                      {showPasswords ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </span>
                </label>
              ))}

              <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-[#071a2f]/70 p-3 text-xs">
                {checks.map((check) => (
                  <span
                    key={check.label}
                    className={`flex items-center gap-1.5 ${
                      check.met ? 'text-emerald-400' : 'text-gray-500'
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" />
                    {check.label}
                  </span>
                ))}
              </div>

              {error && (
                <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </p>
              )}
              {message && (
                <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                  {message}
                </p>
              )}

              <button
                type="button"
                onClick={submitPasswordChange}
                disabled={isSaving || !currentPassword || !isNewPasswordValid}
                className="h-12 w-full rounded-xl bg-[#d4af37] font-bold text-[#071a2f] transition-colors hover:bg-[#e4c45b] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? 'Updating password...' : 'Update password'}
              </button>
            </div>
          </div>
        </div>
          ),
          document.body,
        )}
    </>
  );
}
