import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Plus, FileText, Settings, Play, Clock, Users, ChevronRight, BarChart3, Search, X, Check, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface Exam {
  id: string;
  title: string;
  subject: string;
  date: string;
  duration: string;
  status: 'upcoming' | 'active' | 'completed';
  participants: number;
  columnNumber: number;
  category: 'formatif' | 'sumatif';
}

export default function Exams() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newExam, setNewExam] = useState({ 
    title: '', 
    subject: 'Informatika', 
    duration: '90 Menit',
    columnNumber: 1,
    category: 'formatif' as const
  });

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const q = query(collection(db, 'exams'), orderBy('title'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setExams(data);
    } catch (error) {
      console.error("Error fetching exams:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExam = async () => {
    if (!newExam.title) return;
    try {
      const examData = {
        title: newExam.title,
        subject: newExam.subject,
        date: new Date().toISOString().split('T')[0],
        duration: newExam.duration,
        status: 'upcoming',
        participants: 0,
        columnNumber: newExam.columnNumber,
        category: newExam.category
      };
      const docRef = await addDoc(collection(db, 'exams'), examData);
      setExams([{ id: docRef.id, ...examData } as Exam, ...exams]);
      setNewExam({ title: '', subject: 'Informatika', duration: '90 Menit', columnNumber: 1, category: 'formatif' });
      setShowCreateModal(false);
    } catch (error) {
      console.error("Error creating exam:", error);
    }
  };

  const updateStatus = async (id: string, status: 'upcoming' | 'active' | 'completed') => {
    try {
      await updateDoc(doc(db, 'exams', id), { status });
      setExams(exams.map(e => e.id === id ? { ...e, status } : e));
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleDeleteExam = async (id: string) => {
    if (!confirm('Hapus ujian ini?')) return;
    try {
      await deleteDoc(doc(db, 'exams', id));
      setExams(exams.filter(e => e.id !== id));
    } catch (error) {
      console.error("Error deleting exam:", error);
    }
  };

  const filteredExams = exams.filter(e => 
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Sistem Ujian Online</h2>
          <p className="text-slate-500 text-sm">Kelola bank soal dan jadwal ujian sekolah</p>
        </div>
        <Button 
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-6 h-12 font-bold shadow-lg shadow-indigo-100"
        >
          <Plus className="w-5 h-5 mr-2" /> Buat Ujian Baru
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Ujian', value: exams.length.toString(), icon: <FileText className="text-blue-500" />, sub: 'Tahun Ajaran 2023/2024' },
          { label: 'Siswa Aktif', value: '840', icon: <Users className="text-emerald-500" />, sub: 'Terdaftar di Sistem' },
          { label: 'Rata-rata Nilai', value: '78.4', icon: <BarChart3 className="text-amber-500" />, sub: 'Dari 12.5k Jawaban' },
        ].map((stat, i) => (
          <Card key={i} className="rounded-3xl border-slate-100 shadow-sm bg-white overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center">
                  {stat.icon}
                </div>
                <span className="text-slate-400"><ChevronRight size={20} /></span>
              </div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
              <h3 className="text-3xl font-black text-slate-800 mt-1">{stat.value}</h3>
              <p className="text-xs text-slate-400 mt-2">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search and List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-lg font-bold text-slate-800">Jadwal & Riwayat Ujian</h3>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <Input 
              placeholder="Cari ujian..." 
              className="pl-10 h-10 rounded-xl border-slate-200 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {filteredExams.map((exam) => (
            <motion.div
              key={exam.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="group"
            >
              <Card className="rounded-3xl border-slate-100 shadow-sm bg-white overflow-hidden hover:shadow-md transition-all">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center gap-6">
                    <div className={`w-16 h-16 rounded-2xl shrink-0 flex flex-col items-center justify-center ${
                      exam.status === 'active' ? 'bg-emerald-50 text-emerald-600' :
                      exam.status === 'upcoming' ? 'bg-blue-50 text-blue-600' :
                      'bg-slate-50 text-slate-400'
                    }`}>
                      <FileText size={24} />
                      <span className="text-[10px] font-bold uppercase mt-1">{exam.subject}</span>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-slate-800">{exam.title}</h4>
                        {exam.status === 'active' && (
                          <span className="flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                            SEDANG BERLANGSUNG
                          </span>
                        )}
                        {exam.status === 'completed' && (
                          <span className="flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">
                            SELESAI
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-slate-400" /> {exam.date} • {exam.duration}
                        </div>
                        <div className="flex items-center gap-2">
                          <Users size={14} className="text-slate-400" /> {exam.participants} Peserta
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-10 px-4 rounded-xl border-slate-200 font-bold text-slate-600"
                        onClick={() => alert(`Detail untuk: ${exam.title}`)}
                      >
                        <Settings size={16} className="mr-2" /> Detail
                      </Button>
                      
                      {exam.status === 'upcoming' && (
                        <Button 
                          onClick={() => updateStatus(exam.id, 'active')}
                          className="h-10 px-6 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100"
                        >
                          <Play size={16} className="mr-2" /> Mulai Sekarang
                        </Button>
                      )}

                      {exam.status === 'active' && (
                        <Button 
                          onClick={() => updateStatus(exam.id, 'completed')}
                          className="h-10 px-6 rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-100"
                        >
                          <XCircle size={16} className="mr-2" /> Berhentikan
                        </Button>
                      )}

                      {exam.status === 'completed' && (
                        <Button 
                          onClick={() => alert('Menampilkan hasil ujian...')}
                          className="h-10 px-6 rounded-xl font-bold bg-slate-800 hover:bg-black text-white shadow-lg shadow-slate-100"
                        >
                          <BarChart3 size={16} className="mr-2" /> Lihat Hasil
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-800">Buat Ujian Baru</h3>
                  <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                    <X size={20} />
                  </button>
                </div>
                
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Judul Ujian</label>
                    <Input 
                      placeholder="Contoh: PTS Ganjil Informatika" 
                      className="h-12 rounded-xl border-slate-200"
                      value={newExam.title}
                      onChange={e => setNewExam({ ...newExam, title: e.target.value })}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mata Pelajaran</label>
                      <select 
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        value={newExam.subject}
                        onChange={e => setNewExam({ ...newExam, subject: e.target.value })}
                      >
                        <option>Informatika</option>
                        <option>Pemrograman</option>
                        <option>Jaringan</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Durasi</label>
                      <select 
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        value={newExam.duration}
                        onChange={e => setNewExam({ ...newExam, duration: e.target.value })}
                      >
                        <option>45 Menit</option>
                        <option>90 Menit</option>
                        <option>120 Menit</option>
                        <option>180 Menit</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kategori Leger</label>
                      <select 
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        value={newExam.category}
                        onChange={e => setNewExam({ ...newExam, category: e.target.value as any })}
                      >
                        <option value="formatif">Asesmen Formatif</option>
                        <option value="sumatif">Sumatif Lingkup Materi</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kolom (1-15)</label>
                      <select 
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        value={newExam.columnNumber}
                        onChange={e => setNewExam({ ...newExam, columnNumber: parseInt(e.target.value) })}
                      >
                        {[...Array(15)].map((_, i) => (
                          <option key={i+1} value={i+1}>Kolom {i+1}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <Button 
                      variant="outline" 
                      className="flex-1 h-12 rounded-xl font-bold border-slate-200"
                      onClick={() => setShowCreateModal(false)}
                    >
                      Batal
                    </Button>
                    <Button 
                      className="flex-1 h-12 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100"
                      onClick={handleCreateExam}
                    >
                      <Check className="w-5 h-5 mr-2" /> Simpan Ujian
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const XCircle = ({ size, className }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
);
