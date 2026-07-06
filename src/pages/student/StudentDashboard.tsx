import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { CheckCircle, Clock, FileText, MapPin, Trophy } from 'lucide-react';
import { motion } from 'motion/react';

export default function StudentDashboard() {
  const { user } = useAuth();
  
  const stats = [
    { title: 'Ujian Aktif', value: '2', icon: <FileText className="w-6 h-6" />, containerClass: 'bg-indigo-50 text-indigo-600' },
    { title: 'Ujian Selesai', value: '15', icon: <CheckCircle className="w-6 h-6" />, containerClass: 'bg-emerald-50 text-emerald-600' },
    { title: 'Nilai Rata-rata', value: '85.4', icon: <Trophy className="w-6 h-6" />, containerClass: 'bg-amber-50 text-amber-600' },
    { title: 'Persentase Kehadiran', value: '98%', icon: <Clock className="w-6 h-6" />, containerClass: 'bg-purple-50 text-purple-600' },
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
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">Absensi Hari Ini</h3>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl space-y-3 mb-6">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Jam Masuk</span>
              <span className="font-medium text-slate-800">07:00 WIB</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Batas Absen</span>
              <span className="font-medium text-slate-800">07:15 WIB</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-100 mt-2">
              <MapPin size={16} className="text-indigo-500 shrink-0" />
              <span>Lokasi Anda terdeteksi di area sekolah</span>
            </div>
          </div>
          <div className="mt-auto">
            <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-200 transition-all">
              Check In Sekarang
            </button>
          </div>
        </div>

        <div className="lg:col-span-8 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">Ujian Tersedia</h3>
            <button className="text-indigo-600 text-xs font-bold">Lihat Semua</button>
          </div>
          <div className="space-y-4">
            {[
              { mapel: 'Matematika Peminatan', guru: 'Bpk. Budi Santoso, S.Pd', durasi: '90 Menit', soal: 40, status: 'Mulai', color: 'bg-indigo-600', code: 'MTK' },
              { mapel: 'Fisika', guru: 'Ibu Ratna, M.Sc', durasi: '60 Menit', soal: 30, status: 'Belum Mulai', color: 'bg-emerald-600', code: 'FIS' }
            ].map((ujian, i) => (
              <div key={i} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                <div className={`w-12 h-12 ${ujian.color} text-white rounded-xl flex items-center justify-center font-bold text-sm hidden sm:flex shrink-0`}>
                  {ujian.code}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-slate-700">{ujian.mapel}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{ujian.guru}</div>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500 font-bold uppercase tracking-wide">
                    <span className="flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-slate-100 shadow-sm"><Clock size={12}/> {ujian.durasi}</span>
                    <span className="flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-slate-100 shadow-sm"><FileText size={12}/> {ujian.soal} Soal</span>
                  </div>
                </div>
                <div className="shrink-0">
                  <button 
                    disabled={ujian.status !== 'Mulai'}
                    onClick={() => ujian.status === 'Mulai' && window.location.assign('/exam/1')}
                    className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      ujian.status === 'Mulai' 
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200' 
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {ujian.status === 'Mulai' ? 'Kerjakan' : 'Menunggu'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
