import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { auth, signInWithGoogle, logOut } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { LogIn, LogOut, User as UserIcon, Cloud, Check, Loader2 } from 'lucide-react';

interface AuthBarProps {
  onUserChanged?: (user: User | null) => void;
}

export const AuthBar: React.FC<AuthBarProps> = ({ onUserChanged }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (onUserChanged) onUserChanged(currentUser);
    });
    return () => unsubscribe();
  }, [onUserChanged]);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      console.error('Google sign in error:', e);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    setShowMenu(false);
    await logOut();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-slate-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <button
        onClick={handleSignIn}
        disabled={isSigningIn}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all active:scale-[0.98]"
        title="Sign in with Google to sync measurements with Firestore"
      >
        {isSigningIn ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <LogIn className="w-3.5 h-3.5 text-teal-400" />
        )}
        <span>Sign In</span>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-1.5 p-1 pl-1.5 pr-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 transition-colors border border-slate-200/60"
        title="Account & Cloud Sync"
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName || 'User'}
            className="w-5 h-5 rounded-full object-cover"
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center font-bold">
            {(user.displayName || user.email || 'U')[0].toUpperCase()}
          </div>
        )}
        <span className="text-xs font-medium text-slate-800 max-w-[80px] sm:max-w-[110px] truncate">
          {user.displayName?.split(' ')[0] || 'User'}
        </span>
        <Cloud className="w-3 h-3 text-sky-600" />
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-50 text-xs animate-in fade-in">
          <div className="pb-2.5 mb-2.5 border-b border-slate-100">
            <p className="font-bold text-slate-900 truncate">{user.displayName || 'User'}</p>
            <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
            <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-medium">
              <Check className="w-3 h-3" /> Firestore Sync Active
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors font-medium text-xs text-left"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};
