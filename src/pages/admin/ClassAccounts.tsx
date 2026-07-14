import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Plus, Trash2, Edit2, Loader2, KeyRound, Save, X } from 'lucide-react';

interface ClassAccount {
  id: string; // The class name (e.g., XIF2) will be the document ID
  name: string;
  email: string;
  password?: string;
}

export default function ClassAccounts() {
  const [accounts, setAccounts] = useState<ClassAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [className, setClassName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'class_accounts'), orderBy('name')));
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ClassAccount[];
      setAccounts(list);
    } catch (error) {
      console.error("Error fetching class accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim() || !email.trim()) return;

    setSaving(true);
    try {
      const clsName = className.trim().toUpperCase();
      await setDoc(doc(db, 'class_accounts', clsName), {
        name: clsName,
        email: email.trim(),
        password: password.trim(),
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      setClassName('');
      setEmail('');
      setPassword('');
      fetchAccounts();
    } catch (error) {
      console.error("Error adding class account:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string, updatedEmail: string, updatedPassword?: string) => {
    try {
      await setDoc(doc(db, 'class_accounts', id), {
        email: updatedEmail.trim(),
        password: updatedPassword?.trim() || '',
        updatedAt: serverTimestamp()
      }, { merge: true });
      setEditingId(null);
      fetchAccounts();
    } catch (error) {
      console.error("Error updating class account:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Hapus akun untuk kelas ${id}?`)) return;
    try {
      await deleteDoc(doc(db, 'class_accounts', id));
      setAccounts(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error("Error deleting class account:", error);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto pb-24">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
          <Mail size={24} />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Akun Kelas</h1>
          <p className="text-slate-500 font-medium">Kelola email dan password khusus per kelas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="rounded-3xl border-slate-100 shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
              <CardTitle className="text-lg font-bold text-slate-700">Tambah Akun Kelas</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600">Pilih / Ketik Kelas</label>
                  <Input 
                    placeholder="Contoh: XIF2" 
                    value={className}
                    onChange={(e) => setClassName(e.target.value.toUpperCase())}
                    className="rounded-xl bg-slate-50 border-slate-200 uppercase"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600">Email Kelas</label>
                  <Input 
                    placeholder="email@kelas.com" 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-xl bg-slate-50 border-slate-200"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600">Password (Opsional)</label>
                  <Input 
                    placeholder="Password email..." 
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="rounded-xl bg-slate-50 border-slate-200"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  disabled={saving}
                  className="w-full rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 mt-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Simpan Akun
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="rounded-3xl border-slate-100 shadow-sm bg-white overflow-hidden h-full">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                </div>
              ) : accounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                  <Mail className="w-12 h-12 mb-4 text-slate-300" />
                  <p className="font-medium">Belum ada akun kelas yang ditambahkan.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {accounts.map((item, index) => (
                    <AccountRow 
                      key={item.id} 
                      account={item} 
                      index={index} 
                      isEditing={editingId === item.id}
                      onEdit={() => setEditingId(item.id)}
                      onCancel={() => setEditingId(null)}
                      onSave={handleUpdate}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AccountRow({ 
  account, 
  index, 
  isEditing, 
  onEdit, 
  onCancel, 
  onSave, 
  onDelete 
}: { 
  account: ClassAccount, 
  index: number, 
  isEditing: boolean, 
  onEdit: () => void, 
  onCancel: () => void, 
  onSave: (id: string, email: string, pwd?: string) => void, 
  onDelete: (id: string) => void 
}) {
  const [editEmail, setEditEmail] = useState(account.email);
  const [editPwd, setEditPwd] = useState(account.password || '');

  useEffect(() => {
    if (isEditing) {
      setEditEmail(account.email);
      setEditPwd(account.password || '');
    }
  }, [isEditing, account]);

  if (isEditing) {
    return (
      <div className="p-6 bg-indigo-50/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
            {account.name}
          </div>
          <h3 className="font-bold text-slate-700">Edit Akun Kelas</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500">Email</label>
            <Input 
              value={editEmail} 
              onChange={(e) => setEditEmail(e.target.value)} 
              className="bg-white rounded-lg h-9" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500">Password</label>
            <Input 
              value={editPwd} 
              onChange={(e) => setEditPwd(e.target.value)} 
              className="bg-white rounded-lg h-9" 
            />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onCancel} className="text-slate-500">
            <X size={16} className="mr-1.5" /> Batal
          </Button>
          <Button variant="default" size="sm" onClick={() => onSave(account.id, editEmail, editPwd)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">
            <Save size={16} className="mr-1.5" /> Simpan
          </Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 mt-1 bg-indigo-100 text-indigo-700 font-black text-lg">
          {account.name}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <Mail size={14} className="text-slate-400" />
            <h3 className="font-bold text-slate-800">{account.email}</h3>
          </div>
          {account.password && (
            <div className="flex items-center gap-2 mt-1 text-sm text-slate-500 font-medium">
              <KeyRound size={14} className="text-slate-400" />
              <span>{account.password}</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="h-9 w-9 p-0 rounded-xl text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50"
        >
          <Edit2 size={18} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(account.id)}
          className="h-9 w-9 p-0 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-50"
        >
          <Trash2 size={18} />
        </Button>
      </div>
    </motion.div>
  );
}
