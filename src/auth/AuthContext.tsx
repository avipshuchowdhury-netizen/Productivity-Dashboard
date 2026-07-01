import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User
} from 'firebase/auth';
import {
  allowedAuthDomain,
  canManageEntriesForEmail,
  firebaseAuth,
  isAllowedAuthEmail,
  isFirebaseConfigured,
  missingFirebaseConfig
} from '../lib/firebase';

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  isConfigured: boolean;
  canManageEntries: boolean;
  allowedDomain: string;
  missingConfig: string[];
  authError: string;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const getAuthErrorMessage = (error: unknown) => {
  const code = typeof error === 'object' && error && 'code' in error
    ? String((error as { code?: string }).code)
    : '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
      return 'Google sign-in could not be verified.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was closed before completion.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait and try again.';
    default:
      return error instanceof Error ? error.message : 'Authentication failed. Please try again.';
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(isFirebaseConfigured);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (!firebaseAuth) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, async currentUser => {
      if (currentUser && !isAllowedAuthEmail(currentUser.email)) {
        setAuthError(`Only verified @${allowedAuthDomain} accounts can access this SAMARTH workspace.`);
        await firebaseSignOut(firebaseAuth);
        setUser(null);
        setIsLoading(false);
        return;
      }

      if (currentUser && !currentUser.emailVerified) {
        setAuthError(`Please verify your @${allowedAuthDomain} email before entering SAMARTH.`);
        await firebaseSignOut(firebaseAuth);
        setUser(null);
        setIsLoading(false);
        return;
      }

      setUser(currentUser);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isLoading,
    isConfigured: isFirebaseConfigured,
    canManageEntries: canManageEntriesForEmail(user?.email),
    allowedDomain: allowedAuthDomain,
    missingConfig: missingFirebaseConfig,
    authError,
    signInWithGoogle: async () => {
      if (!firebaseAuth) return;
      setAuthError('');
      try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ hd: allowedAuthDomain });
        await signInWithPopup(firebaseAuth, provider);
      } catch (error) {
        setAuthError(getAuthErrorMessage(error));
      }
    },
    signOut: async () => {
      if (!firebaseAuth) return;
      await firebaseSignOut(firebaseAuth);
    },
    getIdToken: async () => {
      if (!firebaseAuth?.currentUser) return null;
      return firebaseAuth.currentUser.getIdToken();
    }
  }), [authError, isLoading, user]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return value;
};
