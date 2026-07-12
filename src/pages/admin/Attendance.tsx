import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Calendar as CalendarIcon, CheckCircle2, XCircle, Clock, Search, Filter, Download } from 'lucide-react';
import { motion } from 'motion/react';
import { collection, getDocs, query, where, orderBy, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatDate } from '../../lib/utils';

interface Student {
  id: string;
  displayName: string;
  classId: string;
}

export default function Attendance() {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(formatDate());
  const [classes, setClasses] = useState<string[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [attendance, setAttendance] = useState<Record<string, 'hadir' | 'izin' | 'sakit' | 'alpa'>>({});

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'classes'), orderBy('name')));
        const classList = snap.docs.map(doc => doc.data().name).filter(Boolean);
        
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
        }
      } catch (error) {
        console.error("Error fetching classes:", error);
      }
    };
    fetchClasses();
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    const fetchStudentsAndAttendance = async () => {
      setLoading(true);
      try {
        // 1. Fetch Students
        const q = query(collection(db, 'users'), where('role', '==', 'siswa'), where('classId', '==', selectedClass));
        const querySnapshot = await getDocs(q);
        const studentsData: Student[] = [];
        querySnapshot.forEach((doc) => {
          studentsData.push({ id: doc.id, ...doc.data() } as Student);
        });
        const sortedStudents = studentsData.sort((a, b) => a.displayName.localeCompare(b.displayName));
        setStudents(sortedStudents);
        
        // 2. Fetch Attendance for Selected Date
        const attQ = query(
          collection(db, 'attendance'),
          where('classId', '==', selectedClass),
          where('date', '==', selectedDate)
        );
        const attSnap = await getDocs(attQ);
        
        const currentAttendance: Record<string, 'hadir' | 'izin' | 'sakit' | 'alpa'> = {};
        // Initialize all as alpa (default if no record)
        sortedStudents.forEach(s => currentAttendance[s.id] = 'alpa');
        
        // Fill with actual records
        attSnap.forEach(doc => {
          const data = doc.data();
          if (currentAttendance[data.studentId]) {
            currentAttendance[data.studentId] = data.status;
          }
        });

        setAttendance(currentAttendance);
      } catch (error) {
        console.error("Error fetching attendance data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStudentsAndAttendance();
  }, [selectedClass, selectedDate]);

  const handleSaveAttendance = async () => {
    if (!selectedClass || students.length === 0) return;
    setSaving(true);
    try {
      const batch = writeBatch(db);
      
      // Get existing records for this class and date to update/overwrite
      const attQ = query(
        collection(db, 'attendance'),
        where('classId', '==', selectedClass),
        where('date', '==', selectedDate)
      );
      const existingSnap = await getDocs(attQ);
      const existingMap: Record<string, string> = {};
      existingSnap.forEach(doc => {
        existingMap[doc.data().studentId] = doc.id;
      });

      for (const student of students) {
        const status = attendance[student.id];
        const existingId = existingMap[student.id];
        
        if (existingId) {
          batch.update(doc(db, 'attendance', existingId), {
            status,
            updatedAt: serverTimestamp()
          });
        } else {
          batch.set(doc(collection(db, 'attendance')), {
            studentId: student.id,
            studentName: student.displayName,
            classId: selectedClass,
            date: selectedDate,
            status,
            createdAt: serverTimestamp()
          });
        }
      }

      await batch.commit();
      alert(`Berhasil menyimpan absensi untuk tanggal ${selectedDate}`);
    } catch (error) {
      console.error("Error saving attendance:", error);
      alert("Gagal menyimpan absensi.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetAttendance = async () => {
    if (!confirm(`Yakin ingin mereset/menghapus semua data absensi kelas ${selectedClass} untuk tanggal ${selectedDate}? (Ini berguna jika ada data error/nyangkut)`)) return;
    setSaving(true);
    try {
      const batch = writeBatch(db);
      
      // 1. Delete by classId
      const attQ = query(
        collection(db, 'attendance'),
        where('classId', '==', selectedClass),
        where('date', '==', selectedDate)
      );
      const existingSnap = await getDocs(attQ);
      existingSnap.forEach(doc => {
        batch.delete(doc.ref);
      });

      // 2. Also delete by studentId (to catch orphaned records from renamed classes)
      for (const student of students) {
        const studentQ = query(
          collection(db, 'attendance'),
          where('studentId', '==', student.id),
          where('date', '==', selectedDate)
        );
        const studentSnap = await getDocs(studentQ);
        studentSnap.forEach(doc => {
          batch.delete(doc.ref);
        });
      }

      await batch.commit();
      
      // Reset local state
      const resetState: Record<string, 'hadir' | 'izin' | 'sakit' | 'alpa'> = {};
      students.forEach(s => resetState[s.id] = 'alpa');
      setAttendance(resetState);
      
      alert(`Berhasil mereset absensi kelas ${selectedClass} tanggal ${selectedDate}`);
    } catch (error) {
      console.error("Error resetting attendance:", error);
      alert("Gagal mereset absensi.");
    } finally {
      setSaving(false);
    }
  };

  const stats = {
    hadir: Object.values(attendance).filter(v => v === 'hadir').length,
    izin: Object.values(attendance).filter(v => v === 'izin').length,
    sakit: Object.values(attendance).filter(v => v === 'sakit').length,
    alpa: Object.values(attendance).filter(v => v === 'alpa').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Absensi Mingguan</h2>
          <p className="text-slate-500 text-sm">Kelola kehadiran siswa harian dan mingguan</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 flex items-center space-x-2 shadow-sm text-sm text-slate-600">
            <CalendarIcon className="w-4 h-4 text-indigo-500" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none focus:outline-none font-medium cursor-pointer"
            />
          </div>
          <select 
            className="h-10 px-4 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[100px] shadow-sm"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <Button 
            onClick={handleResetAttendance} 
            disabled={saving || students.length === 0}
            variant="outline"
            className="h-10 px-4 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50"
            title="Hapus / Reset semua absensi hari ini"
          >
            Reset
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Hadir', value: stats.hadir, color: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: <CheckCircle2 className="w-4 h-4" /> },
          { label: 'Izin', value: stats.izin, color: 'bg-blue-50 text-blue-600 border-blue-100', icon: <Clock className="w-4 h-4" /> },
          { label: 'Sakit', value: stats.sakit, color: 'bg-amber-50 text-amber-600 border-amber-100', icon: <Filter className="w-4 h-4" /> },
          { label: 'Alpa', value: stats.alpa, color: 'bg-rose-50 text-rose-600 border-rose-100', icon: <XCircle className="w-4 h-4" /> },
        ].map((stat, i) => (
          <Card key={i} className={`border ${stat.color} shadow-sm rounded-2xl overflow-hidden`}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider opacity-70">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
              <div className="p-2 bg-white/50 rounded-lg">
                {stat.icon}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden bg-white">
        <CardHeader className="py-4 px-6 border-b border-slate-50 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-bold text-slate-800">Daftar Siswa Kelas {selectedClass}</CardTitle>
          <Button variant="outline" size="sm" className="h-9 rounded-xl border-slate-200">
            <Download className="w-4 h-4 mr-2" /> Rekap Excel
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-widest border-b border-slate-100">
                  <th className="px-6 py-4 w-16">No</th>
                  <th className="px-6 py-4">Nama Lengkap</th>
                  <th className="px-6 py-4 text-center">Status Kehadiran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-slate-400">
                      Memuat data siswa...
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-slate-400">
                      Tidak ada siswa di kelas ini.
                    </td>
                  </tr>
                ) : students.map((student, idx) => (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-400 font-medium">{idx + 1}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-700 text-sm uppercase">{student.displayName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center space-x-2">
                        {[
                          { id: 'hadir', label: 'H', color: 'bg-emerald-500 text-white', inactive: 'bg-slate-100 text-slate-400' },
                          { id: 'izin', label: 'I', color: 'bg-blue-500 text-white', inactive: 'bg-slate-100 text-slate-400' },
                          { id: 'sakit', label: 'S', color: 'bg-amber-500 text-white', inactive: 'bg-slate-100 text-slate-400' },
                          { id: 'alpa', label: 'A', color: 'bg-rose-500 text-white', inactive: 'bg-slate-100 text-slate-400' },
                        ].map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => setAttendance(prev => ({ ...prev, [student.id]: opt.id as any }))}
                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                              attendance[student.id] === opt.id ? opt.color : opt.inactive
                            } hover:scale-110`}
                            title={opt.id.toUpperCase()}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end">
        <Button 
          onClick={handleSaveAttendance}
          disabled={saving || loading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 rounded-xl h-12 font-bold shadow-lg shadow-indigo-200 transition-all"
        >
          {saving ? 'Menyimpan...' : `Simpan Kehadiran ${selectedDate === formatDate() ? 'Hari Ini' : selectedDate}`}
        </Button>
      </div>
    </div>
  );
}
