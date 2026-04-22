import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          localStorage.setItem('splitease_token', token);
          // Sync user profile to backend
          const res = await api.post('/users/sync');
          setUser({ ...firebaseUser, profile: res.data.user });
        } catch (err) {
          console.error('Failed to sync user:', err);
          setUser(firebaseUser);
        }
      } else {
        localStorage.removeItem('splitease_token');
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  };

  const logout = async () => {
    await signOut(auth);
    localStorage.removeItem('splitease_token');
  };

  // Refresh token before it expires
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      try {
        const token = await auth.currentUser?.getIdToken(true);
        if (token) localStorage.setItem('splitease_token', token);
      } catch {}
    }, 50 * 60 * 1000); // Every 50 minutes
    return () => clearInterval(interval);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
