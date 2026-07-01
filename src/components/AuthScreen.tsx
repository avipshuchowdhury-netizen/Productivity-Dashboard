import React, { useState } from 'react';
import { AlertTriangle, LockKeyhole, LogIn, Mail, Moon, ShieldCheck, Sun, UserPlus } from 'lucide-react';

type AuthScreenProps = {
  displayMode: 'light' | 'dark';
  onToggleDisplayMode: () => void;
  isConfigured: boolean;
  canCreateAccount: boolean;
  allowedDomain: string;
  missingConfig: string[];
  authError: string;
  onClearError: () => void;
  onSignInWithEmail: (email: string, password: string) => Promise<void>;
  onCreateAccountWithEmail: (email: string, password: string) => Promise<void>;
  onSignInWithGoogle: () => Promise<void>;
};

export default function AuthScreen({
  displayMode,
  onToggleDisplayMode,
  isConfigured,
  canCreateAccount,
  allowedDomain,
  missingConfig,
  authError,
  onClearError,
  onSignInWithEmail,
  onCreateAccountWithEmail,
  onSignInWithGoogle
}: AuthScreenProps) {
  const [authMode, setAuthMode] = useState<'sign-in' | 'create'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      if (authMode === 'create' && canCreateAccount) {
        await onCreateAccountWithEmail(email, password);
      } else {
        await onSignInWithEmail(email, password);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="auth-gateway" className="min-h-[100dvh] w-full px-4 py-6 md:px-8 flex items-center justify-center">
      <div className="auth-shell w-full max-w-[1040px] overflow-hidden rounded-xl border border-[var(--palette-line)] bg-[var(--surface-card)] shadow-xs">
        <div className="grid min-h-[640px] grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="auth-hero relative overflow-hidden p-7 md:p-10 flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--palette-line)] bg-[var(--surface-glass)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--palette-accent)]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Firebase Domain Protected
              </div>
              <h1 className="mt-6 font-display text-4xl md:text-5xl font-semibold leading-none text-[var(--text-main)]">
                SAMARTH
              </h1>
              <p className="mt-3 max-w-xl text-sm md:text-base font-semibold leading-relaxed text-[var(--text-muted)]">
                Single Admin Managed AI Run Thematic Handles.
              </p>
            </div>

            <div className="auth-signal-grid mt-10 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span>Auth Layer</span>
                <strong>Firebase</strong>
              </div>
              <div>
                <span>Access Mode</span>
                <strong>@{allowedDomain}</strong>
              </div>
              <div>
                <span>Edit Authority</span>
                <strong>Avipshu only</strong>
              </div>
              <div>
                <span>Theme</span>
                <strong>Coral HUD</strong>
              </div>
            </div>
          </section>

          <section className="p-6 md:p-8 flex flex-col justify-center">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-bold text-[var(--text-main)]">
                  {isConfigured ? 'Workspace Sign In' : 'Firebase Setup Required'}
                </h2>
                <p className="mt-1 text-xs font-semibold text-[var(--text-muted)]">
                  {isConfigured ? `Use a verified @${allowedDomain} account to enter SAMARTH.` : 'Add Firebase environment variables before authentication can run.'}
                </p>
              </div>
              <button
                type="button"
                onClick={onToggleDisplayMode}
                className="samarth-mode-toggle flex items-center gap-2 rounded-xl border border-[var(--palette-line)] bg-[var(--surface-glass)] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] shadow-xs"
              >
                {displayMode === 'dark' ? <Sun className="h-4 w-4 text-[var(--palette-accent)]" /> : <Moon className="h-4 w-4 text-[var(--palette-accent)]" />}
                {displayMode === 'dark' ? 'Light' : 'Dark'}
              </button>
            </div>

            {!isConfigured ? (
              <div className="rounded-lg border border-[var(--palette-line)] bg-[var(--surface-panel)] p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--palette-accent)]" />
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-main)]">Missing Firebase config</h3>
                    <p className="mt-1 text-xs font-semibold text-[var(--text-muted)]">
                      Add these values to your local `.env` and Vercel project environment.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {missingConfig.map(key => (
                        <span key={key} className="rounded-md border border-[var(--palette-line)] bg-[var(--surface-glass)] px-2 py-1 font-mono text-[10px] font-bold text-[var(--palette-accent)]">
                          {key}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {canCreateAccount && (
                  <div className="mb-4 grid grid-cols-2 rounded-lg border border-[var(--palette-line)] bg-[var(--surface-panel)] p-1">
                    {([
                      { id: 'sign-in', label: 'Sign In', icon: LogIn },
                      { id: 'create', label: 'Create', icon: UserPlus }
                    ] as const).map(option => {
                      const Icon = option.icon;
                      const selected = authMode === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            setAuthMode(option.id);
                            onClearError();
                          }}
                          className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-bold transition ${
                            selected ? 'samarth-theme-button text-white' : 'text-[var(--text-muted)] hover:bg-[var(--palette-soft)]'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                <form onSubmit={submitAuth} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--palette-accent)]" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={event => setEmail(event.target.value)}
                        className="w-full rounded-lg border border-[var(--palette-line)] bg-[var(--surface-panel)] px-9 py-2.5 text-sm font-semibold text-[var(--text-main)] outline-hidden focus:border-[var(--palette-accent)]"
                        placeholder={`name@${allowedDomain}`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
                      Password
                    </label>
                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--palette-accent)]" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={event => setPassword(event.target.value)}
                        className="w-full rounded-lg border border-[var(--palette-line)] bg-[var(--surface-panel)] px-9 py-2.5 text-sm font-semibold text-[var(--text-main)] outline-hidden focus:border-[var(--palette-accent)]"
                        placeholder="Minimum 6 characters"
                      />
                    </div>
                  </div>

                  {authError && (
                    <div className="rounded-lg border border-[var(--palette-line)] bg-[var(--palette-soft)] px-3 py-2 text-xs font-bold text-[var(--palette-ink)]">
                      {authError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="samarth-theme-button flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {authMode === 'sign-in' ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                    {isSubmitting ? 'Authenticating...' : authMode === 'sign-in' ? 'Enter Workspace' : 'Create Firebase Account'}
                  </button>
                </form>

                <button
                  type="button"
                  onClick={onSignInWithGoogle}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--palette-line)] bg-[var(--surface-glass)] px-5 py-3 text-sm font-bold text-[var(--text-main)] transition hover:border-[var(--palette-accent)]"
                >
                  Continue with Varahe Google
                </button>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
