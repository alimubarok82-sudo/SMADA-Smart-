import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Plus, FileText, Settings, Play, Clock, Users, ChevronRight, BarChart3, Search, X, Check, Trash2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeStudents: 0,
    avgGrade: 0,
    totalAnswers: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newExam, setNewExam] = useState({ 
    title: '', 
    subject: 'Informatika', 
    duration: '30 Menit',
    columnNumber: 1,
    category: 'formatif' as const,
    targetClass: '',
    questions: [] as any[]
  });
  const [classes, setClasses] = useState<string[]>([]);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState({
    text: '',
    options: ['', '', '', ''],
    correctAnswer: 0
  });

  useEffect(() => {
    fetchExams();
    fetchStats();
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'classes'), orderBy('name')));
      const classList = snap.docs.map(doc => doc.data().name).filter(Boolean);
      
      const studentsSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'siswa')));
      const classesFromStudents = new Set<string>();
      studentsSnap.docs.forEach(d => {
        const cId = d.data().classId;
        if (cId) classesFromStudents.add(cId);
      });
      
      const combined = Array.from(new Set([...classList, ...Array.from(classesFromStudents)]))
        .filter(Boolean)
        .sort();
      
      setClasses(combined);
      if (combined.length > 0) {
        setNewExam(prev => ({ ...prev, targetClass: combined[0] }));
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
    }
  };

  const fetchStats = async () => {
    try {
      // 1. Total Students (Deduplicated)
      const studentsSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'siswa')));
      const uniqueStudentNames = new Set();
      studentsSnap.docs.forEach(d => {
        const data = d.data();
        uniqueStudentNames.add(`${data.displayName}-${data.classId}`);
      });
      
      // 2. Avg Grade
      const resultsSnap = await getDocs(collection(db, 'exam_results'));
      const submissionsSnap = await getDocs(query(collection(db, 'submissions'), where('status', '==', 'graded')));
      
      let totalPoints = 0;
      let totalCount = 0;

      resultsSnap.docs.forEach(doc => {
        totalPoints += doc.data().score || 0;
        totalCount++;
      });

      submissionsSnap.docs.forEach(doc => {
        totalPoints += doc.data().grade || 0;
        totalCount++;
      });

      const avgGrade = totalCount > 0 ? (totalPoints / totalCount).toFixed(1) : '0';

      setStats({
        activeStudents: uniqueStudentNames.size,
        avgGrade: parseFloat(avgGrade),
        totalAnswers: totalCount
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

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

  const handleAddQuestion = () => {
    if (!currentQuestion.text || currentQuestion.options.some(o => !o)) {
      alert("Harap isi soal dan semua pilihan jawaban");
      return;
    }
    setNewExam(prev => ({
      ...prev,
      questions: [...prev.questions, currentQuestion]
    }));
    setCurrentQuestion({
      text: '',
      options: ['', '', '', ''],
      correctAnswer: 0
    });
    setShowQuestionForm(false);
  };

  const handleCreateExam = async () => {
    if (!newExam.title) return;
    if (newExam.questions.length === 0) {
      alert("Harap tambahkan minimal satu soal");
      return;
    }
    try {
      const examData = {
        title: newExam.title,
        subject: newExam.subject,
        date: new Date().toISOString().split('T')[0],
        duration: newExam.duration,
        status: 'upcoming',
        participants: 0,
        columnNumber: newExam.columnNumber,
        category: newExam.category,
        targetClass: newExam.targetClass,
        questions: newExam.questions,
        totalQuestions: newExam.questions.length
      };
      const docRef = await addDoc(collection(db, 'exams'), examData);
      setExams([{ id: docRef.id, ...examData } as any, ...exams]);
      setNewExam({ 
        title: '', 
        subject: 'Informatika', 
        duration: '30 Menit', 
        columnNumber: 1, 
        category: 'formatif',
        targetClass: classes[0] || '',
        questions: []
      });
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
          { label: 'Siswa Aktif', value: stats.activeStudents.toString(), icon: <Users className="text-emerald-500" />, sub: 'Terdaftar di Sistem' },
          { label: 'Rata-rata Nilai', value: stats.avgGrade.toString(), icon: <BarChart3 className="text-amber-500" />, sub: `Dari ${stats.totalAnswers} Jawaban` },
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
                        {exam.targetClass && (
                          <div className="flex items-center gap-2">
                            <Check size={14} className="text-indigo-400" /> Kelas: {exam.targetClass}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-10 w-10 p-0 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                        onClick={() => handleDeleteExam(exam.id)}
                      >
                        <Trash2 size={18} />
                      </Button>

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
                          onClick={() => navigate(`/dashboard/exams/results/${exam.id}`)}
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
              className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-8 overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-800">Buat Ujian Baru</h3>
                  <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                    <X size={20} />
                  </button>
                </div>
                
                <div className="space-y-6">
                  {/* Exam Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Judul Ujian</label>
                      <Input 
                        placeholder="Contoh: PTS Ganjil Informatika" 
                        className="h-12 rounded-xl border-slate-200"
                        value={newExam.title}
                        onChange={e => setNewExam({ ...newExam, title: e.target.value })}
                      />
                    </div>
                    
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
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Target Kelas</label>
                      <select 
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        value={newExam.targetClass}
                        onChange={e => setNewExam({ ...newExam, targetClass: e.target.value })}
                      >
                        {classes.length === 0 ? (
                          <option value="">Tidak ada kelas</option>
                        ) : (
                          classes.map(c => <option key={c} value={c}>{c}</option>)
                        )}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Durasi</label>
                      <select 
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        value={newExam.duration}
                        onChange={e => setNewExam({ ...newExam, duration: e.target.value })}
                      >
                        <option>15 Menit</option>
                        <option>25 Menit</option>
                        <option>30 Menit</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kolom Leger</label>
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

                  {/* Question Builder */}
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-700">Daftar Soal ({newExam.questions.length})</h4>
                      {!showQuestionForm && (
                        <Button 
                          size="sm" 
                          onClick={() => setShowQuestionForm(true)}
                          className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-none rounded-lg font-bold"
                        >
                          <Plus size={16} className="mr-1" /> Tambah Soal
                        </Button>
                      )}
                    </div>

                    {showQuestionForm && (
                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pertanyaan</label>
                          <textarea 
                            className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            rows={3}
                            placeholder="Ketik pertanyaan di sini..."
                            value={currentQuestion.text}
                            onChange={e => setCurrentQuestion({ ...currentQuestion, text: e.target.value })}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {currentQuestion.options.map((option, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded-md text-[10px] font-bold text-slate-400">
                                {String.fromCharCode(65 + idx)}
                              </span>
                              <Input 
                                placeholder={`Pilihan ${String.fromCharCode(65 + idx)}`}
                                className="h-10 rounded-lg text-xs"
                                value={option}
                                onChange={e => {
                                  const newOptions = [...currentQuestion.options];
                                  newOptions[idx] = e.target.value;
                                  setCurrentQuestion({ ...currentQuestion, options: newOptions });
                                }}
                              />
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Kunci Jawaban</label>
                            <select 
                              className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs font-bold"
                              value={currentQuestion.correctAnswer}
                              onChange={e => setCurrentQuestion({ ...currentQuestion, correctAnswer: parseInt(e.target.value) })}
                            >
                              {currentQuestion.options.map((_, i) => (
                                <option key={i} value={i}>Pilihan {String.fromCharCode(65 + i)}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setShowQuestionForm(false)} className="text-slate-400 font-bold text-xs">Batal</Button>
                            <Button size="sm" onClick={handleAddQuestion} className="bg-indigo-600 text-white font-bold text-xs">Simpan Soal</Button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                      {newExam.questions.map((q, idx) => (
                        <div key={idx} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-start justify-between group">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">SOAL {idx + 1}</span>
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Kunci: {String.fromCharCode(65 + q.correctAnswer)}</span>
                            </div>
                            <p className="text-sm font-medium text-slate-700 line-clamp-2">{q.text}</p>
                          </div>
                          <button 
                            onClick={() => setNewExam(prev => ({ ...prev, questions: prev.questions.filter((_, i) => i !== idx) }))}
                            className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      {newExam.questions.length === 0 && !showQuestionForm && (
                        <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-[24px]">
                          <p className="text-sm text-slate-400 font-medium italic">Belum ada soal ditambahkan</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3 sticky bottom-0 bg-white">
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
