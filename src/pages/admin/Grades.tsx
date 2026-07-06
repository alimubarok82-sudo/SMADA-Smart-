import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Download, Search, Filter, AlertCircle, Settings, X, Check, ChevronDown, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';

interface StudentGrade {
  id: string;
  name: string;
  gender: string;
  formatif: (number | null)[];
  sumatif: (number | null)[];
  sas_non_tes: number | null;
  sas_tes: number | null;
  lo: string;
}

export default function Grades() {
  const [selectedClass, setSelectedClass] = useState('');
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedTerm, setSelectedTerm] = useState('Ganjil 2023/2024');
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentGrade[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchClasses = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'classes'), orderBy('name')));
      const classList = snap.docs.map(doc => doc.data().name);
      if (classList.length > 0) {
        setClasses(classList);
        if (!selectedClass) setSelectedClass(classList[0]);
      } else {
        const defaults = ['XE1', 'XE2', 'XE3', 'XE4'];
        setClasses(defaults);
        if (!selectedClass) setSelectedClass(defaults[0]);
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchData();
    }
  }, [selectedClass]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Students
      const studentsQuery = query(collection(db, 'users'), where('role', '==', 'siswa'));
      const studentsSnap = await getDocs(studentsQuery);
      let studentList = studentsSnap.docs.map(doc => ({
        id: doc.id,
        name: doc.data().displayName || 'Anonim',
        gender: (doc.data() as any).gender || 'L/P',
        classId: (doc.data() as any).classId || 'Unknown'
      }));

      // Filter by class locally for now or modify query if classId is reliable
      studentList = studentList.filter(s => s.classId === selectedClass);

      // 2. Fetch Exam Results (Formatif)
      const resultsSnap = await getDocs(collection(db, 'exam_results'));
      const resultsData = resultsSnap.docs.map(doc => doc.data());

      // 3. Fetch Submissions (Sumatif)
      const submissionsSnap = await getDocs(collection(db, 'submissions'));
      const submissionsData = submissionsSnap.docs.map(doc => doc.data());

      // Deduplicate student list by name and class
      const uniqueStudents: Record<string, any> = {};
      studentList.forEach(s => {
        const key = `${s.name}-${s.classId}`;
        // Prefer record with Auth UID (id length usually > 20) over random firestore id
        if (!uniqueStudents[key] || s.id.length > (uniqueStudents[key].id.length || 0)) {
          uniqueStudents[key] = s;
        }
      });
      const finalStudentList = Object.values(uniqueStudents);

      // 4. Merge Data
      const merged: StudentGrade[] = finalStudentList.map(s => {
        const formatif = Array(15).fill(null);
        const sumatif = Array(9).fill(null);
        let sas_tes = null;

        // Fill Formatif from exam_results
        resultsData.forEach((res: any) => {
          const isSameStudent = res.studentId === s.id || (res.studentName === s.name && res.classId === s.classId);
          if (isSameStudent && res.category === 'formatif' && res.columnNumber) {
            formatif[res.columnNumber - 1] = res.score;
          }
          if (isSameStudent && res.category === 'sas') {
            sas_tes = res.score;
          }
        });

        // Fill Sumatif from submissions
        submissionsData.forEach((sub: any) => {
          const isSameStudent = sub.studentId === s.id || (sub.studentName === s.name && sub.classId === s.classId);
          if (isSameStudent && sub.category === 'sumatif' && sub.columnNumber && sub.status === 'graded') {
            sumatif[sub.columnNumber - 1] = sub.grade;
          }
        });

        return {
          id: s.id,
          name: s.name,
          gender: s.gender,
          formatif,
          sumatif,
          sas_non_tes: null,
          sas_tes,
          lo: 'Materi Informatik'
        };
      });

      setStudents(merged);
    } catch (error) {
      console.error("Error fetching grades:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAverage = (arr: (number | null)[]) => {
    const valid = arr.filter(v => v !== null) as number[];
    if (valid.length === 0) return 0;
    return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Leger Nilai (Kurikulum Merdeka)</h2>
          <p className="text-slate-500 text-sm">Rekapitulasi nilai formatif (ujian) dan sumatif (portofolio) mata pelajaran Informatika</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" className="h-11 rounded-xl border-slate-200 bg-white font-bold text-slate-600">
            <Filter size={18} className="mr-2" /> Opsi Lanjut
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6 h-11 font-bold shadow-lg shadow-emerald-100">
            <Download size={18} className="mr-2" /> Cetak Leger
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-4 flex items-center gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm overflow-x-auto">
          <div className="flex items-center gap-2 shrink-0">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kelas:</label>
            <select 
              className="h-10 px-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              {classes.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 shrink-0 border-l pl-4 border-slate-100">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tahun Ajaran:</label>
            <select 
              className="h-10 px-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
            >
              <option value="Ganjil 2023/2024">Ganjil 2023/2024</option>
              <option value="Genap 2023/2024">Genap 2023/2024</option>
            </select>
          </div>
          <div className="ml-auto relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              placeholder="Cari nama siswa..." 
              className="w-full pl-9 h-10 text-xs rounded-xl border-slate-200 bg-slate-50 outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Card className="md:col-span-4 rounded-3xl border-slate-100 shadow-xl bg-white overflow-hidden min-h-[400px] flex flex-col">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-12 h-12 animate-spin mb-4" />
              <p className="font-bold uppercase tracking-widest text-xs">Memuat Data Leger...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-200 text-center font-sans">
                <thead className="text-[10px] font-black uppercase tracking-tighter">
                  <tr className="bg-slate-100/80">
                    <th rowSpan={2} className="border border-slate-200 px-4 py-2 w-48 text-left bg-slate-100 sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">NAMA</th>
                    <th rowSpan={2} className="border border-slate-200 px-2 py-2 w-8 bg-slate-100">LP</th>
                    <th colSpan={15} className="border border-slate-200 px-2 py-2 bg-slate-100/50">Asesmen Formatif (Ujian)</th>
                    <th rowSpan={2} className="border border-slate-200 px-2 py-2 w-10 bg-emerald-500 text-white">NAF</th>
                    <th colSpan={9} className="border border-slate-200 px-2 py-2 bg-slate-100/50">Sumatif Lingkup Materi (Portofolio)</th>
                    <th rowSpan={2} className="border border-slate-200 px-2 py-2 w-10 bg-emerald-500 text-white">NAS</th>
                    <th colSpan={2} className="border border-slate-200 px-2 py-2 bg-slate-100/50">SAS</th>
                    <th rowSpan={2} className="border border-slate-200 px-2 py-2 w-10 bg-indigo-500 text-white">NS</th>
                    <th rowSpan={2} className="border border-slate-200 px-2 py-2 w-12 bg-amber-400 text-white">NR</th>
                    <th rowSpan={2} className="border border-slate-200 px-2 py-2 w-8 bg-slate-100">No</th>
                    <th rowSpan={2} className="border border-slate-200 px-4 py-2 min-w-[300px] text-left bg-emerald-50 text-emerald-800">TUJUAN PEMBELAJARAN</th>
                  </tr>
                  <tr className="bg-slate-50">
                    {[...Array(15)].map((_, i) => (
                      <th key={`f-${i}`} className="border border-slate-200 px-1 py-2 w-6 bg-rose-500 text-white">{i + 1}</th>
                    ))}
                    {[...Array(9)].map((_, i) => (
                      <th key={`s-${i}`} className="border border-slate-200 px-1 py-2 w-6 bg-orange-400 text-white">{i + 1}</th>
                    ))}
                    <th className="border border-slate-200 px-1 py-2 w-8 bg-white text-slate-500">Non</th>
                    <th className="border border-slate-200 px-1 py-2 w-8 bg-rose-500 text-white">Tes</th>
                  </tr>
                </thead>
                <tbody className="text-[11px] font-bold">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={34} className="py-20 text-slate-400 font-medium">Belum ada data siswa untuk kelas ini</td>
                    </tr>
                  ) : (
                    filteredStudents.map((student, idx) => {
                      const naf = calculateAverage(student.formatif);
                      const nas = calculateAverage(student.sumatif);
                      const ns = Math.round((nas + (student.sas_tes || 0)) / 2);
                      const nr = Math.round((naf + nas + ns) / 3);

                      return (
                        <tr key={student.id} className="hover:bg-slate-50 group">
                          <td className="border border-slate-200 px-4 py-3 text-left text-blue-600 truncate max-w-[200px] font-black sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)] group-hover:bg-slate-50">{student.name}</td>
                          <td className="border border-slate-200 px-2 py-3 text-blue-600">{student.gender}</td>
                          
                          {student.formatif.map((val, i) => (
                            <td key={i} className={`border border-slate-200 px-1 py-3 ${val && val < 75 ? 'text-rose-600' : 'text-blue-500'}`}>{val || ''}</td>
                          ))}
                          
                          <td className="border border-slate-200 px-2 py-3 bg-slate-50 text-slate-700">{naf}</td>
                          
                          {student.sumatif.map((val, i) => (
                            <td key={i} className={`border border-slate-200 px-1 py-3 ${val && val < 75 ? 'text-rose-600' : 'text-blue-500'}`}>{val || ''}</td>
                          ))}

                          <td className="border border-slate-200 px-2 py-3 bg-slate-50 text-slate-700">{nas}</td>
                          
                          <td className="border border-slate-200 px-1 py-3 text-blue-500">{student.sas_non_tes || ''}</td>
                          <td className="border border-slate-200 px-1 py-3 text-blue-600 font-black">{student.sas_tes || ''}</td>
                          
                          <td className="border border-slate-200 px-2 py-3 bg-slate-50 text-slate-700">{ns}</td>
                          <td className="border border-slate-200 px-2 py-3 bg-amber-50 text-slate-800 font-black">{nr}</td>
                          <td className="border border-slate-200 px-2 py-3 bg-rose-600 text-white">{idx + 1}</td>
                          <td className="border border-slate-200 px-4 py-3 text-left text-blue-600 text-[10px] leading-tight group-hover:bg-emerald-50 transition-colors">{student.lo}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <div className="flex items-center gap-4 px-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-rose-500 rounded-sm" />
          <span className="text-[10px] text-slate-500 font-bold uppercase">KKM Formatif</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-orange-400 rounded-sm" />
          <span className="text-[10px] text-slate-500 font-bold uppercase">KKM Sumatif</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <AlertCircle size={14} className="text-amber-500" />
          <p className="text-[10px] text-slate-500 italic">Nilai otomatis dikalkulasi berdasarkan rata-rata tertimbang.</p>
        </div>
      </div>
    </div>
  );
}
