import React, { useState, useEffect } from 'react';
import { X, UserPlus, LogIn, Cloud, Check, Loader2, ShieldCheck, Mail, User, Building, Lock } from 'lucide-react';
import { uploadDatasetToCloudflareR2 } from '../lib/r2Storage';
import { signInWithGoogle } from '../lib/firebase';

export interface AppUserProfile {
  userId: string;
  name: string;
  email: string;
  organization?: string;
  role?: string;
  registeredAt: string;
  storage: string;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserLoggedIn: (profile: AppUserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onUserLoggedIn,
}) => {
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [role, setRole] = useState('Researcher / Engineer');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || (authMode === 'signup' && !name.trim())) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const userProfile: AppUserProfile = {
      userId: `usr_${Date.now()}`,
      name: name.trim() || email.split('@')[0],
      email: email.trim(),
      organization: organization.trim() || 'Touch4xAi Lab',
      role,
      registeredAt: new Date().toISOString(),
      storage: 'Cloudflare R2 (touch4xai / user_profiles)',
    };

    try {
      // REQUIREMENT: Save basic user profile info into Cloudflare R2
      const filename = `user_profiles/${email.replace(/[^a-zA-Z0-9_-]/g, '_')}_profile.json`;
      await uploadDatasetToCloudflareR2(
        {
          app: 'Touch4xAi (Smart Touch for Training AI)',
          type: 'user_registration',
          userProfile,
          timestamp: new Date().toISOString(),
        },
        filename
      );

      // Save locally
      localStorage.setItem('touch4xai_user_profile', JSON.stringify(userProfile));
      setSuccessMsg('Account registered & saved to Cloudflare R2!');

      setTimeout(() => {
        onUserLoggedIn(userProfile);
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Error saving user profile to Cloudflare R2:', err);
      // Still allow local login even if edge upload had network error
      localStorage.setItem('touch4xai_user_profile', JSON.stringify(userProfile));
      onUserLoggedIn(userProfile);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const u = await signInWithGoogle();
      if (u) {
        const profile: AppUserProfile = {
          userId: u.uid,
          name: u.displayName || 'Google User',
          email: u.email || 'user@example.com',
          organization: 'Google Account',
          role: 'Registered User',
          registeredAt: new Date().toISOString(),
          storage: 'Cloudflare R2 (touch4xai / user_profiles)',
        };

        // Save Google user to Cloudflare R2 as well
        const filename = `user_profiles/google_${(u.email || u.uid).replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
        await uploadDatasetToCloudflareR2(
          {
            app: 'Touch4xAi',
            type: 'google_user_sync',
            userProfile: profile,
            timestamp: new Date().toISOString(),
          },
          filename
        );

        localStorage.setItem('touch4xai_user_profile', JSON.stringify(profile));
        onUserLoggedIn(profile);
        onClose();
      }
    } catch (e: any) {
      console.warn('Google sign-in fallback:', e);
      setErrorMsg('Google sign in cancelled or blocked by browser.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="User sign in and registration window"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col text-left"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5 pr-2">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0">
              <Cloud className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                {authMode === 'signup' ? 'Sign Up with Touch4xAi' : 'Sign In to Touch4xAi'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Syncs and stores user profile in Cloudflare R2
              </p>
            </div>
          </div>

          {/* Top-Right Clear Close / Exit Icon Button */}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200/90 hover:border-rose-200 transition-all cursor-pointer active:scale-95 shadow-2xs group shrink-0 focus:outline-hidden focus:ring-2 focus:ring-rose-400"
            title="Close / Exit window (Esc)"
            aria-label="Close and exit sign-in window"
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 group-hover:text-rose-600 transition-colors">
              Exit
            </span>
            <div className="w-5 h-5 rounded-lg bg-white group-hover:bg-rose-100 flex items-center justify-center text-slate-500 group-hover:text-rose-600 shadow-2xs transition-colors">
              <X className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-5 pt-3 pb-1 flex items-center gap-2 border-b border-slate-100">
          <button
            type="button"
            onClick={() => setAuthMode('signup')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'signup'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Sign Up</span>
          </button>

          <button
            type="button"
            onClick={() => setAuthMode('signin')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'signin'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs font-medium flex items-center gap-2">
              <Check className="w-4 h-4 text-teal-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {authMode === 'signup' && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Full Name:</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Alex Mercer"
                  className="w-full pl-9 pr-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Email Address:</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                className="w-full pl-9 pr-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              />
            </div>
          </div>

          {authMode === 'signup' && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Organization / Lab (Optional):</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="e.g. Materials Science Department"
                    className="w-full pl-9 pr-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">User Role:</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                >
                  <option value="Researcher / Scientist">Researcher / Scientist</option>
                  <option value="AI / ML Engineer">AI / ML Engineer</option>
                  <option value="Quality Inspection">Quality Inspection</option>
                  <option value="Student / Hobbyist">Student / Hobbyist</option>
                  <option value="General Consumer">General Consumer</option>
                </select>
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Password / Access Code:</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              />
            </div>
          </div>

          {/* Cloudflare R2 Sync Note */}
          <div className="p-3 rounded-2xl bg-orange-50 border border-orange-200/80 text-[11px] text-orange-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-orange-600 shrink-0" />
              <span>User profile saved to <strong>Cloudflare R2</strong> bucket <code>touch4xai</code></span>
            </div>
            <span className="text-[10px] font-mono font-bold bg-orange-200 text-orange-950 px-2 py-0.5 rounded">
              Active
            </span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md shadow-teal-600/20 active:scale-[0.99] transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving to Cloudflare R2...</span>
              </>
            ) : (
              <span>{authMode === 'signup' ? 'Sign Up & Save to Cloudflare R2' : 'Sign In'}</span>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-2 py-1">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[10px] font-mono text-slate-400 uppercase">Or continue with</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Google Sign In option */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
            className="w-full h-11 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Sign in with Google</span>
          </button>

          {/* Explicit Shut Window button */}
          <div className="pt-1 flex items-center justify-center">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors py-1 px-3 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Shut window</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
