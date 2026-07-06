import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';
import { User as UserIcon, Lock, Mail, KeyRound } from 'lucide-react';
import { motion } from 'motion/react';

const CLASSES = ['XE1', 'XE2', 'XE3', 'XII IPA 1'];
const STUDENTS: Record<string, string[]> = {
  'XE1': ['Budi Santoso', 'Andi Saputra'],
  'XE2': ['Citra Kirana', 'Dewi Lestari'],
  'XE3': ['Ahmad Dani', 'Laras Putri', 'Siti Aminah'],
  'XII IPA 1': ['Gilang Ramadhan', 'Hendra Wijaya']
};

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'siswa' | 'guru'>('siswa');
  
  // Siswa State
  const [selectedClass, setSelectedClass] = useState('XE3');
  const [selectedName, setSelectedName] = useState('');
  
  // Shared State
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedName || !password) {
      setError('Pilih nama dan masukkan password.');
      return;
    }
    setLoading(true);
    setError('');

    const syntheticEmail = `${selectedName.toLowerCase().replace(/\s+/g, '.')}@siswa.smada.id`;

    try {
      await signInWithEmailAndPassword(auth, syntheticEmail, password);
      navigate('/dashboard');
    } catch (err: any) {
      // Auto-register for demo purposes if login fails
      try {
        const cred = await createUserWithEmailAndPassword(auth, syntheticEmail, password);
        await updateProfile(cred.user, { displayName: selectedName });
        await setDoc(doc(db, 'users', cred.user.uid), {
          email: syntheticEmail,
          displayName: selectedName,
          role: 'siswa',
          classId: selectedClass,
          createdAt: new Date().toISOString()
        });
        navigate('/dashboard');
      } catch (createErr: any) {
        if (createErr.code === 'auth/weak-password') {
          setError('Password minimal harus 6 karakter.');
        } else if (createErr.code === 'auth/email-already-in-use') {
          setError('Nama ini sudah terdaftar. Periksa kembali password Anda.');
        } else {
          setError('Login gagal. ' + createErr.message);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuruLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Masukkan email dan password.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (err: any) {
      // Auto-register for demo purposes
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: 'Guru SMADA' });
        await setDoc(doc(db, 'users', cred.user.uid), {
          email,
          displayName: 'Guru SMADA',
          role: 'guru',
          createdAt: new Date().toISOString()
        });
        navigate('/dashboard');
      } catch (createErr: any) {
        if (createErr.code === 'auth/weak-password') {
          setError('Password minimal harus 6 karakter.');
        } else if (createErr.code === 'auth/email-already-in-use') {
          setError('Email sudah terdaftar. Periksa kembali password Anda.');
        } else {
          setError('Login gagal. ' + createErr.message);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-0 shadow-xl rounded-3xl bg-white overflow-hidden">
          <CardContent className="p-8 md:p-10">
            {mode === 'siswa' ? (
              <>
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-indigo-50 text-indigo-500 mb-6">
                    <UserIcon size={40} />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-800">Selamat Datang!</h1>
                  <p className="text-slate-500 mt-2">Masuk untuk memulai ujian.</p>
                </div>

                <form onSubmit={handleStudentLogin} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">Pilih Kelas</label>
                    <select 
                      className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                      value={selectedClass}
                      onChange={(e) => {
                        setSelectedClass(e.target.value);
                        setSelectedName('');
                      }}
                    >
                      {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">Pilih Nama Kamu</label>
                    <select 
                      className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                      value={selectedName}
                      onChange={(e) => setSelectedName(e.target.value)}
                    >
                      <option value="">-- Cari Namamu di {selectedClass} --</option>
                      {STUDENTS[selectedClass]?.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">Password</label>
                    <Input 
                      type="password" 
                      placeholder="Masukkan password..." 
                      className="h-12 rounded-xl border-slate-200"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  {error && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg font-medium">
                      {error}
                    </div>
                  )}

                  <Button type="submit" className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-200 mt-2 transition-all" disabled={loading}>
                    {loading ? 'Memproses...' : 'Masuk Kelas'}
                  </Button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                  <button 
                    onClick={() => { setMode('guru'); setError(''); setPassword(''); }} 
                    className="inline-flex items-center text-sm text-slate-400 hover:text-slate-600 font-medium transition-colors"
                  >
                    <Lock size={14} className="mr-2" />
                    Masuk sebagai Guru
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100 text-slate-500 mb-6">
                    <Lock size={40} />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-800">Portal Guru</h1>
                  <p className="text-slate-500 mt-2">Masuk untuk mengelola sistem sekolah.</p>
                </div>

                <form onSubmit={handleGuruLogin} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                      <Input 
                        type="email" 
                        placeholder="guru@smada.id" 
                        className="pl-12 h-12 rounded-xl border-slate-200"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">Password</label>
                    <div className="relative">
                      <KeyRound className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        className="pl-12 h-12 rounded-xl border-slate-200"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg font-medium">
                      {error}
                    </div>
                  )}

                  <Button type="submit" className="w-full h-12 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-sm shadow-md mt-2 transition-all" disabled={loading}>
                    {loading ? 'Memproses...' : 'Masuk Dashboard'}
                  </Button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                  <button 
                    onClick={() => { setMode('siswa'); setError(''); setPassword(''); }} 
                    className="inline-flex items-center text-sm text-slate-400 hover:text-slate-600 font-medium transition-colors"
                  >
                    <UserIcon size={14} className="mr-2" />
                    Kembali ke Login Siswa
                  </button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
