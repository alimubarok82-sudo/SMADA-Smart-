import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { motion } from 'motion/react';
import { BookOpen, Plus, Trash2, Edit2, Link as LinkIcon, Power, PowerOff, Loader2 } from 'lucide-react';

interface Material {
  id: string;
  title: string;
  url: string;
  targetGrade: string; // 'X', 'XI', 'XII', 'Semua'
  isActive: boolean;
  createdAt: any;
}

export default function MaterialsManager() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [targetGrade, setTargetGrade] = useState('Semua');

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'materials'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Material[];
      setMaterials(list);
    } catch (error) {
      console.error("Error fetching materials:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;

    setSaving(true);
    try {
      await addDoc(collection(db, 'materials'), {
        title: title.trim(),
        url: url.trim(),
        targetGrade,
        isActive: true,
        createdAt: serverTimestamp()
      });
      setTitle('');
      setUrl('');
      setTargetGrade('Semua');
      fetchMaterials();
    } catch (error) {
      console.error("Error adding material:", error);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'materials', id), {
        isActive: !currentStatus
      });
      setMaterials(prev => prev.map(m => m.id === id ? { ...m, isActive: !currentStatus } : m));
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus materi ini?')) return;
    try {
      await deleteDoc(doc(db, 'materials', id));
      setMaterials(prev => prev.filter(m => m.id !== id));
    } catch (error) {
      console.error("Error deleting material:", error);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
          <BookOpen size={24} />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Daftar Isi & Materi</h1>
          <p className="text-slate-500 font-medium">Kelola link materi belajar untuk siswa</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="rounded-3xl border-slate-100 shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
              <CardTitle className="text-lg font-bold text-slate-700">Tambah Daftar Isi</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600">Judul Materi</label>
                  <Input 
                    placeholder="Contoh: Modul Pemrograman Dasar" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="rounded-xl bg-slate-50 border-slate-200"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600">Link / URL</label>
                  <Input 
                    placeholder="https://..." 
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="rounded-xl bg-slate-50 border-slate-200"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600">Target Kelas</label>
                  <select 
                    value={targetGrade}
                    onChange={(e) => setTargetGrade(e.target.value)}
                    className="w-full rounded-xl bg-slate-50 border-slate-200 h-10 px-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="Semua">Semua Kelas</option>
                    <option value="X">Kelas X</option>
                    <option value="XI">Kelas XI</option>
                    <option value="XII">Kelas XII</option>
                  </select>
                </div>
                
                <Button 
                  type="submit" 
                  disabled={saving}
                  className="w-full rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 mt-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Tambah Daftar Isi
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
              ) : materials.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                  <BookOpen className="w-12 h-12 mb-4 text-slate-300" />
                  <p className="font-medium">Belum ada daftar isi materi.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {materials.map((item, index) => (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-1 ${item.isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                          <LinkIcon size={20} />
                        </div>
                        <div>
                          <h3 className={`font-bold text-base ${item.isActive ? 'text-slate-800' : 'text-slate-500'}`}>{item.title}</h3>
                          <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 font-medium">
                            <span className="bg-slate-100 px-2 py-0.5 rounded-md text-xs">Target: {item.targetGrade}</span>
                            <a href={item.url} target="_blank" rel="noreferrer" className="hover:text-indigo-600 hover:underline truncate max-w-[200px] md:max-w-xs block">
                              {item.url}
                            </a>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleStatus(item.id, item.isActive)}
                          className={`h-9 w-9 p-0 rounded-xl ${item.isActive ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                          title={item.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                        >
                          {item.isActive ? <Power size={18} /> : <PowerOff size={18} />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          className="h-9 w-9 p-0 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 size={18} />
                        </Button>
                      </div>
                    </motion.div>
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
