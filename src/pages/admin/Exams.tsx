import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Plus, FileText, Settings, Play, Clock, Users, ChevronRight, BarChart3, Search } from 'lucide-react';
import { motion } from 'motion/react';

const MOCK_EXAMS = [
  { id: '1', title: 'Penilaian Tengah Semester - Matematika', subject: 'Matematika', date: '2024-03-20', duration: '90 Menit', status: 'upcoming', participants: 120 },
  { id: '2', title: 'Ujian Harian Sejarah Indonesia', subject: 'Sejarah', date: '2024-03-15', duration: '45 Menit', status: 'active', participants: 35 },
  { id: '3', title: 'Simulasi UTBK 2024', subject: 'Campuran', date: '2024-03-10', duration: '180 Menit', status: 'completed', participants: 450 },
];

export default function Exams() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Sistem Ujian Online</h2>
          <p className="text-slate-500 text-sm">Kelola bank soal dan jadwal ujian sekolah</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-6 h-12 font-bold shadow-lg shadow-indigo-100">
          <Plus className="w-5 h-5 mr-2" /> Buat Ujian Baru
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Ujian', value: '42', icon: <FileText className="text-blue-500" />, sub: 'Tahun Ajaran 2023/2024' },
          { label: 'Siswa Aktif', value: '840', icon: <Users className="text-emerald-500" />, sub: 'Terdaftar di Sistem' },
          { label: 'Rata-rata Nilai', value: '78.4', icon: <BarChart3 className="text-amber-500" />, sub: 'Dari 12.5k Jawaban' },
        ].map((stat, i) => (
          <Card key={i} className="rounded-3xl border-slate-100 shadow-sm bg-white overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center">
                  {stat.icon}
                </div>
                <span className="text-slate-400"><ChevronRight size={20} /></span>
              </div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
              <h3 className="text-3xl font-black text-slate-800 mt-1">{stat.value}</h3>
              <p className="text-xs text-slate-400 mt-2">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-lg font-bold text-slate-800">Jadwal & Riwayat Ujian</h3>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <Input 
              placeholder="Cari ujian..." 
              className="pl-10 h-10 rounded-xl border-slate-200 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {MOCK_EXAMS.map((exam) => (
            <motion.div
              key={exam.id}
              whileHover={{ y: -2 }}
              className="group"
            >
              <Card className="rounded-3xl border-slate-100 shadow-sm bg-white overflow-hidden hover:shadow-md transition-all">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center gap-6">
                    <div className={`w-16 h-16 rounded-2xl shrink-0 flex flex-col items-center justify-center ${
                      exam.status === 'active' ? 'bg-emerald-50 text-emerald-600' :
                      exam.status === 'upcoming' ? 'bg-blue-50 text-blue-600' :
                      'bg-slate-50 text-slate-400'
                    }`}>
                      <FileText size={24} />
                      <span className="text-[10px] font-bold uppercase mt-1">{exam.subject}</span>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-slate-800">{exam.title}</h4>
                        {exam.status === 'active' && (
                          <span className="flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                            SEDANG BERLANGSUNG
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-slate-400" /> {exam.date} • {exam.duration}
                        </div>
                        <div className="flex items-center gap-2">
                          <Users size={14} className="text-slate-400" /> {exam.participants} Peserta
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="h-10 px-4 rounded-xl border-slate-200 font-bold text-slate-600">
                        <Settings size={16} className="mr-2" /> Detail
                      </Button>
                      <Button className={`h-10 px-6 rounded-xl font-bold shadow-lg transition-all ${
                        exam.status === 'active' ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-100' :
                        exam.status === 'upcoming' ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100' :
                        'bg-slate-800 hover:bg-black text-white shadow-slate-100'
                      }`}>
                        {exam.status === 'active' ? <><XCircle size={16} className="mr-2" /> Berhentikan</> :
                         exam.status === 'upcoming' ? <><Play size={16} className="mr-2" /> Mulai Sekarang</> :
                         <><BarChart3 size={16} className="mr-2" /> Lihat Hasil</>}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

const XCircle = ({ size, className }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
);
