import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Search, Filter, ExternalLink, Image as ImageIcon, Link as LinkIcon, CheckCircle2, Clock, Trash2, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface Submission {
  id: string;
  studentId: string;
  studentName: string;
  type: 'link' | 'image';
  content: string;
  timestamp: any;
  status: 'pending' | 'graded';
  classId: string;
}

export default function Submissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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
      })) as Submission[];
      setSubmissions(data);
    } catch (error) {
      console.error("Error fetching submissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus jawaban ini?')) return;
    try {
      await deleteDoc(doc(db, 'submissions', id));
      setSubmissions(submissions.filter(s => s.id !== id));
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const handleGrade = async (id: string) => {
    try {
      await updateDoc(doc(db, 'submissions', id), { status: 'graded' });
      setSubmissions(submissions.map(s => s.id === id ? { ...s, status: 'graded' } : s));
    } catch (error) {
      console.error("Error grading:", error);
    }
  };

  const filtered = submissions.filter(s => 
    s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.classId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Jawaban & Tugas Siswa</h2>
          <p className="text-slate-500 text-sm">Lihat hasil pengiriman link atau gambar dari siswa</p>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white p-2 rounded-[24px] border border-slate-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text"
            placeholder="Cari nama siswa atau kelas..."
            className="w-full h-12 pl-11 pr-4 bg-transparent text-sm focus:outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" className="h-10 rounded-xl border-slate-200">
          <Filter className="w-4 h-4 mr-2" /> Filter
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {loading ? (
            <div className="col-span-full py-20 text-center text-slate-400 font-medium">Memuat data...</div>
          ) : filtered.length === 0 ? (
            <div className="col-span-full py-20 text-center text-slate-400 font-medium">Belum ada pengiriman jawaban</div>
          ) : (
            filtered.map((sub, i) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="rounded-[32px] border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                          <User size={20} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-800 truncate max-w-[150px]">{sub.studentName}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{sub.classId}</div>
                        </div>
                      </div>
                      {sub.status === 'pending' ? (
                        <div className="px-2 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-bold flex items-center gap-1">
                          <Clock size={12} /> PENDING
                        </div>
                      ) : (
                        <div className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold flex items-center gap-1">
                          <CheckCircle2 size={12} /> GRADED
                        </div>
                      )}
                    </div>

                    <div className="aspect-video bg-slate-50 rounded-2xl mb-4 flex items-center justify-center border border-slate-100 overflow-hidden">
                      {sub.type === 'image' ? (
                        <img 
                          src={sub.content} 
                          alt="Jawaban Siswa" 
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => window.open(sub.content, '_blank')}
                          onError={(e) => {
                            (e.target as any).src = 'https://placehold.co/600x400?text=Format+Salah';
                          }}
                        />
                      ) : (
                        <div className="text-center p-4">
                          <LinkIcon size={32} className="text-indigo-400 mx-auto mb-2" />
                          <div className="text-[10px] text-slate-400 font-medium break-all">{sub.content}</div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {sub.type === 'link' ? (
                        <Button 
                          onClick={() => window.open(sub.content, '_blank')}
                          className="flex-1 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                        >
                          <ExternalLink size={14} className="mr-2" /> Buka Link
                        </Button>
                      ) : (
                        <Button 
                          onClick={() => window.open(sub.content, '_blank')}
                          className="flex-1 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                        >
                          <ImageIcon size={14} className="mr-2" /> Lihat Full
                        </Button>
                      )}
                      
                      {sub.status === 'pending' && (
                        <Button 
                          onClick={() => handleGrade(sub.id)}
                          variant="outline"
                          className="w-10 h-10 p-0 rounded-xl border-slate-200 text-emerald-600 hover:bg-emerald-50"
                        >
                          <CheckCircle2 size={18} />
                        </Button>
                      )}
                      
                      <Button 
                        onClick={() => handleDelete(sub.id)}
                        variant="outline"
                        className="w-10 h-10 p-0 rounded-xl border-slate-200 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
