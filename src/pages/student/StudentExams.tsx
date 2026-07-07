import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent } from '../../components/ui/card';
import { FileText, Clock, BarChart3, Loader2, Search, ChevronRight } from 'lucide-react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { motion } from 'motion/react';

export default function StudentExams() {
  const { user } = useAuth();
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const studentClass = (user as any).classId;
      let q = query(collection(db, 'exams'), where('status', '==', 'active'), orderBy('title'));
      
      const snap = await getDocs(q);
      const allActiveExams = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter by class client-side or use another query if targetClass is set
      const filteredByClass = allActiveExams.filter((exam: any) => {
        if (exam.targetClasses && exam.targetClasses.length > 0) {
          return exam.targetClasses.includes(studentClass);
        }
        return !exam.targetClass || exam.targetClass === studentClass;
      });
      
      setExams(filteredByClass);
    } catch (error) {
      console.error("Error fetching exams:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredExams = exams.filter(exam => 
    exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exam.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-12 h-12 animate-spin mb-4 text-indigo-500" />
        <p className="font-bold uppercase tracking-widest text-xs">Memuat Daftar Ujian...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Daftar Ujian Aktif</h2>
          <p className="text-slate-500 text-sm font-medium mt-1">Silahkan pilih ujian yang ingin Anda kerjakan.</p>
        </div>
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            placeholder="Cari ujian..."
            className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all w-full md:w-64"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredExams.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Tidak ada ujian aktif</h3>
          <p className="text-slate-400 text-sm mt-1">Kembali lagi nanti saat guru sudah mengaktifkan ujian.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.map((exam) => (
            <motion.div
              key={exam.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -4 }}
              className="group"
            >
              <Card className="rounded-3xl border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all bg-white overflow-hidden h-full flex flex-col">
                <CardContent className="p-0 flex flex-col h-full">
                  <div className="p-6 pb-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0">
                        {exam.subject?.substring(0, 3).toUpperCase() || 'EX'}
                      </div>
                      <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        Tersedia
                      </div>
                    </div>
                    <h4 className="text-lg font-black text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-2 min-h-[3.5rem] leading-tight">
                      {exam.title}
                    </h4>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">{exam.subject}</p>
                  </div>
                  
                  <div className="px-6 py-4 bg-slate-50 flex items-center justify-between border-t border-slate-100 mt-auto">
                    <div className="flex items-center gap-4 text-[10px] text-slate-500 font-black uppercase tracking-widest">
                      <span className="flex items-center gap-1.5"><Clock size={14} className="text-indigo-400"/> {exam.duration}</span>
                    </div>
                    <button 
                      onClick={() => window.location.assign(`/exam/${exam.id}`)}
                      className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-black shadow-xl shadow-indigo-100 transition-all flex items-center gap-2"
                    >
                      Mulai <ChevronRight size={16} />
                    </button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
