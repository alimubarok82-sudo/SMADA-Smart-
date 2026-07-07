import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Download, Search, Filter, AlertCircle, Settings, X, Check, ChevronDown, Loader2, Plus, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, where, orderBy, addDoc, doc, setDoc, getDoc } from 'firebase/firestore';

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
  const [selectedTerm, setSelectedTerm] = useState('Ganjil 2024/2025');
  const [activeTerm, setActiveTerm] = useState<string>('');
  const [isSettingActive, setIsSettingActive] = useState(false);
  const [availableTerms, setAvailableTerms] = useState<string[]>(['Ganjil 2024/2025']);
  const [showAddTermModal, setShowAddTermModal] = useState(false);
  const [newTerm, setNewTerm] = useState('');
  const [isAddingTerm, setIsAddingTerm] = useState(false);
  const [tpFormatif, setTpFormatif] = useState<string[]>(Array(15).fill(''));
  const [tpSumatif, setTpSumatif] = useState<string[]>(Array(9).fill(''));
  const [showTPModal, setShowTPModal] = useState(false);
  const [isSavingTP, setIsSavingTP] = useState(false);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentGrade[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTerms = async () => {
    try {
      // 1. Fetch academic years
      const snap = await getDocs(collection(db, 'school_years'));
      const terms = snap.docs.map(doc => doc.data().name).filter(Boolean);
      
      // 2. Fetch active term setting
      const settingSnap = await getDoc(doc(db, 'settings', 'academic_year'));
      let currentActive = '';
      if (settingSnap.exists()) {
        currentActive = settingSnap.data().current;
        setActiveTerm(currentActive);
      }

      const defaults = [
        'Ganjil 2023/2024',
        'Genap 2023/2024',
        'Ganjil 2024/2025',
        'Genap 2024/2025',
        'Ganjil 2025/2026',
        'Genap 2025/2026'
      ];
      const combined = Array.from(new Set([...defaults, ...terms])).sort((a, b) => {
        // Sort descending by year
        const yearA = a.match(/\d{4}\/\d{4}/)?.[0] || '';
        const yearB = b.match(/\d{4}\/\d{4}/)?.[0] || '';
        if (yearA !== yearB) return yearB.localeCompare(yearA);
        return a.localeCompare(b);
      });
      setAvailableTerms(combined);

      // Default to active term if available
      if (currentActive && combined.includes(currentActive)) {
        setSelectedTerm(currentActive);
      } else if (!combined.includes(selectedTerm)) {
        setSelectedTerm(combined[0]);
      }
    } catch (error) {
      console.error("Error fetching terms:", error);
    }
  };

  const handleSetActiveTerm = async () => {
    if (!selectedTerm) return;
    setIsSettingActive(true);
    try {
      await setDoc(doc(db, 'settings', 'academic_year'), {
        current: selectedTerm,
        updatedAt: new Date()
      });
      setActiveTerm(selectedTerm);
    } catch (error) {
      console.error("Error setting active term:", error);
    } finally {
      setIsSettingActive(false);
    }
  };

  const handleAddTerm = async () => {
    if (!newTerm.trim()) return;
    setIsAddingTerm(true);
    try {
      await addDoc(collection(db, 'school_years'), {
        name: newTerm.trim(),
        createdAt: new Date()
      });
      setAvailableTerms(prev => [...new Set([newTerm.trim(), ...prev])].sort());
      setSelectedTerm(newTerm.trim());
      setNewTerm('');
      setShowAddTermModal(false);
    } catch (error) {
      console.error("Error adding term:", error);
    } finally {
      setIsAddingTerm(false);
    }
  };

  const fetchTP = async () => {
    if (!selectedClass || !selectedTerm) return;
    try {
      const docId = `${selectedClass}_${selectedTerm}`.replace(/\//g, '-');
      const snap = await getDocs(query(collection(db, 'learning_objectives'), where('classId', '==', selectedClass), where('term', '==', selectedTerm)));
      if (!snap.empty) {
        const data = snap.docs[0].data();
        setTpFormatif(data.formatif || Array(15).fill(''));
        setTpSumatif(data.sumatif || Array(9).fill(''));
      } else {
        setTpFormatif(Array(15).fill(''));
        setTpSumatif(Array(9).fill(''));
      }
    } catch (error) {
      console.error("Error fetching TP:", error);
    }
  };

  const handleSaveTP = async () => {
    if (!selectedClass || !selectedTerm) return;
    setIsSavingTP(true);
    try {
      const docId = `${selectedClass}_${selectedTerm}`.replace(/\//g, '-');
      const q = query(collection(db, 'learning_objectives'), where('classId', '==', selectedClass), where('term', '==', selectedTerm));
      const snap = await getDocs(q);
      
      const payload = {
        classId: selectedClass,
        term: selectedTerm,
        formatif: tpFormatif,
        sumatif: tpSumatif,
        updatedAt: new Date()
      };

      if (!snap.empty) {
        await setDoc(doc(db, 'learning_objectives', snap.docs[0].id), payload);
      } else {
        await addDoc(collection(db, 'learning_objectives'), payload);
      }
      setShowTPModal(false);
    } catch (error) {
      console.error("Error saving TP:", error);
    } finally {
      setIsSavingTP(false);
    }
  };

  const handleExportCSV = () => {
    if (students.length === 0) return;

    // Headers
    const headers = [
      'Nama Siswa',
      'L/P',
      ...Array.from({ length: 15 }, (_, i) => `F${i + 1}`),
      'NA Formatif',
      ...Array.from({ length: 9 }, (_, i) => `S${i + 1}`),
      'NA Sumatif',
      'SAS Non Tes',
      'SAS Tes',
      'Nilai Sumatif (NS)',
      'Nilai Rapor (NR)',
      'Tujuan Pembelajaran'
    ].join(',');

    // Rows
    const rows = students.map(s => {
      const naf = calculateAverage(s.formatif);
      const nas = calculateAverage(s.sumatif);
      const ns_val = Math.round((nas + (s.sas_tes || 0)) / 2);
      const nr_val = Math.round((naf + nas + ns_val) / 3);

      const getDynamicTP = () => {
        const allScores = [
          ...s.formatif.map((v, i) => ({ type: 'f', score: v || 0, index: i })),
          ...s.sumatif.map((v, i) => ({ type: 's', score: v || 0, index: i }))
        ].filter(scoreObj => scoreObj.score > 0);

        if (allScores.length === 0) return 'Belum ada data nilai.';

        const sorted = [...allScores].sort((a, b) => b.score - a.score);
        const best = sorted[0];
        const worst = sorted[sorted.length - 1];

        const bestDesc = best.type === 'f' ? tpFormatif[best.index] : tpSumatif[best.index];
        const worstDesc = worst.type === 'f' ? tpFormatif[worst.index] : tpSumatif[worst.index];

        const parts = [];
        if (bestDesc) parts.push(`Menunjukkan penguasaan dalam ${bestDesc}.`);
        if (worstDesc && worstDesc !== bestDesc && worst.score < 75) parts.push(`Perlu bimbingan dalam ${worstDesc}.`);
        
        return parts.length > 0 ? parts.join(' ') : (s.lo || 'Materi Informatik');
      };

      return [
        `"${s.name}"`,
        `"${s.gender || ''}"`,
        ...s.formatif.map(v => v ?? ''),
        naf,
        ...s.sumatif.map(v => v ?? ''),
        nas,
        s.sas_non_tes ?? '',
        s.sas_tes ?? '',
        ns_val,
        nr_val,
        `"${getDynamicTP()}"`
      ].join(',');
    });

    // TP Titles row
    const tpRow = [
      'Tujuan Pembelajaran',
      '',
      ...tpFormatif,
      '',
      ...tpSumatif,
      '',
      '',
      '',
      '',
      ''
    ].join(',');

    const csvContent = [headers, tpRow, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `Leger_Nilai_${selectedClass || 'Semua'}_${selectedTerm.replace(/\//g, '-')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchClasses = async () => {
    try {
      // 1. Fetch from classes collection
      const snap = await getDocs(query(collection(db, 'classes'), orderBy('name')));
      const classList = snap.docs.map(doc => doc.data().name).filter(Boolean);
      
      // 2. Fetch from students to find any other classes
      const studentsSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'siswa')));
      const classesFromStudents = new Set<string>();
      studentsSnap.docs.forEach(d => {
        const cId = d.data().classId;
        if (cId) classesFromStudents.add(cId);
      });
      
      const combined = Array.from(new Set([...classList, ...Array.from(classesFromStudents)]))
        .filter(Boolean)
        .sort();

      if (combined.length > 0) {
        setClasses(combined);
        if (!selectedClass || !combined.includes(selectedClass)) {
          setSelectedClass(combined[0]);
        }
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
    fetchTerms();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchData();
      fetchTP();
    }
  }, [selectedClass, selectedTerm]);

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
          <Button 
            onClick={() => setShowTPModal(true)}
            variant="outline"
            className="h-11 rounded-xl border-slate-200 bg-white font-bold text-indigo-600 hover:bg-indigo-50 active:scale-95 transition-all"
          >
            <BookOpen size={18} className="mr-2" /> Kelola TP
          </Button>
          <Button 
            onClick={handleExportCSV}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6 h-11 font-bold shadow-lg shadow-emerald-100 transition-all active:scale-95"
          >
            <Download size={18} className="mr-2" /> Export ke Excel
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
            <div className="flex items-center gap-1">
              <select 
                className="h-10 px-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
              >
                {availableTerms.map(term => (
                  <option key={term} value={term}>{term}</option>
                ))}
              </select>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowAddTermModal(true)}
                  className="h-8 w-8 rounded-lg p-0 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                  title="Tambah Tahun Ajaran"
                >
                  <Plus size={14} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSetActiveTerm}
                  disabled={isSettingActive || selectedTerm === activeTerm}
                  className={`h-8 w-8 rounded-lg p-0 transition-all ${
                    selectedTerm === activeTerm 
                      ? 'text-emerald-500 bg-emerald-50' 
                      : 'text-slate-300 hover:text-emerald-600 hover:bg-emerald-50'
                  }`}
                  title={selectedTerm === activeTerm ? "Tahun Ajaran Aktif" : "Set sebagai Tahun Ajaran Aktif"}
                >
                  {isSettingActive ? <Loader2 size={12} className="animate-spin" /> : <Check size={14} />}
                </Button>
              </div>
            </div>
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
                      <th 
                        key={`f-${i}`} 
                        title={tpFormatif[i]}
                        className="border border-slate-200 px-1 py-2 w-6 bg-rose-500 text-white cursor-help"
                      >
                        {i + 1}
                      </th>
                    ))}
                    {[...Array(9)].map((_, i) => (
                      <th 
                        key={`s-${i}`} 
                        title={tpSumatif[i]}
                        className="border border-slate-200 px-1 py-2 w-6 bg-orange-400 text-white cursor-help"
                      >
                        {i + 1}
                      </th>
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

                      const getDynamicTP = () => {
                        const allScores = [
                          ...student.formatif.map((v, i) => ({ type: 'f', score: v || 0, index: i })),
                          ...student.sumatif.map((v, i) => ({ type: 's', score: v || 0, index: i }))
                        ].filter(s => s.score > 0);

                        if (allScores.length === 0) return 'Belum ada data nilai untuk dianalisis.';

                        const sorted = [...allScores].sort((a, b) => b.score - a.score);
                        const best = sorted[0];
                        const worst = sorted[sorted.length - 1];

                        const bestDesc = best.type === 'f' ? tpFormatif[best.index] : tpSumatif[best.index];
                        const worstDesc = worst.type === 'f' ? tpFormatif[worst.index] : tpSumatif[worst.index];

                        const parts = [];
                        if (bestDesc) parts.push(`Menunjukkan penguasaan dalam ${bestDesc}.`);
                        if (worstDesc && worstDesc !== bestDesc && worst.score < 75) parts.push(`Perlu bimbingan dalam ${worstDesc}.`);
                        
                        return parts.length > 0 ? parts.join(' ') : (student.lo || 'Materi Informatik');
                      };

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
                          <td className="border border-slate-200 px-4 py-3 text-left text-blue-600 text-[10px] leading-tight group-hover:bg-emerald-50 transition-colors">{getDynamicTP()}</td>
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

      {/* Add Term Modal */}
      <AnimatePresence>
        {showAddTermModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddTermModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-slate-800">Tambah Tahun Ajaran</h3>
                <button 
                  onClick={() => setShowAddTermModal(false)}
                  className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Nama Tahun Ajaran</label>
                  <input 
                    type="text"
                    placeholder="Contoh: Ganjil 2026/2027"
                    className="w-full h-12 px-4 rounded-2xl bg-slate-50 border-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700"
                    value={newTerm}
                    onChange={(e) => setNewTerm(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <Button 
                    variant="ghost"
                    onClick={() => setShowAddTermModal(false)}
                    className="flex-1 h-12 rounded-xl font-bold text-slate-400"
                  >
                    Batal
                  </Button>
                  <Button 
                    onClick={handleAddTerm}
                    disabled={isAddingTerm || !newTerm.trim()}
                    className="flex-1 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-100"
                  >
                    {isAddingTerm ? <Loader2 className="animate-spin" /> : 'Simpan'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Learning Objectives (TP) Modal */}
      <AnimatePresence>
        {showTPModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTPModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                    <BookOpen className="text-indigo-600" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Kelola Tujuan Pembelajaran</h3>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{selectedClass} • {selectedTerm}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowTPModal(false)}
                  className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Formatif TP */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 pb-2 border-b-2 border-rose-100">
                      <div className="w-8 h-8 bg-rose-500 rounded-lg flex items-center justify-center text-white font-black text-xs">F</div>
                      <h4 className="font-black text-slate-700 uppercase tracking-tight">Tujuan Pembelajaran Formatif</h4>
                    </div>
                    <div className="grid gap-3">
                      {tpFormatif.map((tp, i) => (
                        <div key={i} className="flex gap-3 items-center">
                          <span className="w-6 text-xs font-black text-slate-400">{i + 1}</span>
                          <input 
                            type="text"
                            placeholder={`Tujuan Pembelajaran Formatif ${i + 1}`}
                            className="flex-1 h-10 px-4 rounded-xl bg-slate-50 border-slate-100 outline-none focus:ring-2 focus:ring-rose-500 text-sm font-bold text-slate-600 placeholder:text-slate-300 transition-all"
                            value={tp}
                            onChange={(e) => {
                              const next = [...tpFormatif];
                              next[i] = e.target.value;
                              setTpFormatif(next);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sumatif TP */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 pb-2 border-b-2 border-indigo-100">
                      <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-xs">S</div>
                      <h4 className="font-black text-slate-700 uppercase tracking-tight">Tujuan Pembelajaran Sumatif</h4>
                    </div>
                    <div className="grid gap-3">
                      {tpSumatif.map((tp, i) => (
                        <div key={i} className="flex gap-3 items-center">
                          <span className="w-6 text-xs font-black text-slate-400">{i + 1}</span>
                          <input 
                            type="text"
                            placeholder={`Tujuan Pembelajaran Sumatif ${i + 1}`}
                            className="flex-1 h-10 px-4 rounded-xl bg-slate-50 border-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-600 placeholder:text-slate-300 transition-all"
                            value={tp}
                            onChange={(e) => {
                              const next = [...tpSumatif];
                              next[i] = e.target.value;
                              setTpSumatif(next);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-slate-100 bg-slate-50/50 shrink-0 flex gap-3">
                <Button 
                  variant="ghost"
                  onClick={() => setShowTPModal(false)}
                  className="flex-1 h-12 rounded-2xl font-black text-slate-400 hover:text-slate-600"
                >
                  Batal
                </Button>
                <Button 
                  onClick={handleSaveTP}
                  disabled={isSavingTP}
                  className="flex-1 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-xl shadow-indigo-100 active:scale-95 transition-all"
                >
                  {isSavingTP ? <Loader2 className="animate-spin" /> : 'Simpan Perubahan'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
