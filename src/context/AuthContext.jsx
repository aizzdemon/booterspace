import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser && !nextUser.isAnonymous ? nextUser : null);
      if (nextUser && !nextUser.isAnonymous) {
        const snap = await getDoc(doc(db, 'users', nextUser.uid)).catch(() => null);
        setProfile(snap?.exists() ? snap.data() : null);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
  }, []);

  const value = useMemo(() => ({ user, profile, loading, logout: () => signOut(auth) }), [user, profile, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
