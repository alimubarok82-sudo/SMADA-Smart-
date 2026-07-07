import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { 
  BarChart3, 
  ChevronLeft, 
  Download, 
  Search, 
  ShieldAlert, 
  Trash2, 
  RotateCcw,
  Users,
  Trophy,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  deleteDoc, 
  doc,
  getDoc 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function ExamResults() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Exam Info
      const examSnap = await getDoc(doc(db, 'exams', id!));
      if (examSnap.exists()) {
        setExam({ id: examSnap.id, ...examSnap.data() });
      }

      // 2. Fetch Results
      const q = query(
        collection(db, 'exam_results'),
        where('examId', '==', id),
        orderBy('timestamp', 'desc')
      );
      const resultsSnap = await getDocs(q);
      setResults(resultsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteResult = async (resultId: string) => {
    if (!confirm('Hapus nilai siswa ini? Siswa akan bisa mengerjakan ulang ujian ini.')) return;
    try {
      await deleteDoc(doc(db, 'exam_results', resultId));
      setResults(results.filter(r => r.id !== resultId));
    } catch (error) {
      console.error("Error deleting result:", error);
    }
  };

  const filteredResults = results.filter(r => 
    r.studentName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-12 h-12 animate-spin mb-4 text-indigo-500" />
        <p className="font-bold uppercase tracking-widest text-xs">Memuat Hasil Ujian...</p>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="text-center py-20">
        <AlertCircle size={48} className="mx-auto text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Ujian tidak ditemukan</h2>
        <Button onClick={() => navigate('/dashboard/exams')} className="mt-4">Kembali ke Daftar Ujian</Button>
      </div>
    );
  }

  const avgScore = results.length > 0 
    ? Math.round(results.reduce((acc, curr) => acc + (curr.score || 0), 0) / results.length) 
    : 0;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/dashboard/exams')}
            className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold uppercase tracking-wider">{exam.subject}</span>
              <span className="text-slate-300 text-xs">•</span>
              <span className="text-slate-400 text-xs font-medium">{exam.date}</span>
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">{exam.title}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-12 rounded-xl border-slate-200 bg-white font-bold text-slate-600 px-6">
            <Download size={18} className="mr-2" /> Export Excel
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-3xl border-slate-100 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
              <Users size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Peserta</p>
              <h3 className="text-2xl font-black text-slate-800">{results.length} Siswa</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-slate-100 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
              <Trophy size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rata-rata Nilai</p>
              <h3 className="text-2xl font-black text-slate-800">{avgScore} Poin</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-slate-100 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
              <BarChart3 size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tingkat Kelulusan</p>
              <h3 className="text-2xl font-black text-slate-800">
                {results.length > 0 
                  ? Math.round((results.filter(r => r.score >= 75).length / results.length) * 100) 
                  : 0}%
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Table */}
      <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden bg-white">
        <CardHeader className="bg-white border-b border-slate-50 flex flex-row items-center justify-between py-6 px-8">
          <CardTitle className="text-lg font-bold text-slate-800">Daftar Nilai Siswa</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Cari nama siswa..." 
              className="w-full pl-10 h-10 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-50">
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">No</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Siswa</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kelas</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Benar</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Nilai</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredResults.map((result, idx) => (
                  <tr key={result.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-4">
                      <span className="text-xs font-bold text-slate-400">{idx + 1}</span>
                    </td>
                    <td className="px-8 py-4">
                      <div className="text-sm font-bold text-slate-700">{result.studentName}</div>
                    </td>
                    <td className="px-8 py-4">
                      <div className="text-xs font-bold text-slate-500 uppercase">{result.classId}</div>
                    </td>
                    <td className="px-8 py-4 text-center">
                      <div className="text-xs font-bold text-slate-600">
                        {result.correctCount} <span className="text-slate-300">/</span> {result.totalQuestions}
                      </div>
                    </td>
                    <td className="px-8 py-4 text-center">
                      <div className={`text-lg font-black ${result.score >= 75 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {result.score}
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex flex-col gap-1">
                        {result.score >= 75 ? (
                          <span className="w-fit px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-wider">Lulus</span>
                        ) : (
                          <span className="w-fit px-2.5 py-1 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black uppercase tracking-wider">Remedial</span>
                        )}
                        {result.violations > 0 && (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-rose-50 text-rose-600 rounded border border-rose-100 text-[9px] font-black uppercase tracking-widest w-fit">
                            <ShieldAlert size={10} />
                            {result.violations}x Curang
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 text-amber-500 hover:bg-amber-50 rounded-xl transition-colors" title="Reset Ujian">
                          <RotateCcw size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteResult(result.id)}
                          className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors" 
                          title="Hapus Nilai"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredResults.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-8 py-16 text-center">
                      <p className="text-sm text-slate-400 font-medium italic">
                        {searchTerm ? 'Siswa tidak ditemukan' : 'Belum ada siswa yang menyelesaikan ujian ini'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
