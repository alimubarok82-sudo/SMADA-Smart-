import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { motion } from 'motion/react';
import { BookOpen, Plus, Trash2, Edit2, Link as LinkIcon, Power, PowerOff, Loader2, CheckCircle2, Circle } from 'lucide-react';

interface Material {
  id: string;
  title: string;
  url: string;
  bab?: string;
  chapterTitle?: string;
  targetClasses: string[];
  completedClasses: string[];
  isActive: boolean;
  createdAt: any;
}

export default function MaterialsManager() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [allClasses, setAllClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [bab, setBab] = useState('Bab 1');
  const [chapterTitle, setChapterTitle] = useState('');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [targetClasses, setTargetClasses] = useState<string[]>([]);

  useEffect(() => {
    fetchMaterials();
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'classes'), orderBy('name')));
      const classList = snap.docs.map(doc => doc.data().name).filter(Boolean);
      setAllClasses(classList);
    } catch (error) {
      console.error("Error fetching classes:", error);
    }
  };

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'materials'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        targetClasses: doc.data().targetClasses || [],
        completedClasses: doc.data().completedClasses || []
      })) as Material[];
      setMaterials(list);
    } catch (error) {
      console.error("Error fetching materials:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim() || targetClasses.length === 0) {
      alert("Harap isi judul, link, dan pilih minimal 1 kelas target.");
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, 'materials'), {
        bab: bab.trim(),
        chapterTitle: chapterTitle.trim(),
        title: title.trim(),
        url: url.trim(),
        targetClasses,
        completedClasses: [],
        isActive: true,
        createdAt: serverTimestamp()
      });
      setTitle('');
      setUrl('');
      setTargetClasses([]);
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

  const toggleCompletion = async (materialId: string, className: string, currentCompleted: string[]) => {
    try {
      let updated = [...currentCompleted];
      if (updated.includes(className)) {
        updated = updated.filter(c => c !== className);
      } else {
        updated.push(className);
      }
      
      await updateDoc(doc(db, 'materials', materialId), {
        completedClasses: updated
      });
      
      setMaterials(prev => prev.map(m => m.id === materialId ? { ...m, completedClasses: updated } : m));
    } catch (error) {
      console.error("Error toggling completion:", error);
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600">Bab</label>
                    <Input 
                      placeholder="Contoh: Bab 1" 
                      value={bab}
                      onChange={(e) => setBab(e.target.value)}
                      className="rounded-xl bg-slate-50 border-slate-200"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600">Judul Bab</label>
                    <Input 
                      placeholder="Contoh: Strategi Algoritmik" 
                      value={chapterTitle}
                      onChange={(e) => setChapterTitle(e.target.value)}
                      className="rounded-xl bg-slate-50 border-slate-200"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600">Nama Sub Materi</label>
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
                  <label className="text-sm font-bold text-slate-600">Target Kelas (Pilih Minimal 1)</label>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                    {allClasses.length === 0 ? (
                      <p className="text-xs text-slate-400">Belum ada kelas terdaftar.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 cursor-pointer pb-2 mb-1 border-b border-slate-200">
                          <input 
                            type="checkbox" 
                            checked={targetClasses.length === allClasses.length && allClasses.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTargetClasses([...allClasses]);
                              } else {
                                setTargetClasses([]);
                              }
                            }}
                            className="rounded text-indigo-600 w-4 h-4"
                          />
                          <span className="text-sm font-bold text-slate-700">Pilih Semua Kelas</span>
                        </label>
                        {allClasses.map(c => (
                          <label key={c} className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1 rounded">
                            <input 
                              type="checkbox" 
                              checked={targetClasses.includes(c)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setTargetClasses(prev => [...prev, c]);
                                } else {
                                  setTargetClasses(prev => prev.filter(cls => cls !== c));
                                }
                              }}
                              className="rounded text-indigo-600 w-4 h-4"
                            />
                            <span className="text-sm text-slate-600">{c}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
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
                      <div className="flex flex-col gap-4">
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-1 ${item.isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                            <LinkIcon size={20} />
                          </div>
                          <div className="flex-1">
                            <h3 className={`font-bold text-base ${item.isActive ? 'text-slate-800' : 'text-slate-500'}`}>
                              <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md mr-2">{item.bab || "Bab"} - {item.chapterTitle || "Materi Umum"}</span>
                              {item.title}
                            </h3>
                            <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 font-medium">
                              <span className="bg-slate-100 px-2 py-0.5 rounded-md text-xs">{item.targetClasses.length} Kelas Target</span>
                              <a href={item.url} target="_blank" rel="noreferrer" className="hover:text-indigo-600 hover:underline truncate max-w-[200px] md:max-w-xs block">
                                {item.url}
                              </a>
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
                        </div>

                        {item.targetClasses.length > 0 && (
                          <div className="pl-14">
                            <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Status Pengerjaan (Klik untuk Tandai Selesai)</p>
                            <div className="flex flex-wrap gap-2">
                              {item.targetClasses.map(c => {
                                const isDone = item.completedClasses.includes(c);
                                return (
                                  <button
                                    key={c}
                                    onClick={() => toggleCompletion(item.id, c, item.completedClasses)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                      isDone 
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' 
                                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                                    }`}
                                  >
                                    {isDone ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Circle size={14} className="text-slate-300" />}
                                    {c}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
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
