import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { CheckCircle, ChevronLeft, ChevronRight, Clock, Maximize, Minimize } from 'lucide-react';
import { motion } from 'motion/react';

const mockQuestions = [
  { id: 1, type: 'pg', question: 'Siapakah presiden pertama Indonesia?', options: ['Soekarno', 'Soeharto', 'Habibie', 'Gus Dur'] },
  { id: 2, type: 'pg', question: 'Ibukota negara Jepang adalah?', options: ['Seoul', 'Beijing', 'Tokyo', 'Kyoto'] },
  { id: 3, type: 'essay', question: 'Jelaskan penyebab terjadinya Perang Dunia II secara singkat!' },
  { id: 4, type: 'tf', question: 'Bumi itu bulat.', options: ['Benar', 'Salah'] },
];

export default function ExamPage() {
  const navigate = useNavigate();
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(5400); // 90 mins
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
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
  }, []);

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

  const handleAnswer = (val: string) => {
    setAnswers(prev => ({ ...prev, [currentQ]: val }));
  };

  const handleSubmit = () => {
    if(document.fullscreenElement) document.exitFullscreen();
    setIsSubmitted(true);
  };

  const question = mockQuestions[currentQ];

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md">
          <Card className="text-center shadow-xl">
            <CardContent className="p-8 space-y-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle size={40} className="text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Ujian Selesai!</h2>
                <p className="text-slate-500 mt-2">Jawaban Anda berhasil disimpan ke server.</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nilai Pilihan Ganda</span>
                  <span className="font-bold text-slate-900">85/100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nilai Essay</span>
                  <span className="text-blue-600 text-sm font-medium">Menunggu Koreksi Guru</span>
                </div>
              </div>
              <Button className="w-full bg-blue-600" onClick={() => navigate('/dashboard')}>
                Kembali ke Dashboard
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Topbar */}
      <header className="h-16 bg-white border-b shadow-sm flex items-center justify-between px-6 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <h1 className="font-bold text-lg text-slate-800 hidden md:block">Ujian Akhir Semester: Matematika</h1>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg font-mono text-xl font-bold">
            <Clock size={20} />
            {formatTime(timeLeft)}
          </div>
          <button onClick={toggleFullscreen} className="text-slate-500 hover:text-slate-900 hidden md:block">
            {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col lg:flex-row gap-6">
        {/* Main Exam Area */}
        <div className="flex-1 flex flex-col gap-4">
          <Card className="flex-1 shadow-sm border-0 bg-white">
            <CardContent className="p-8">
              <div className="flex justify-between text-sm font-medium text-slate-500 mb-6">
                <span>Soal No. {currentQ + 1}</span>
                <span className="text-blue-600">Auto-saved 2s ago</span>
              </div>
              
              <h2 className="text-xl md:text-2xl text-slate-900 mb-8 leading-relaxed">
                {question.question}
              </h2>

              <div className="space-y-3">
                {question.type === 'pg' || question.type === 'tf' ? (
                  question.options?.map((opt, i) => (
                    <label 
                      key={i} 
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        answers[currentQ] === opt 
                          ? 'border-blue-600 bg-blue-50' 
                          : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name={`q-${currentQ}`} 
                        value={opt}
                        checked={answers[currentQ] === opt}
                        onChange={() => handleAnswer(opt)}
                        className="w-5 h-5 text-blue-600"
                      />
                      <span className="text-lg text-slate-700">{opt}</span>
                    </label>
                  ))
                ) : (
                  <textarea 
                    className="w-full h-48 p-4 rounded-xl border-2 border-slate-200 focus:border-blue-600 focus:ring-0 resize-none text-lg"
                    placeholder="Ketik jawaban Anda di sini..."
                    value={answers[currentQ] || ''}
                    onChange={(e) => handleAnswer(e.target.value)}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <Button 
              variant="outline" 
              size="lg" 
              onClick={() => setCurrentQ(prev => Math.max(0, prev - 1))}
              disabled={currentQ === 0}
            >
              <ChevronLeft className="mr-2" /> Sebelumnya
            </Button>
            
            {currentQ === mockQuestions.length - 1 ? (
              <Button size="lg" className="bg-green-600 hover:bg-green-700" onClick={handleSubmit}>
                Submit Ujian <CheckCircle className="ml-2" size={18} />
              </Button>
            ) : (
              <Button 
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => setCurrentQ(prev => Math.min(mockQuestions.length - 1, prev + 1))}
              >
                Selanjutnya <ChevronRight className="ml-2" />
              </Button>
            )}
          </div>
        </div>

        {/* Sidebar Nav */}
        <div className="w-full lg:w-72 shrink-0">
          <Card className="shadow-sm border-0 sticky top-24">
            <CardContent className="p-6">
              <h3 className="font-semibold text-slate-800 mb-4">Navigasi Soal</h3>
              <div className="grid grid-cols-5 gap-2">
                {mockQuestions.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentQ(i)}
                    className={`h-10 rounded-lg text-sm font-medium transition-colors ${
                      currentQ === i 
                        ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2' 
                        : answers[i] 
                          ? 'bg-green-100 text-green-700 border border-green-200' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <div className="mt-8 space-y-3 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div>
                  <span>Sudah Dijawab</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-600 rounded"></div>
                  <span>Posisi Saat Ini</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-slate-100 border border-slate-200 rounded"></div>
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
