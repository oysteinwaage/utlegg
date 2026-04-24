import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { ref, get, set } from 'firebase/database';
import { auth, googleProvider, database } from '../firebase/config';
import type { AuthContextValue, UserProfile } from '../types';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const profile = await ensureUserProfile(user);
        setUserProfile(profile);
      } else {
        setCurrentUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });
  }, []);

  async function ensureUserProfile(user: User): Promise<UserProfile> {
    const userRef = ref(database, `users/${user.uid}`);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
      return snapshot.val() as UserProfile;
    }

    const profile: UserProfile = {
      name: user.displayName ?? 'Ukjent bruker',
      email: user.email,
      photoURL: user.photoURL ?? null,
      roles: ['BRUKER'],
      createdAt: Date.now(),
    };
    await set(userRef, profile);
    return profile;
  }

  async function loginWithGoogle(): Promise<User> {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  }

  async function logout(): Promise<void> {
    await signOut(auth);
  }

  const value: AuthContextValue = { currentUser, userProfile, loading, loginWithGoogle, logout };
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
