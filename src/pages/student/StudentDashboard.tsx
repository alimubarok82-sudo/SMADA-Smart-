import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { CheckCircle, Clock, FileText, MapPin, Trophy, Link as LinkIcon, Image as ImageIcon, Send, Loader2, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { collection, addDoc, serverTimestamp, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submissionType, setSubmissionType] = useState<'link' | 'image'>('link');
  const [submissionTitle, setSubmissionTitle] = useState('');
  const [submissionValue, setSubmissionValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeExams: 0,
    completedExams: 0,
    avgGrade: 0,
    attendance: 100
  });
  const [availableExams, setAvailableExams] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch Active Exams
      const examsSnap = await getDocs(query(collection(db, 'exams'), where('status', '==', 'active')));
      const examsList = examsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // 2. Fetch Completed Exams (Results)
      const resultsSnap = await getDocs(query(collection(db, 'exam_results'), where('studentId', '==', user.uid)));
      const completedExamsCount = resultsSnap.size;
      const completedExamIds = resultsSnap.docs.map(doc => doc.data().examId);

      // Filter exams to show only those not yet completed
      const studentClass = (user as any).classId;
      const filteredExams = examsList.filter(exam => {
        const notCompleted = !completedExamIds.includes(exam.id);
        const isForClass = (exam as any).targetClasses && (exam as any).targetClasses.length > 0
          ? (exam as any).targetClasses.includes(studentClass)
          : (!(exam as any).targetClass || (exam as any).targetClass === studentClass);
        
        return notCompleted && isForClass;
      });
      const activeExamsCount = filteredExams.length;

      // 3. Calculate Average Grade
      const submissionsSnap = await getDocs(query(collection(db, 'submissions'), where('studentId', '==', user.uid), where('status', '==', 'graded')));
      
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

      // 4. Fetch Attendance Status for Today
      const today = new Date().toISOString().split('T')[0];
      const attQ = query(
        collection(db, 'attendance'),
        where('studentId', '==', user.uid),
        where('date', '==', today),
        limit(1)
      );
      const attSnap = await getDocs(attQ);
      const hasCheckedIn = !attSnap.empty;

      setStats({
        activeExams: activeExamsCount,
        completedExams: completedExamsCount,
        avgGrade: parseFloat(avgGrade),
        attendance: hasCheckedIn ? 100 : 0
      });

      setAvailableExams(filteredExams);
    } catch (error) {
      console.error("Error fetching student dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submissionValue.trim() || !user) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'submissions'), {
        studentId: user.uid,
        studentName: user.displayName || 'Anonim',
        title: submissionTitle || 'Tugas Informatika',
        type: submissionType,
        content: submissionValue,
        timestamp: serverTimestamp(),
        status: 'pending',
        classId: (user as any).classId || 'Unknown'
      });
      setSubmissionValue('');
      setSubmissionTitle('');
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    } catch (error) {
      console.error("Error submitting:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const statsList = [
    { title: 'Ujian Aktif', value: stats.activeExams, icon: <FileText className="w-6 h-6" />, containerClass: 'bg-indigo-50 text-indigo-600' },
    { title: 'Ujian Selesai', value: stats.completedExams, icon: <CheckCircle className="w-6 h-6" />, containerClass: 'bg-emerald-50 text-emerald-600' },
    { title: 'Nilai Rata-rata', value: stats.avgGrade, icon: <Trophy className="w-6 h-6" />, containerClass: 'bg-amber-50 text-amber-600' },
    { title: 'Persentase Kehadiran', value: stats.attendance + '%', icon: <Clock className="w-6 h-6" />, containerClass: 'bg-purple-50 text-purple-600' },
  ];

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-12 h-12 animate-spin mb-4 text-indigo-500" />
        <p className="font-bold uppercase tracking-widest text-xs">Memuat Data Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">
        {statsList.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.containerClass}`}>
              {stat.icon}
            </div>
            <div>
              <div className="text-2xl font-black text-slate-800 tracking-tight">{stat.value}</div>
              <div className="text-xs text-slate-400 font-medium">{stat.title}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">Kirim Tugas</h3>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex bg-slate-50 p-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setSubmissionType('link')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                    submissionType === 'link' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'
                  }`}
                >
                  <LinkIcon size={14} /> Link
                </button>
                <button
                  type="button"
                  onClick={() => setSubmissionType('image')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                    submissionType === 'image' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'
                  }`}
                >
                  <ImageIcon size={14} /> Gambar
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                  Judul Tugas
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Jaringan, Algoritma, dll"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                  value={submissionTitle}
                  onChange={(e) => setSubmissionTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                  {submissionType === 'link' ? 'URL Tugas (GitHub/Drive/Grup)' : 'URL Gambar Jawaban'}
                </label>
                <input
                  type="text"
                  placeholder={submissionType === 'link' ? 'https://...' : 'Paste URL gambar...'}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  value={submissionValue}
                  onChange={(e) => setSubmissionValue(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !submissionValue.trim()}
                className={`w-full h-14 rounded-[20px] font-black text-base flex items-center justify-center gap-3 transition-all ${
                  submitted 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-slate-800 hover:bg-black text-white shadow-xl shadow-slate-200 disabled:opacity-50 disabled:grayscale'
                }`}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : submitted ? (
                  <><CheckCircle size={18} /> Berhasil Terkirim</>
                ) : (
                  <><Send size={16} /> Kirim Jawaban</>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">Ujian Tersedia</h3>
            <button className="text-indigo-600 text-xs font-bold" onClick={() => navigate('/dashboard/exams')}>Lihat Semua</button>
          </div>
          <div className="space-y-4">
            {availableExams.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400 font-medium">Belum ada ujian aktif saat ini.</p>
              </div>
            ) : (
              availableExams.map((ujian, i) => (
                <div key={ujian.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                  <div className={`w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold text-sm hidden sm:flex shrink-0`}>
                    {ujian.subject?.substring(0, 3).toUpperCase() || 'EX'}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-slate-700">{ujian.title}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{ujian.subject}</div>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500 font-bold uppercase tracking-wide">
                      <span className="flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-slate-100 shadow-sm"><Clock size={12}/> {ujian.duration}</span>
                      <span className="flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-slate-100 shadow-sm"><FileText size={12}/> {ujian.category}</span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <button 
                      onClick={() => window.location.assign(`/exam/${ujian.id}`)}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold transition-all bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200"
                    >
                      Kerjakan
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
