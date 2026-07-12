import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Plus, FileText, Settings, Play, Clock, Users, ChevronRight, BarChart3, Search, X, Check, Trash2, XCircle, Sparkles, Loader2, Image as ImageIcon, Upload, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatDate } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

interface Question {
  text: string;
  options: string[];
  correctAnswer: number;
}

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
  targetClass?: string;
  targetClasses?: string[];
  questions?: Question[];
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [isAddingNewClass, setIsAddingNewClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newExam, setNewExam] = useState({ 
    title: '', 
    subject: 'Informatika', 
    duration: '30 Menit',
    columnNumber: 1,
    category: 'formatif' as const,
    targetClasses: [] as string[],
    questions: [] as any[]
  });
  const [editingExam, setEditingExam] = useState<any>(null);
  const [classes, setClasses] = useState<string[]>([]);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState({
    text: '',
    options: ['', '', '', '', ''],
    correctAnswer: 0
  });

  const [aiMaterial, setAiMaterial] = useState('');
  const [aiImage, setAiImage] = useState<string | null>(null);
  const [aiCount, setAiCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAiImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateAI = async () => {
    if (!aiMaterial.trim() && !aiImage) {
      alert('Silakan masukkan materi teks atau unggah gambar terlebih dahulu.');
      return;
    }

    setIsGenerating(true);
    try {
      // Periksa apakah server backend aktif
      try {
        const healthCheck = await fetch('/api/health');
        if (!healthCheck.ok) throw new Error();
      } catch (e) {
        throw new Error('Server backend tidak merespons. Pastikan Anda menjalankan aplikasi di AI Studio Development Server. Jika aplikasi sudah di-export ke Vercel/GitHub, fitur AI ini memerlukan setup backend tambahan.');
      }

      const response = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ material: aiMaterial, count: aiCount, image: aiImage }),
      });

      if (!response.ok) {
        if (response.status === 405) {
          throw new Error("Metode tidak diizinkan (405). Ini biasanya terjadi jika aplikasi berjalan di Vercel tanpa backend Express yang aktif.");
        }
        const errorText = await response.text();
        throw new Error(errorText || `Server error: ${response.status}`);
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      if (data.questions && Array.isArray(data.questions)) {
        setNewExam(prev => ({
          ...prev,
          questions: [...prev.questions, ...data.questions]
        }));
        setAiMaterial('');
        setAiImage(null);
        alert(`Berhasil membuat ${data.questions.length} soal!`);
      }
    } catch (error: any) {
      console.error("AI Gen Error:", error);
      alert('Gagal generate soal: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

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
        setNewExam(prev => ({ ...prev, targetClasses: [combined[0]] }));
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
      options: ['', '', '', '', ''],
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
        date: formatDate(),
        duration: newExam.duration,
        status: 'upcoming',
        participants: 0,
        columnNumber: newExam.columnNumber,
        category: newExam.category,
        targetClasses: newExam.targetClasses,
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
        targetClasses: classes[0] ? [classes[0]] : [],
        questions: []
      });
      setShowCreateModal(false);
    } catch (error) {
      console.error("Error creating exam:", error);
    }
  };

  const handleUpdateExamData = async () => {
    if (!editingExam || !editingExam.title) return;
    try {
      const { id, ...data } = editingExam;
      await updateDoc(doc(db, 'exams', id), {
        ...data,
        totalQuestions: data.questions?.length || 0
      });
      setExams(exams.map(e => e.id === id ? { ...e, ...data } : e));
      setShowEditModal(false);
      setEditingExam(null);
      alert('Berhasil memperbarui ujian!');
    } catch (error) {
      console.error("Error updating exam:", error);
      alert('Gagal memperbarui ujian.');
    }
  };

  const handleAddNewClass = async () => {
    const trimmed = newClassName.trim();
    if (trimmed && !classes.includes(trimmed)) {
      try {
        await addDoc(collection(db, 'classes'), { name: trimmed });
        setClasses(prev => [...prev, trimmed].sort());
        setNewClassName('');
        setIsAddingNewClass(false);
      } catch (error) {
        console.error("Error adding class:", error);
      }
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
          { label: 'Total Ujian', value: exams.length.toString(), icon: <FileText className="text-blue-500" />, sub: 'Tahun Ajaran 2024/2025' },
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
                        {(exam.targetClasses || exam.targetClass) && (
                          <div className="flex items-center gap-2">
                            <Check size={14} className="text-indigo-400" /> Kelas: {exam.targetClasses ? exam.targetClasses.join(', ') : exam.targetClass}
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
                        variant="ghost" 
                        size="sm" 
                        className="h-10 w-10 p-0 rounded-xl text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50"
                        onClick={() => {
                          setEditingExam({ ...exam });
                          setShowEditModal(true);
                        }}
                      >
                        <Pencil size={18} />
                      </Button>

                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-10 px-4 rounded-xl border-slate-200 font-bold text-slate-600"
                        onClick={() => {
                          setSelectedExam(exam);
                          setShowDetailModal(true);
                        }}
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

                    <div className="space-y-2 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Target Kelas (Bisa pilih lebih dari satu)</label>
                        {isAddingNewClass ? (
                          <div className="flex items-center gap-2">
                            <Input 
                              placeholder="Nama kelas baru..." 
                              className="h-7 w-32 text-[10px] py-1 rounded-md"
                              value={newClassName}
                              onChange={e => setNewClassName(e.target.value)}
                              autoFocus
                            />
                            <Button size="sm" className="h-7 px-2 bg-emerald-600" onClick={handleAddNewClass}>Ok</Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-slate-400" onClick={() => setIsAddingNewClass(false)}>X</Button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setIsAddingNewClass(true)}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                          >
                            <Plus size={12} /> Tambah Kelas Baru
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                        {classes.length === 0 ? (
                          <p className="text-xs text-slate-400 col-span-full">Tidak ada kelas tersedia</p>
                        ) : (
                          classes.map(c => (
                            <label key={c} className="flex items-center gap-2 cursor-pointer group">
                              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                                newExam.targetClasses.includes(c) 
                                  ? 'bg-indigo-600 border-indigo-600' 
                                  : 'bg-white border-slate-300 group-hover:border-indigo-400'
                              }`}>
                                {newExam.targetClasses.includes(c) && <Check size={12} className="text-white" />}
                                <input 
                                  type="checkbox"
                                  className="hidden"
                                  checked={newExam.targetClasses.includes(c)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setNewExam({ ...newExam, targetClasses: [...newExam.targetClasses, c] });
                                    } else {
                                      setNewExam({ ...newExam, targetClasses: newExam.targetClasses.filter(tc => tc !== c) });
                                    }
                                  }}
                                />
                              </div>
                              <span className={`text-sm font-bold ${newExam.targetClasses.includes(c) ? 'text-indigo-600' : 'text-slate-600'}`}>{c}</span>
                            </label>
                          ))
                        )}
                      </div>
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

                  {/* AI Generator Section */}
                  <div className="p-6 bg-slate-50 rounded-[24px] border border-slate-200 space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1 space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Materi (Teks/Gambar)</label>
                        <textarea 
                          className="w-full p-4 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white min-h-[120px]"
                          placeholder="Paste materi atau ketik topik soal di sini..."
                          value={aiMaterial}
                          onChange={e => setAiMaterial(e.target.value)}
                        />
                      </div>
                      <div className="w-full md:w-48 space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unggah Foto Materi</label>
                        <div 
                          className="relative h-[120px] bg-white border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all overflow-hidden"
                          onClick={() => document.getElementById('ai-image-upload')?.click()}
                        >
                          {aiImage ? (
                            <div className="relative w-full h-full">
                              <img src={aiImage} alt="Preview" className="w-full h-full object-cover" />
                              <button 
                                onClick={(e) => { e.stopPropagation(); setAiImage(null); }}
                                className="absolute top-1 right-1 p-1 bg-white/80 rounded-full text-rose-500 hover:text-rose-700"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <ImageIcon className="text-slate-300 mb-2" size={24} />
                              <span className="text-[10px] font-bold text-slate-400">Pilih Gambar</span>
                            </>
                          )}
                        </div>
                        <input 
                          id="ai-image-upload" 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleImageUpload}
                        />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-20">
                        <Input 
                          type="number"
                          value={aiCount}
                          onChange={e => setAiCount(parseInt(e.target.value) || 1)}
                          className="h-12 rounded-xl text-center font-bold border-slate-200 bg-white"
                          min={1}
                          max={20}
                        />
                      </div>
                      <Button 
                        onClick={handleGenerateAI}
                        disabled={isGenerating}
                        className="flex-1 h-12 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 size={18} className="animate-spin" />
                            Sedang Membuat...
                          </>
                        ) : (
                          <>
                            <Sparkles size={18} />
                            Generate {aiCount} Soal AI
                          </>
                        )}
                      </Button>
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

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && editingExam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowEditModal(false);
                setEditingExam(null);
              }}
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
                  <h3 className="text-xl font-bold text-slate-800">Edit Ujian</h3>
                  <button onClick={() => {
                    setShowEditModal(false);
                    setEditingExam(null);
                  }} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                    <X size={20} />
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Judul Ujian</label>
                      <Input 
                        placeholder="Contoh: PTS Ganjil Informatika" 
                        className="h-12 rounded-xl border-slate-200"
                        value={editingExam.title}
                        onChange={e => setEditingExam({ ...editingExam, title: e.target.value })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mata Pelajaran</label>
                      <select 
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        value={editingExam.subject}
                        onChange={e => setEditingExam({ ...editingExam, subject: e.target.value })}
                      >
                        <option>Informatika</option>
                        <option>Pemrograman</option>
                        <option>Jaringan</option>
                      </select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Target Kelas</label>
                        {isAddingNewClass ? (
                          <div className="flex items-center gap-2">
                            <Input 
                              placeholder="Nama kelas baru..." 
                              className="h-7 w-32 text-[10px] py-1 rounded-md"
                              value={newClassName}
                              onChange={e => setNewClassName(e.target.value)}
                              autoFocus
                            />
                            <Button size="sm" className="h-7 px-2 bg-emerald-600" onClick={handleAddNewClass}>Ok</Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-slate-400" onClick={() => setIsAddingNewClass(false)}>X</Button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setIsAddingNewClass(true)}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                          >
                            <Plus size={12} /> Tambah Kelas Baru
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                        {classes.map(c => (
                          <label key={c} className="flex items-center gap-2 cursor-pointer group">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                              (editingExam.targetClasses || []).includes(c) 
                                ? 'bg-indigo-600 border-indigo-600' 
                                : 'bg-white border-slate-300 group-hover:border-indigo-400'
                            }`}>
                              {(editingExam.targetClasses || []).includes(c) && <Check size={12} className="text-white" />}
                              <input 
                                type="checkbox"
                                className="hidden"
                                checked={(editingExam.targetClasses || []).includes(c)}
                                onChange={(e) => {
                                  const current = editingExam.targetClasses || [];
                                  if (e.target.checked) {
                                    setEditingExam({ ...editingExam, targetClasses: [...current, c] });
                                  } else {
                                    setEditingExam({ ...editingExam, targetClasses: current.filter((tc: string) => tc !== c) });
                                  }
                                }}
                              />
                            </div>
                            <span className={`text-sm font-bold ${(editingExam.targetClasses || []).includes(c) ? 'text-indigo-600' : 'text-slate-600'}`}>{c}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Durasi</label>
                      <select 
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        value={editingExam.duration}
                        onChange={e => setEditingExam({ ...editingExam, duration: e.target.value })}
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
                        value={editingExam.columnNumber}
                        onChange={e => setEditingExam({ ...editingExam, columnNumber: parseInt(e.target.value) })}
                      >
                        {[...Array(15)].map((_, i) => (
                          <option key={i+1} value={i+1}>Kolom {i+1}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3 sticky bottom-0 bg-white">
                    <Button 
                      variant="outline" 
                      className="flex-1 h-12 rounded-xl font-bold border-slate-200"
                      onClick={() => {
                        setShowEditModal(false);
                        setEditingExam(null);
                      }}
                    >
                      Batal
                    </Button>
                    <Button 
                      className="flex-1 h-12 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100"
                      onClick={handleUpdateExamData}
                    >
                      <Check className="w-5 h-5 mr-2" /> Simpan Perubahan
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedExam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDetailModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl bg-white rounded-[32px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">{selectedExam.title}</h2>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
                    {selectedExam.subject} • {selectedExam.targetClasses ? selectedExam.targetClasses.join(', ') : selectedExam.targetClass} • {selectedExam.questions?.length || 0} Soal
                  </p>
                </div>
                <button 
                  onClick={() => setShowDetailModal(false)}
                  className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 bg-white">
                <div className="space-y-8">
                  {selectedExam.questions && selectedExam.questions.length > 0 ? (
                    selectedExam.questions.map((q, idx) => (
                      <div key={idx} className="space-y-4">
                        <div className="flex gap-4">
                          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 font-black text-sm">
                            {idx + 1}
                          </div>
                          <p className="text-slate-800 font-bold leading-relaxed pt-1">{q.text}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-12">
                          {q.options.map((opt, oIdx) => (
                            <div 
                              key={oIdx}
                              className={`p-4 rounded-2xl border text-sm transition-all flex items-center gap-3 ${
                                q.correctAnswer === oIdx 
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold shadow-sm shadow-emerald-100' 
                                  : 'bg-white border-slate-100 text-slate-600'
                              }`}
                            >
                              <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${
                                q.correctAnswer === oIdx 
                                  ? 'bg-emerald-500 text-white' 
                                  : 'bg-slate-100 text-slate-400'
                              }`}>
                                {String.fromCharCode(65 + oIdx)}
                              </div>
                              {opt}
                              {q.correctAnswer === oIdx && <Check size={14} className="ml-auto" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-20 border-2 border-dashed border-slate-100 rounded-[32px]">
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <FileText size={32} className="text-slate-200" />
                      </div>
                      <p className="text-slate-400 font-bold">Tidak ada detail soal untuk ujian ini</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                <Button 
                  onClick={() => setShowDetailModal(false)}
                  className="h-12 px-8 rounded-xl font-bold bg-slate-800 hover:bg-black text-white shadow-lg shadow-slate-100"
                >
                  Tutup
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
