import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Download, Search, Filter, ChevronDown, GraduationCap, Medal, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

const MOCK_GRADES = [
  { id: '1', name: 'ADIT SOPO', grades: { math: 85, science: 92, indonesian: 88, english: 90, history: 78 } },
  { id: '2', name: 'AISYAH NIRMALA PUTRI TOIRINA', grades: { math: 95, science: 98, indonesian: 94, english: 92, history: 96 } },
  { id: '3', name: 'ANASTASYA BIALFINA', grades: { math: 72, science: 75, indonesian: 82, english: 80, history: 85 } },
  { id: '4', name: 'ANISWATUL HAMIDA', grades: { math: 88, science: 84, indonesian: 90, english: 86, history: 82 } },
  { id: '5', name: 'Budi Santoso', grades: { math: 65, science: 70, indonesian: 75, english: 68, history: 72 } },
];

const SUBJECTS = [
  { id: 'math', name: 'MTK' },
  { id: 'science', name: 'IPA' },
  { id: 'indonesian', name: 'BIND' },
  { id: 'english', name: 'BING' },
  { id: 'history', name: 'SEJ' },
];

export default function Grades() {
  const [selectedClass, setSelectedClass] = useState('XE2');
  const [selectedTerm, setSelectedTerm] = useState('Ganjil 2023/2024');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Leger Nilai Siswa</h2>
          <p className="text-slate-500 text-sm">Rekapitulasi nilai seluruh mata pelajaran per kelas</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" className="h-11 rounded-xl border-slate-200 bg-white font-bold text-slate-600">
            <Filter size={18} className="mr-2" /> Filter Lanjut
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6 h-11 font-bold shadow-lg shadow-emerald-100">
            <Download size={18} className="mr-2" /> Export PDF/Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-1 space-y-4">
          <Card className="rounded-3xl border-slate-100 shadow-sm bg-white overflow-hidden">
            <CardHeader className="py-4 px-6 bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-400">Konfigurasi</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Pilih Kelas</label>
                <select 
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                >
                  <option value="XE1">XE1</option>
                  <option value="XE2">XE2</option>
                  <option value="XE3">XE3</option>
                  <option value="XE4">XE4</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Semester</label>
                <select 
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                >
                  <option value="Ganjil 2023/2024">Ganjil 2023/2024</option>
                  <option value="Genap 2023/2024">Genap 2023/2024</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-indigo-100 bg-indigo-50 shadow-sm overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <Medal className="text-indigo-600" size={20} />
                </div>
                <h4 className="font-bold text-indigo-900 text-sm">Peringkat Kelas</h4>
              </div>
              <div className="space-y-3">
                {MOCK_GRADES.sort((a, b) => {
                  const avgA = Object.values(a.grades).reduce((p, c) => p + c, 0) / 5;
                  const avgB = Object.values(b.grades).reduce((p, c) => p + c, 0) / 5;
                  return avgB - avgA;
                }).slice(0, 3).map((student, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-xs font-medium text-indigo-700 truncate mr-2">{i+1}. {student.name}</span>
                    <span className="bg-white px-2 py-0.5 rounded-lg text-[10px] font-bold text-indigo-600">
                      {(Object.values(student.grades).reduce((p, c) => p + c, 0) / 5).toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="md:col-span-3 rounded-3xl border-slate-100 shadow-sm bg-white overflow-hidden flex flex-col">
          <CardHeader className="py-4 px-6 border-b border-slate-50 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold text-slate-800">Tabel Leger Nilai - {selectedClass}</CardTitle>
            <div className="relative w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                placeholder="Cari siswa..." 
                className="w-full pl-9 h-9 text-xs rounded-xl border-slate-200 bg-slate-50 outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-widest border-b border-slate-100">
                  <th className="px-6 py-4 w-12 text-center">No</th>
                  <th className="px-6 py-4">Nama Siswa</th>
                  {SUBJECTS.map(sub => (
                    <th key={sub.id} className="px-4 py-4 text-center">{sub.name}</th>
                  ))}
                  <th className="px-6 py-4 text-center bg-indigo-50/30 text-indigo-600">RATA2</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {MOCK_GRADES.map((student, idx) => {
                  const average = Object.values(student.grades).reduce((p, c) => p + c, 0) / SUBJECTS.length;
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 text-xs text-slate-400 font-medium text-center">{idx + 1}</td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-700 text-xs uppercase">{student.name}</div>
                      </td>
                      {SUBJECTS.map(sub => {
                        const grade = student.grades[sub.id as keyof typeof student.grades];
                        return (
                          <td key={sub.id} className="px-4 py-4 text-center">
                            <span className={`text-xs font-bold ${
                              grade >= 85 ? 'text-emerald-600' :
                              grade >= 75 ? 'text-slate-700' :
                              'text-rose-600'
                            }`}>
                              {grade}
                            </span>
                          </td>
                        );
                      })}
                      <td className="px-6 py-4 text-center bg-indigo-50/10">
                        <span className="text-xs font-black text-indigo-700">{average.toFixed(1)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center space-x-2">
            <AlertCircle className="text-amber-500" size={14} />
            <p className="text-[10px] text-slate-500 italic">Nilai berwarna merah menandakan di bawah KKM (75).</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
