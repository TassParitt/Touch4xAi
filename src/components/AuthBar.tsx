import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { auth, logOut } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { LogIn, LogOut, User as UserIcon, Cloud, Check, Loader2 } from 'lucide-react';
import { AuthModal, AppUserProfile } from './AuthModal';

interface AuthBarProps {
  onUserChanged?: (user: User | null) => void;
}

export const AuthBar: React.FC<AuthBarProps> = ({ onUserChanged }) => {
  const [user, setUser] = useState<User | null>(null);
  const [customProfile, setCustomProfile] = useState<AppUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    // Check local profile
    try {
      const saved = localStorage.getItem('touch4xai_user_profile');
      if (saved) {
        setCustomProfile(JSON.parse(saved));
      }
    } catch {
      // ignore
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (onUserChanged) onUserChanged(currentUser);
    });
    return () => unsubscribe();
  }, [onUserChanged]);

  const handleSignOut = async () => {
    setShowMenu(false);
    try {
      await logOut();
    } catch {}
    localStorage.removeItem('touch4xai_user_profile');
    setCustomProfile(null);
  };

  const handleCustomUserLoggedIn = (profile: AppUserProfile) => {
    setCustomProfile(profile);
  };

  if (loading && !customProfile) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-slate-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      </div>
    );
  }

  const activeUserDisplayName = user?.displayName || customProfile?.name;
  const activeUserEmail = user?.email || customProfile?.email;

  return (
    <>
      {!user && !customProfile ? (
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all active:scale-[0.98] cursor-pointer"
          title="Sign in or Sign up and save profile to Cloudflare R2"
        >
          <LogIn className="w-3.5 h-3.5 text-teal-400" />
          <span>Sign In</span>
        </button>
      ) : (
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-1.5 p-1 pl-1.5 pr-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 transition-colors border border-slate-200/60 cursor-pointer"
            title="Account & Cloud Sync"
          >
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={activeUserDisplayName || 'User'}
                className="w-5 h-5 rounded-full object-cover"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center font-bold">
                {(activeUserDisplayName || activeUserEmail || 'U')[0].toUpperCase()}
              </div>
            )}
            <span className="text-xs font-medium text-slate-800 max-w-[80px] sm:max-w-[110px] truncate">
              {activeUserDisplayName?.split(' ')[0] || 'User'}
            </span>
            <Cloud className="w-3 h-3 text-orange-500" />
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-50 text-xs animate-in fade-in">
              <div className="pb-2.5 mb-2.5 border-b border-slate-100">
                <p className="font-bold text-slate-900 truncate">{activeUserDisplayName || 'Registered User'}</p>
                <p className="text-[11px] text-slate-500 truncate">{activeUserEmail}</p>
                <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 text-[10px] font-medium">
                  <Check className="w-3 h-3" /> Cloudflare R2 Synced
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-1.5 p-2 rounded-xl text-rose-600 hover:bg-rose-50 font-medium transition-colors text-left cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Cloudflare R2 Sign In / Sign Up Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onUserLoggedIn={handleCustomUserLoggedIn}
      />
    </>
  );
};
