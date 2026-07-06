import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginDemo: (role: 'siswa' | 'guru' | 'admin', name?: string, classId?: string) => void;
  logoutDemo: () => void;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true,
  loginDemo: () => {},
  logoutDemo: () => {}
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const demoUserStr = localStorage.getItem('demo_user');
    if (demoUserStr) {
      setUser(JSON.parse(demoUserStr));
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUser({ uid: firebaseUser.uid, ...userDoc.data() } as User);
          } else {
            // Default to siswa if doc not found
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email!,
              displayName: firebaseUser.displayName || 'Unknown',
              role: firebaseUser.email?.includes('guru') ? 'guru' : 'siswa'
            });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginDemo = (role: 'siswa' | 'guru' | 'admin', name = 'Demo User', classId = 'XE3') => {
    const demoUser: User = {
      uid: 'demo-' + Date.now(),
      email: role === 'guru' ? 'guru@smada.id' : 'siswa@smada.id',
      displayName: name,
      role: role,
      classId: classId
    };
    localStorage.setItem('demo_user', JSON.stringify(demoUser));
    setUser(demoUser);
    setLoading(false);
  };

  const logoutDemo = () => {
    localStorage.removeItem('demo_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginDemo, logoutDemo }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
