import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { BookOpen, KeyRound, Mail, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'siswa' | 'guru' | 'admin'>('siswa');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        navigate('/dashboard');
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        
        // Save role in firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email,
          displayName: name,
          role,
          createdAt: new Date().toISOString()
        });
        
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-600/20 mb-4">
            <BookOpen size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">SMADA Smart School</h1>
          <p className="text-slate-500 mt-2">Sistem Informasi Manajemen Sekolah Terpadu</p>
        </div>

        <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>{isLogin ? 'Masuk ke Akun' : 'Daftar Akun Baru'}</CardTitle>
            <CardDescription>
              {isLogin ? 'Masukkan email dan password Anda untuk melanjutkan.' : 'Lengkapi data di bawah ini untuk membuat akun.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Nama Lengkap</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input 
                      placeholder="Masukkan nama lengkap" 
                      className="pl-9"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input 
                    type="email" 
                    placeholder="nama@email.com" 
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input 
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {!isLogin && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Role</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                  >
                    <option value="siswa">Siswa</option>
                    <option value="guru">Guru</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              )}

              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
                  {error}
                </div>
              )}

              {isLogin && (
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-slate-600">Ingat saya</span>
                  </label>
                  <a href="#" className="text-blue-600 hover:underline font-medium">Lupa password?</a>
                </div>
              )}

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
                {loading ? 'Memproses...' : (isLogin ? 'Masuk' : 'Daftar')}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-500">
              {isLogin ? 'Belum punya akun?' : 'Sudah punya akun?'}
              <button 
                onClick={() => setIsLogin(!isLogin)} 
                className="ml-1 text-blue-600 hover:underline font-medium"
              >
                {isLogin ? 'Daftar di sini' : 'Masuk di sini'}
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
