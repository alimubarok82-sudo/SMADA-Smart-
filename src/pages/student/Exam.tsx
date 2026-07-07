import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { CheckCircle, ChevronLeft, ChevronRight, Clock, Maximize, Minimize, Loader2, BarChart3, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';

const mockQuestions = [
  { id: 1, type: 'pg', question: 'Siapakah presiden pertama Indonesia?', options: ['Soekarno', 'Soeharto', 'Habibie', 'Gus Dur'] },
  { id: 2, type: 'pg', question: 'Ibukota negara Jepang adalah?', options: ['Seoul', 'Beijing', 'Tokyo', 'Kyoto'] },
  { id: 3, type: 'essay', question: 'Jelaskan penyebab terjadinya Perang Dunia II secara singkat!' },
  { id: 4, type: 'tf', question: 'Bumi itu bulat.', options: ['Benar', 'Salah'] },
];

export default function ExamPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [examMetadata, setExamMetadata] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [timeLeft, setTimeLeft] = useState(5400); // 90 mins default
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [violations, setViolations] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const MAX_VIOLATIONS = 3;

  useEffect(() => {
    if (loading || isSubmitted || isSubmitting) return;

    const handleViolation = async () => {
      if (showWarning || isSubmitted || isSubmitting) return;
      
      const newCount = violations + 1;
      setViolations(newCount);
      
      // Log violation activity to Firestore
      if (user && id) {
        try {
          await addDoc(collection(db, 'exam_logs'), {
            examId: id,
            examTitle: examMetadata?.title || 'Ujian',
            studentId: user.uid,
            studentName: user.displayName || 'Siswa',
            timestamp: serverTimestamp(),
            violationNumber: newCount,
            type: 'screen_leave_detected',
            classId: (user as any).classId || 'Unknown'
          });
        } catch (err) {
          console.error("Error logging activity:", err);
        }
      }

      if (newCount >= MAX_VIOLATIONS) {
        handleSubmit(newCount);
        return;
      }
      setShowWarning(true);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation();
      }
    };

    const handleBlur = () => {
      handleViolation();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [loading, isSubmitted, isSubmitting, showWarning, violations, user, id, examMetadata]);

  useEffect(() => {
    if (id) {
      fetchExamData();
    }
  }, [id]);

  const fetchExamData = async () => {
    try {
      // Check if already submitted
      if (user) {
        const { getDocs, query, where, collection, limit } = await import('firebase/firestore');
        const q = query(
          collection(db, 'exam_results'), 
          where('examId', '==', id), 
          where('studentId', '==', user.uid),
          limit(1)
        );
        const resultsSnap = await getDocs(q);
        if (!resultsSnap.empty) {
          alert('Anda sudah mengerjakan ujian ini.');
          navigate('/dashboard');
          return;
        }
      }

      const docSnap = await getDoc(doc(db, 'exams', id!));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setExamMetadata(data);
        setQuestions(data.questions || []);
        
        // Set duration from metadata if available
        if (data.duration) {
          const mins = parseInt(data.duration);
          if (!isNaN(mins)) setTimeLeft(mins * 60);
        }
      }
    } catch (error) {
      console.error("Error fetching exam:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loading || isSubmitted) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, isSubmitted]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.log(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleAnswer = (val: any) => {
    setAnswers(prev => ({ ...prev, [currentQ]: val }));
  };

  const handleSubmit = async (finalViolations?: number) => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      if(document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {});
      }
    } catch (e) {}
    
    // Real scoring logic
    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (answers[idx] === q.correctAnswer) {
        correctCount++;
      }
    });

    const totalQuestions = questions.length;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const vCount = finalViolations !== undefined ? finalViolations : violations;

    try {
      await addDoc(collection(db, 'exam_results'), {
        studentId: user.uid,
        studentName: user.displayName || 'Anonim',
        examId: id,
        examTitle: examMetadata?.title || 'Ujian',
        score,
        correctCount,
        totalQuestions,
        answers,
        violations: vCount,
        timestamp: serverTimestamp(),
        classId: (user as any).classId || 'Unknown',
        columnNumber: examMetadata?.columnNumber || 1,
        category: examMetadata?.category || 'formatif'
      });
      setIsSubmitted(true);
    } catch (error) {
      console.error("Error submitting exam:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" /></div>;
  
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md">
          <Card className="text-center shadow-xl rounded-3xl border-none">
            <CardContent className="p-8 space-y-6">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle size={40} className="text-emerald-600" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-800">Ujian Selesai!</h2>
                <p className="text-slate-500 mt-2 font-medium">Jawaban Anda berhasil disimpan ke server.</p>
              </div>
              <Button 
                className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg shadow-xl" 
                onClick={() => navigate('/dashboard')}
              >
                Kembali ke Dashboard
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  const question = questions[currentQ];

  if (!question) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-800">Ujian ini belum memiliki soal.</h2>
          <Button 
            onClick={() => navigate('/dashboard')} 
            className="mt-6 h-14 px-10 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg shadow-xl shadow-indigo-100"
          >
            Kembali ke Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <AnimatePresence>
        {showWarning && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-rose-950/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl border-4 border-rose-500"
            >
              <div className="p-10 flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mb-8">
                  <ShieldAlert size={48} className="text-rose-500" />
                </div>
                
                <h3 className="text-3xl font-black text-rose-600 mb-4 tracking-tight">Peringatan Keras!</h3>
                <p className="text-slate-600 font-bold leading-relaxed mb-2">
                  Anda terdeteksi meninggalkan layar ujian.
                </p>
                <p className="text-slate-400 text-xs font-medium mb-8">
                  (Membuka tab lain/aplikasi lain/kehilangan fokus)
                </p>

                <div className="w-full bg-rose-50 rounded-2xl p-6 mb-8 border border-rose-100">
                  <span className="text-xs font-black text-rose-800 uppercase tracking-widest block mb-2">Status Pelanggaran</span>
                  <div className="text-5xl font-black text-rose-600">
                    {violations} <span className="text-rose-300">/</span> {MAX_VIOLATIONS}
                  </div>
                </div>

                <Button 
                  onClick={() => setShowWarning(false)}
                  className="w-full h-14 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-lg shadow-lg shadow-rose-200"
                >
                  Saya Mengerti & Kembali
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Topbar */}
      <header className="h-16 bg-white border-b shadow-sm flex items-center justify-between px-6 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <h1 className="font-bold text-lg text-slate-800 hidden md:block">{examMetadata?.title}</h1>
          <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
            {examMetadata?.subject}
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-700 rounded-xl font-mono text-xl font-black">
            <Clock size={20} />
            {formatTime(timeLeft)}
          </div>
          <button onClick={toggleFullscreen} className="text-slate-400 hover:text-slate-900 hidden md:block">
            {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col lg:flex-row gap-6">
        {/* Main Exam Area */}
        <div className="flex-1 flex flex-col gap-4">
          <Card className="flex-1 shadow-sm border-0 bg-white rounded-3xl overflow-hidden">
            <CardContent className="p-8">
              <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">
                <span>Soal No. {currentQ + 1} dari {questions.length}</span>
                <span className="text-indigo-600">Terpantau</span>
              </div>
              
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-8 leading-relaxed whitespace-pre-wrap">
                {question.text}
              </h2>

              <div className="space-y-3">
                {question.options?.map((opt: string, i: number) => (
                  <label 
                    key={i} 
                    className={`flex items-center gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                      answers[currentQ] === i 
                        ? 'border-indigo-600 bg-indigo-50' 
                        : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name={`q-${currentQ}`} 
                      value={i}
                      checked={answers[currentQ] === i}
                      onChange={() => handleAnswer(i)}
                      className="w-5 h-5 text-indigo-600"
                    />
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold ${
                        answers[currentQ] === i ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="text-lg font-medium text-slate-700">{opt}</span>
                    </div>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between items-center px-2 py-4">
            <Button 
              variant="outline" 
              size="lg" 
              className="h-14 px-6 rounded-2xl font-bold text-slate-600 border-slate-200"
              onClick={() => setCurrentQ(prev => Math.max(0, prev - 1))}
              disabled={currentQ === 0}
            >
              <ChevronLeft className="mr-2" /> Sebelumnya
            </Button>
            
            {currentQ === questions.length - 1 ? (
              <Button 
                size="lg" 
                className="h-14 rounded-2xl px-10 font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-200 text-lg" 
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? <><Loader2 className="animate-spin mr-2" /> Memproses...</> : <>Kirim Ujian <CheckCircle className="ml-2" size={20} /></>}
              </Button>
            ) : (
              <Button 
                size="lg" 
                className="h-14 rounded-2xl px-10 font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-200 text-lg"
                onClick={() => setCurrentQ(prev => Math.min(questions.length - 1, prev + 1))}
              >
                Selanjutnya <ChevronRight className="ml-2" />
              </Button>
            )}
          </div>
        </div>

        {/* Sidebar Nav */}
        <div className="w-full lg:w-72 shrink-0">
          <Card className="shadow-sm border-0 sticky top-24 rounded-3xl overflow-hidden">
            <CardContent className="p-6">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <BarChart3 size={18} className="text-indigo-500" /> Navigasi Soal
              </h3>
              <div className="grid grid-cols-5 gap-2">
                {questions.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentQ(i)}
                    className={`h-12 rounded-2xl text-sm font-black transition-all ${
                      currentQ === i 
                        ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-110 z-10' 
                        : answers[i] !== undefined
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                          : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-100'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <div className="mt-8 space-y-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-emerald-100 border border-emerald-200 rounded"></div>
                  <span>Sudah Dijawab</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-indigo-600 rounded shadow-sm"></div>
                  <span>Posisi Saat Ini</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-white border border-slate-100 rounded"></div>
                  <span>Belum Dijawab</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
