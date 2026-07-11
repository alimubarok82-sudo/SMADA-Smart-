import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Search, Filter, ExternalLink, Image as ImageIcon, Link as LinkIcon, CheckCircle2, Clock, Trash2, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from '../../lib/firebase';
import { collection, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';

interface Submission {
  id: string;
  studentId: string;
  studentName: string;
  type: 'link' | 'image';
  content: string;
  timestamp: any;
  status: 'pending' | 'graded';
  classId: string;
  grade?: number;
  title?: string;
}

export default function Submissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('Semua Kelas');
  const [selectedTitle, setSelectedTitle] = useState('Semua Tugas');
  const [grades, setGrades] = useState<Record<string, number>>({});
  const [columnNumbers, setColumnNumbers] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const q = query(collection(db, 'submissions'), orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      setSubmissions(data);
      
      // Initialize grades and columns state
      const initialGrades: Record<string, number> = {};
      const initialColumns: Record<string, number> = {};
      data.forEach(s => {
        if (s.grade !== undefined) initialGrades[s.id] = s.grade;
        if (s.columnNumber !== undefined) initialColumns[s.id] = s.columnNumber;
      });
      setGrades(initialGrades);
      setColumnNumbers(initialColumns);
    } catch (error) {
      const errInfo = {
        error: error instanceof Error ? error.message : String(error),
        operationType: 'get',
        path: 'submissions',
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email
      };
      console.error("Error fetching submissions:", JSON.stringify(errInfo));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGrade = async (id: string) => {
    const gradeValue = grades[id];
    const columnNum = columnNumbers[id] || 1;
    if (gradeValue === undefined) return;
    
    try {
      await updateDoc(doc(db, 'submissions', id), { 
        grade: gradeValue,
        status: 'graded',
        columnNumber: columnNum,
        category: 'sumatif'
      });
      setSubmissions(submissions.map(s => s.id === id ? { ...s, grade: gradeValue, status: 'graded', columnNumber: columnNum, category: 'sumatif' } : s));
    } catch (error) {
      const errInfo = {
        error: error instanceof Error ? error.message : String(error),
        operationType: 'update',
        path: `submissions/${id}`,
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email
      };
      console.error("Error saving grade:", JSON.stringify(errInfo));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus penilaian portofolio ini?')) return;
    
    try {
      await deleteDoc(doc(db, 'submissions', id));
      setSubmissions(submissions.filter(s => s.id !== id));
    } catch (error) {
      console.error("Error deleting submission:", error);
      alert("Gagal menghapus data.");
    }
  };

  const filtered = submissions.filter(s => {
    const matchesSearch = s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (s.title || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClass === 'Semua Kelas' || s.classId === selectedClass;
    const matchesTitle = selectedTitle === 'Semua Tugas' || s.title === selectedTitle;
    return matchesSearch && matchesClass && matchesTitle;
  });

  const uniqueClasses = Array.from(new Set(submissions.map(s => s.classId))).sort();
  const uniqueTitles = Array.from(new Set(submissions.map(s => s.title).filter(Boolean))).sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <LinkIcon className="text-rose-500 w-6 h-6" />
          <div>
            <h2 className="text-xl font-bold text-slate-800">Penilaian Portofolio Siswa</h2>
            <p className="text-slate-500 text-xs">Daftar unggahan tugas dan karya siswa untuk dinilai.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select 
            className="h-10 px-4 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 min-w-[150px] shadow-sm"
            value={selectedTitle}
            onChange={(e) => setSelectedTitle(e.target.value)}
          >
            <option>Semua Tugas</option>
            {uniqueTitles.map(t => <option key={t as string} value={t as string}>{t}</option>)}
          </select>
          <select 
            className="h-10 px-4 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 min-w-[150px] shadow-sm"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option>Semua Kelas</option>
            {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <AnimatePresence>
          {loading ? (
            <div className="py-20 text-center text-slate-400 font-medium">Memuat data pengiriman...</div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-slate-400 font-medium">Belum ada pengiriman jawaban</div>
          ) : (
            filtered.map((sub, i) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="rounded-2xl border-slate-100 shadow-sm hover:shadow-md transition-all bg-white overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">{sub.studentName}</h3>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase">{sub.classId}</span>
                        </div>
                        <p className="text-rose-600 font-bold text-lg lowercase">{sub.title || 'tugas informatika'}</p>
                        <div className="flex items-center gap-2 text-slate-400 text-[10px] font-medium">
                          <Clock size={12} />
                          {sub.timestamp?.toDate ? sub.timestamp.toDate().toLocaleString('id-ID') : 'Baru saja'}
                        </div>
                        <div className="pt-2 flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => window.open(sub.content, '_blank')}
                            className="h-8 rounded-lg border-rose-200 text-rose-500 bg-white hover:bg-rose-50 font-bold text-[10px] px-3 shadow-sm transition-all"
                          >
                            <LinkIcon size={12} className="mr-2" /> Buka Link
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDelete(sub.id)}
                            className="h-8 w-8 rounded-lg p-0 text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
                            title="Hapus Pengiriman"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>

                      <div className="w-full md:w-auto flex flex-col items-end gap-2">
                        <div className="flex gap-2 w-full md:w-auto">
                          <div className="flex-1 space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kolom Sumatif</label>
                            <select 
                              className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-rose-500 transition-all shadow-inner"
                              value={columnNumbers[sub.id] || 1}
                              onChange={(e) => setColumnNumbers({ ...columnNumbers, [sub.id]: parseInt(e.target.value) })}
                            >
                              {[...Array(9)].map((_, i) => (
                                <option key={i+1} value={i+1}>Sumatif {i+1}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex-1 space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nilai (0-100)</label>
                            <div className="flex items-center gap-2">
                              <input 
                                type="number"
                                min="0"
                                max="100"
                                className="w-full md:w-20 h-11 px-4 bg-white border border-slate-200 rounded-xl text-center font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-inner"
                                value={grades[sub.id] || ''}
                                onChange={(e) => setGrades({ ...grades, [sub.id]: parseInt(e.target.value) })}
                              />
                              <button 
                                onClick={() => handleSaveGrade(sub.id)}
                                className="w-11 h-11 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-100 transition-all shrink-0 active:scale-95"
                              >
                                <CheckCircle2 size={20} />
                              </button>
                            </div>
                          </div>
                        </div>
                        {sub.status === 'graded' && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 animate-in fade-in slide-in-from-top-1">
                            <CheckCircle2 size={12} /> Dinilai
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
