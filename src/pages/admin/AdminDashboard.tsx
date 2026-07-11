import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BookOpen, CheckCircle, FileText, Users, GraduationCap, Loader2, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { collection, getDocs, query, where, orderBy, limit, onSnapshot, deleteDoc, doc as firestoreDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Trash2, Edit2, RotateCcw, ShieldAlert, AlertCircle } from 'lucide-react';

const data = [
  { name: 'Sen', aktif: 45 },
  { name: 'Sel', aktif: 52 },
  { name: 'Rab', aktif: 48 },
  { name: 'Kam', aktif: 70 },
  { name: 'Jum', aktif: 61 },
  { name: 'Sab', aktif: 55 },
];

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState({
    totalStudents: 0,
    activeExams: 0,
    totalClasses: 0,
    avgGrade: 0
  });
  const [recentResults, setRecentResults] = useState<any[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [exams, setExams] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState('Semua Kelas');
  const [selectedExam, setSelectedExam] = useState('Semua Ujian');
  const [nameSearch, setNameSearch] = useState('');

  useEffect(() => {
    fetchDashboardStats();
    
    // Ambil daftar kelas secara menyeluruh
    const fetchClasses = async () => {
      try {
        const snap = await getDocs(collection(db, 'classes'));
        const classNames = snap.docs.map(d => d.data().name).filter(Boolean);
        
        // Juga cek dari data nilai yang sudah ada
        const resultsSnap = await getDocs(query(collection(db, 'exam_results'), limit(100)));
        const resultClasses = resultsSnap.docs.map(d => d.data().classId).filter(Boolean);
        const resultExams = resultsSnap.docs.map(d => d.data().examTitle).filter(Boolean);
        
        const combinedClasses = Array.from(new Set([...classNames, ...resultClasses]))
          .filter(Boolean)
          .sort();
        
        setClasses(combinedClasses as string[]);
        setExams(Array.from(new Set(resultExams as string[])).sort());
      } catch (err) {
        console.error(err);
      }
    };
    fetchClasses();
  }, []);

  // Update listener real-time berdasarkan pilihan kelas dan ujian
  useEffect(() => {
    let q = query(
      collection(db, 'exam_results'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const conditions = [];
    if (selectedClass !== 'Semua Kelas') {
      conditions.push(where('classId', '==', selectedClass));
    }
    if (selectedExam !== 'Semua Ujian') {
      conditions.push(where('examTitle', '==', selectedExam));
    }

    if (conditions.length > 0) {
      q = query(
        collection(db, 'exam_results'),
        ...conditions,
        orderBy('timestamp', 'desc'),
        limit(100)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecentResults(results);
    });

    return () => unsubscribe();
  }, [selectedClass, selectedExam]);

  const filteredResults = recentResults.filter(r => 
    r.studentName?.toLowerCase().includes(nameSearch.toLowerCase())
  );

  const handleDeleteResult = async (id: string) => {
    if (!confirm('Hapus data nilai ini? Siswa akan bisa mengerjakan ulang ujian ini setelah datanya dihapus.')) return;
    try {
      await deleteDoc(firestoreDoc(db, 'exam_results', id));
    } catch (error) {
      console.error("Error deleting result:", error);
    }
  };

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      // 1. Total Students (Deduplicated by name and class)
      const studentsSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'siswa')));
      const uniqueStudentNames = new Set();
      studentsSnap.docs.forEach(d => {
        const data = d.data();
        uniqueStudentNames.add(`${data.displayName}-${data.classId}`);
      });
      const totalStudents = uniqueStudentNames.size;

      // 2. Active Exams
      const examsSnap = await getDocs(query(collection(db, 'exams'), where('status', '==', 'active')));
      const activeExams = examsSnap.size;

      // 3. Total Classes (From collection and students)
      const classesSnap = await getDocs(collection(db, 'classes'));
      const classNames = new Set(classesSnap.docs.map(d => d.data().name));
      studentsSnap.docs.forEach(d => {
        const cId = d.data().classId;
        if (cId) classNames.add(cId);
      });
      const totalClasses = classNames.size;

      // 4. Avg Grade
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

      const avgGrade = totalCount > 0 ? Math.round(totalPoints / totalCount) : 0;

      setDashboardStats({
        totalStudents,
        activeExams,
        totalClasses,
        avgGrade
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { title: 'Total Siswa', value: dashboardStats.totalStudents, icon: <Users className="w-6 h-6" />, containerClass: 'bg-indigo-50 text-indigo-600' },
    { title: 'Ujian Aktif', value: dashboardStats.activeExams, icon: <FileText className="w-6 h-6" />, containerClass: 'bg-purple-50 text-purple-600' },
    { title: 'Total Kelas', value: dashboardStats.totalClasses, icon: <GraduationCap className="w-6 h-6" />, containerClass: 'bg-emerald-50 text-emerald-600' },
    { title: 'Rata-rata Nilai', value: dashboardStats.avgGrade, icon: <BookOpen className="w-6 h-6" />, containerClass: 'bg-amber-50 text-amber-600' },
  ];

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-12 h-12 animate-spin mb-4 text-indigo-500" />
        <p className="font-bold uppercase tracking-widest text-xs">Memperbarui Statistik...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">
        {stats.map((stat, i) => (
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
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Analisis Keaktifan Siswa</h3>
              <p className="text-xs text-slate-400">Statistik mingguan pengerjaan ujian online</p>
            </div>
          </div>
          
          <div className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAktif" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '12px' }}
                    itemStyle={{ color: '#1e293b', fontWeight: 600 }}
                  />
                  <Area type="monotone" dataKey="aktif" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorAktif)" />
                </AreaChart>
              </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">Info Sistem</h3>
            <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md text-[10px] font-bold">ONLINE</span>
          </div>
          <div className="space-y-4">
            {[
              { title: 'Server Status', desc: 'Database Terhubung (Firebase)', color: 'bg-emerald-500', code: 'DB' },
              { title: 'Sistem Ujian', desc: 'Auto-scoring Aktif', color: 'bg-indigo-500', code: 'AI' },
              { title: 'Sinkronisasi', desc: 'Real-time Updates On', color: 'bg-amber-500', code: 'SYNC' },
            ].map((activity, i) => (
              <div key={i} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center space-x-3">
                <div className={`w-10 h-10 ${activity.color} text-white rounded-xl flex items-center justify-center font-bold text-xs shrink-0`}>
                  {activity.code}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-slate-700">{activity.title}</div>
                  <div className="text-[10px] text-slate-400">{activity.desc}</div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-auto pt-6">
            <p className="text-[10px] text-slate-400 italic mb-4 text-center">Dashboard ini menampilkan data real-time dari aktivitas siswa dan guru di platform.</p>
          </div>
        </div>
      </div>

      {/* Daftar Nilai Masuk */}
      <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden bg-white">
        <CardHeader className="bg-white border-b border-slate-50 flex flex-col md:flex-row items-start md:items-center justify-between py-4 px-6 gap-4">
          <CardTitle className="text-lg font-bold text-slate-800">Daftar Nilai Masuk</CardTitle>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder="Cari nama..." 
                className="w-full pl-9 h-9 text-[10px] font-bold border-slate-200 rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 uppercase tracking-widest text-slate-600"
                value={nameSearch}
                onChange={(e) => setNameSearch(e.target.value)}
              />
            </div>
            <select 
              className="text-[10px] font-bold border-slate-200 rounded-lg bg-slate-50 px-3 py-1.5 h-9 outline-none focus:ring-2 focus:ring-indigo-500 uppercase tracking-widest text-slate-500"
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
            >
              <option>Semua Ujian</option>
              {exams.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <select 
              className="text-[10px] font-bold border-slate-200 rounded-lg bg-slate-50 px-3 py-1.5 h-9 outline-none focus:ring-2 focus:ring-indigo-500 uppercase tracking-widest text-slate-500"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option>Semua Kelas</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-50">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kelas</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ujian</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Nilai</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredResults.map((result) => (
                  <tr key={result.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-slate-700">{result.studentName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-bold text-slate-500">{result.classId}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-medium text-slate-600 line-clamp-1">{result.examTitle}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-sm font-black text-slate-800">{result.score}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {result.score >= 75 ? (
                          <span className="w-fit px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[10px] font-bold">Lulus</span>
                        ) : (
                          <span className="w-fit px-2 py-0.5 bg-rose-50 text-rose-600 rounded text-[10px] font-bold">Remedial</span>
                        )}
                        {result.violations > 0 && (
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-600 rounded border border-rose-100 text-[10px] font-bold w-fit">
                            <ShieldAlert size={10} />
                            {result.violations}x Curang
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors" title="Reset">
                          <RotateCcw size={16} />
                        </button>
                        <button className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit">
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteResult(result.id)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" 
                          title="Hapus"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {recentResults.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <p className="text-sm text-slate-400 font-medium italic">Belum ada nilai yang masuk hari ini</p>
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
