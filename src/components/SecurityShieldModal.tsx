import { useState } from 'react';
import { Shield, Lock, Unlock, EyeOff, Check, X } from 'lucide-react';

export async function hashPinSha256(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`stonic17-vault:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

interface SecuritySettingsModalProps {
  open: boolean;
  onClose: () => void;
  hasPin: boolean;
  onSetPin: (pinHash: string | null) => void;
  onLockNow: () => void;
  safeGuardEnabled: boolean;
  onToggleSafeGuard: () => void;
  ephemeralMode: boolean;
  onToggleEphemeralMode: () => void;
}

export function SecuritySettingsModal({
  open,
  onClose,
  hasPin,
  onSetPin,
  onLockNow,
  safeGuardEnabled,
  onToggleSafeGuard,
  ephemeralMode,
  onToggleEphemeralMode,
}: SecuritySettingsModalProps) {
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  if (!open) return null;

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    if (!/^\d{4}$/.test(newPin)) {
      setPinError('Enter exactly 4 digits for the security PIN.');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('PIN confirmation does not match.');
      return;
    }
    const hash = await hashPinSha256(newPin);
    onSetPin(hash);
    setNewPin('');
    setConfirmPin('');
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-5 shadow-xl">
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto sm:hidden" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Security & Privacy Shield
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Protect Android commands, door locks, and chat history
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close security settings"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Guardrails */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl px-4">
          <div className="py-3.5 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Sensitive Action Guard
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Require tap confirmation before unlocking doors or clearing chats
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleSafeGuard}
              className={`min-h-[40px] px-3.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                safeGuardEnabled
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {safeGuardEnabled ? 'Protected' : 'Off'}
            </button>
          </div>

          <div className="py-3.5 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <EyeOff className="w-3.5 h-3.5 text-slate-500" /> Ephemeral Privacy Mode
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Do not save conversation history to device storage
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleEphemeralMode}
              className={`min-h-[40px] px-3.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                ephemeralMode
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {ephemeralMode ? 'Active' : 'Off'}
            </button>
          </div>
        </div>

        {/* 4-Digit Vault PIN */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-slate-500" /> App Lock PIN (SHA-256)
            </h3>
            {hasPin && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onLockNow();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-medium"
                >
                  Lock Now
                </button>
                <button
                  type="button"
                  onClick={() => onSetPin(null)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                >
                  Remove PIN
                </button>
              </div>
            )}
          </div>

          <form onSubmit={handleSavePin} className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="4-digit PIN"
                className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm font-mono tracking-widest text-center text-slate-900 dark:text-slate-100"
              />
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Confirm PIN"
                className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm font-mono tracking-widest text-center text-slate-900 dark:text-slate-100"
              />
            </div>

            {pinError && (
              <p className="text-xs text-red-600 dark:text-red-400">{pinError}</p>
            )}
            {savedNotice && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Security PIN saved with SHA-256 hash.
              </p>
            )}

            <button
              type="submit"
              className="w-full min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
            >
              {hasPin ? 'Update Security PIN' : 'Enable 4-Digit PIN Lock'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

interface LockScreenProps {
  pinHash: string;
  onUnlock: () => void;
}

export function LockScreen({ pinHash, onUnlock }: LockScreenProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleDigit = async (digit: string) => {
    if (pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    setError(false);

    if (next.length === 4) {
      const candidateHash = await hashPinSha256(next);
      if (candidateHash === pinHash) {
        onUnlock();
      } else {
        setError(true);
        window.setTimeout(() => setPin(''), 450);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xs flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center mb-4">
          <Lock className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-semibold">Stonic 17 Locked</h1>
        <p className="text-xs text-slate-400 mt-1">
          Enter your 4-digit security PIN to unlock voice commands
        </p>

        {/* PIN Indicators */}
        <div className="flex items-center gap-4 my-6">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full border transition-colors ${
                error
                  ? 'bg-red-500 border-red-500'
                  : idx < pin.length
                    ? 'bg-blue-500 border-blue-500'
                    : 'border-slate-600'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-xs text-red-400 mb-3">Incorrect PIN. Try again.</p>
        )}

        {/* Android-style Touch Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => void handleDigit(d)}
              className="h-14 rounded-2xl bg-slate-900 border border-slate-800 text-lg font-mono font-semibold hover:bg-slate-800 active:scale-95 transition"
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setPin('');
              setError(false);
            }}
            className="h-14 rounded-2xl bg-slate-900/50 text-xs font-medium text-slate-400 hover:text-white"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => void handleDigit('0')}
            className="h-14 rounded-2xl bg-slate-900 border border-slate-800 text-lg font-mono font-semibold hover:bg-slate-800 active:scale-95 transition"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => setPin((p) => p.slice(0, -1))}
            className="h-14 rounded-2xl bg-slate-900/50 text-xs font-medium text-slate-400 hover:text-white inline-flex items-center justify-center"
            aria-label="Backspace"
          >
            <Unlock className="w-4 h-4 opacity-0 w-0" />
            Del
          </button>
        </div>
      </div>
    </div>
  );
}
