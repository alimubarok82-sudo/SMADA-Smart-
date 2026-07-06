import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BookOpen, CheckCircle, FileText, Users } from 'lucide-react';
import { motion } from 'motion/react';

const data = [
  { name: 'Sen', hadir: 980, alpha: 20 },
  { name: 'Sel', hadir: 975, alpha: 25 },
  { name: 'Rab', hadir: 990, alpha: 10 },
  { name: 'Kam', hadir: 960, alpha: 40 },
  { name: 'Jum', hadir: 985, alpha: 15 },
  { name: 'Sab', hadir: 995, alpha: 5 },
];

export default function AdminDashboard() {
  const stats = [
    { title: 'Total Siswa', value: '1,248', icon: <Users className="w-6 h-6" />, containerClass: 'bg-indigo-50 text-indigo-600' },
    { title: 'Ujian Aktif', value: '86', icon: <FileText className="w-6 h-6" />, containerClass: 'bg-purple-50 text-purple-600' },
    { title: 'Absensi Hari Ini', value: '94.2%', icon: <CheckCircle className="w-6 h-6" />, containerClass: 'bg-emerald-50 text-emerald-600' },
    { title: 'Rata-rata Nilai', value: '82.4', icon: <BookOpen className="w-6 h-6" />, containerClass: 'bg-amber-50 text-amber-600' },
  ];

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
            <div className="flex bg-slate-50 p-1 rounded-xl">
              <button className="px-3 py-1.5 bg-white text-indigo-600 rounded-lg text-xs font-bold shadow-sm">Mingguan</button>
              <button className="px-3 py-1.5 text-slate-400 rounded-lg text-xs font-medium">Bulanan</button>
            </div>
          </div>
          
          <div className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorHadir" x1="0" y1="0" x2="0" y2="1">
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
                  <Area type="monotone" dataKey="hadir" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorHadir)" />
                </AreaChart>
              </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">Aktivitas Terbaru</h3>
            <button className="text-indigo-600 text-xs font-bold">Semua</button>
          </div>
          <div className="space-y-4">
            {[
              { title: 'Ujian Matematika Dimulai', desc: 'Kelas XII IPA 1', time: '10 menit lalu', color: 'bg-indigo-600', code: 'MTK' },
              { title: 'Laporan Nilai Diunggah', desc: 'Oleh Ibu Ratna (Fisika)', time: '1 jam lalu', color: 'bg-emerald-600', code: 'FIS' },
              { title: 'Siswa Baru Ditambahkan', desc: 'Andi Saputra', time: 'Kemarin', color: 'bg-orange-600', code: 'NEW' },
            ].map((activity, i) => (
              <div key={i} className={`p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center space-x-3 ${i > 0 ? 'opacity-80' : ''}`}>
                <div className={`w-10 h-10 ${activity.color} text-white rounded-xl flex items-center justify-center font-bold text-xs shrink-0`}>
                  {activity.code}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-slate-700">{activity.title}</div>
                  <div className="text-[10px] text-slate-400">{activity.desc} • {activity.time}</div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-auto pt-6">
            <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-200 transition-all">
              + Buat Ujian Baru
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
