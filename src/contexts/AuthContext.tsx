import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { ref, get, set } from 'firebase/database';
import { auth, googleProvider, database } from '../firebase/config';
import type { AuthContextValue, AuthUser, UserProfile } from '../types';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const { uid, displayName, email, photoURL } = fbUser;
        const authUser: AuthUser = { uid, displayName, email, photoURL };
        setCurrentUser(authUser);
        const profile = await ensureUserProfile(uid, displayName, email, photoURL);
        setUserProfile(profile);
      } else {
        setCurrentUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });
  }, []);

  async function ensureUserProfile(
    uid: string,
    displayName: string | null,
    email: string | null,
    photoURL: string | null,
  ): Promise<UserProfile> {
    const userRef = ref(database, `users/${uid}`);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
      return snapshot.val() as UserProfile;
    }

    const profile: UserProfile = {
      name: displayName ?? 'Ukjent bruker',
      email,
      photoURL: photoURL ?? null,
      roles: ['BRUKER'],
      createdAt: Date.now(),
    };
    await set(userRef, profile);
    return profile;
  }

  async function loginWithGoogle(): Promise<AuthUser> {
    const result = await signInWithPopup(auth, googleProvider);
    const { uid, displayName, email, photoURL } = result.user;
    return { uid, displayName, email, photoURL };
  }

  async function logout(): Promise<void> {
    await signOut(auth);
  }

  const currentUserId = currentUser ? currentUser.uid : '';
  const value: AuthContextValue = { currentUser, currentUserId, userProfile, loading, loginWithGoogle, logout };
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
