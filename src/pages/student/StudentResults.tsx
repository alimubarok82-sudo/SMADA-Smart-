import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent } from '../../components/ui/card';
import { CheckCircle, Clock, Trophy, Loader2, Search, FileText } from 'lucide-react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { motion } from 'motion/react';

export default function StudentResults() {
  const { user } = useAuth();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      fetchResults();
    }
  }, [user]);

  const fetchResults = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'exam_results'), 
        where('studentId', '==', user.uid),
        orderBy('timestamp', 'desc')
      );
      const snap = await getDocs(q);
      setResults(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error fetching exam results:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = results.filter(res => 
    res.examTitle?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-12 h-12 animate-spin mb-4 text-indigo-500" />
        <p className="font-bold uppercase tracking-widest text-xs">Memuat Riwayat Ujian...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Riwayat Jawaban Terkirim</h2>
          <p className="text-slate-500 text-sm font-medium mt-1">Daftar ujian yang telah Anda selesaikan.</p>
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

      {filteredResults.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Belum ada jawaban terkirim</h3>
          <p className="text-slate-400 text-sm mt-1">Selesaikan ujian pertama Anda untuk melihat riwayat di sini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResults.map((result) => (
            <motion.div
              key={result.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -4 }}
              className="group"
            >
              <Card className="rounded-3xl border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all bg-white overflow-hidden h-full flex flex-col">
                <CardContent className="p-0 flex flex-col h-full">
                  <div className="p-6 pb-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0">
                        <CheckCircle size={24} />
                      </div>
                      <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        Terkirim
                      </div>
                    </div>
                    <h4 className="text-lg font-black text-slate-800 line-clamp-2 min-h-[3.5rem] leading-tight">
                      {result.examTitle}
                    </h4>
                    <div className="flex items-center gap-2 mt-2 text-slate-400">
                      <Clock size={12} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                        {result.timestamp?.toDate ? result.timestamp.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Baru saja'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="px-6 py-4 bg-slate-50 flex items-center justify-between border-t border-slate-100 mt-auto">
                    <div className="flex items-center gap-2">
                      <Trophy size={16} className="text-amber-500" />
                      <span className="text-xl font-black text-slate-800">{result.score}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Poin</span>
                    </div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white px-3 py-1 rounded-lg border border-slate-100 shadow-sm">
                      {result.correctCount} / {result.totalQuestions} Benar
                    </div>
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
