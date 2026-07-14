import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginDemo: (role: 'siswa' | 'guru' | 'admin', name?: string, classId?: string, customEmail?: string) => void;
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
          let userDocSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDocSnap.exists()) {
            setUser({ uid: firebaseUser.uid, ...userDocSnap.data() } as User);
          } else {
            // Fallback: Check if the user document is stored using an admin-generated ID
            const { collection, query, where, getDocs } = await import('firebase/firestore');
            const authUidQuery = query(collection(db, 'users'), where('authUid', '==', firebaseUser.uid));
            const authUidSnaps = await getDocs(authUidQuery);
            
            if (!authUidSnaps.empty) {
              const docData = authUidSnaps.docs[0];
              setUser({ uid: docData.id, ...docData.data() } as User);
            } else {
              // Try querying by email as a last resort
              if (firebaseUser.email) {
                const emailQuery = query(collection(db, 'users'), where('email', '==', firebaseUser.email));
                const emailSnaps = await getDocs(emailQuery);
                if (!emailSnaps.empty) {
                  const docData = emailSnaps.docs[0];
                  setUser({ uid: docData.id, ...docData.data() } as User);
                  return;
                }
              }
              
              // Default to basic Firebase auth details if no Firestore doc is found at all
              setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                displayName: firebaseUser.displayName || 'Unknown',
                role: firebaseUser.email?.includes('guru') ? 'guru' : 'siswa'
              });
            }
          }
        } catch (error) {
          // Ignore permissions error for demo environment
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || 'Demo User',
            role: firebaseUser.email?.includes('guru') ? 'guru' : 'siswa'
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginDemo = (role: 'siswa' | 'guru' | 'admin', name = 'Demo User', classId = 'XE3', customEmail?: string) => {
    const demoUser: User = {
      uid: 'demo-' + Date.now(),
      email: customEmail || (role === 'guru' ? 'guru@smada.id' : 'siswa@smada.id'),
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
