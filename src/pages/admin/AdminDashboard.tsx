import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BookOpen, CheckCircle, FileText, Users, GraduationCap, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';

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

  useEffect(() => {
    fetchDashboardStats();
  }, []);

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
    </div>
  );
}
