import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Download, Upload, Pencil, Trash2, UserPlus, Loader2, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';

interface Student {
  id: string;
  displayName: string;
  classId: string;
}

export default function StudentData() {
  const [selectedClass, setSelectedClass] = useState('XE2');
  const [nama, setNama] = useState('');
  const [classes, setClasses] = useState<string[]>(['XE1', 'XE2', 'XE3', 'XE4']);
  const [isAddingClass, setIsAddingClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [studentsByClass, setStudentsByClass] = useState<Record<string, Student[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'siswa'));
      const querySnapshot = await getDocs(q);
      const studentsData: Student[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        studentsData.push({
          id: doc.id,
          displayName: data.displayName || 'Unknown',
          classId: data.classId || 'Unassigned'
        });
      });
      
      const grouped = studentsData.reduce((acc, student) => {
        if (!acc[student.classId]) {
          acc[student.classId] = [];
        }
        acc[student.classId].push(student);
        return acc;
      }, {} as Record<string, Student[]>);
      
      // Sort students in each class alphabetically
      Object.keys(grouped).forEach(key => {
        grouped[key].sort((a, b) => a.displayName.localeCompare(b.displayName));
      });
      
      // Add default empty classes if missing
      const fetchedClasses = Object.keys(grouped);
      const allClasses = Array.from(new Set(['XE1', 'XE2', 'XE3', 'XE4', ...fetchedClasses, ...classes])).sort();
      
      allClasses.forEach(c => {
        if (!grouped[c]) grouped[c] = [];
      });

      setClasses(allClasses);
      setStudentsByClass(grouped);
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleSimpan = async () => {
    if (!nama.trim()) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'users'), {
        displayName: nama.trim(),
        classId: selectedClass,
        role: 'siswa',
        createdAt: new Date().toISOString()
      });
      setNama('');
      fetchStudents();
    } catch (error) {
      console.error("Error saving student:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Tambah Siswa Card */}
      <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden bg-white">
        <CardHeader className="bg-white border-b border-slate-50 flex flex-row items-center justify-between py-4 px-6">
          <div className="flex items-center space-x-2">
            <UserPlus className="w-5 h-5 text-emerald-600" />
            <CardTitle className="text-lg font-bold text-emerald-800">Tambah Siswa</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" className="h-8 text-xs font-medium text-slate-600 rounded-lg">
              <Download className="w-3 h-3 mr-1.5" /> Template
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs font-medium text-blue-600 bg-blue-50 border-blue-100 hover:bg-blue-100 rounded-lg">
              <Upload className="w-3 h-3 mr-1.5" /> Upload CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 bg-white space-y-4">
          <div className="flex gap-4">
            <Input 
              placeholder="Nama" 
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className="flex-1 rounded-xl border-slate-200 h-11"
            />
            {isAddingClass ? (
              <div className="flex items-center space-x-2">
                <Input 
                  placeholder="Nama Kelas" 
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-32 rounded-xl border-slate-200 h-11"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (newClassName.trim() && !classes.includes(newClassName.trim())) {
                        setClasses(prev => Array.from(new Set([...prev, newClassName.trim()])).sort());
                        setSelectedClass(newClassName.trim());
                        if (!studentsByClass[newClassName.trim()]) {
                          setStudentsByClass(prev => ({...prev, [newClassName.trim()]: []}));
                        }
                      } else if (classes.includes(newClassName.trim())) {
                        setSelectedClass(newClassName.trim());
                      }
                      setIsAddingClass(false);
                      setNewClassName('');
                    } else if (e.key === 'Escape') {
                      setIsAddingClass(false);
                    }
                  }}
                />
                <Button 
                  size="sm" 
                  className="h-11 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                  onClick={() => {
                    if (newClassName.trim() && !classes.includes(newClassName.trim())) {
                      setClasses(prev => Array.from(new Set([...prev, newClassName.trim()])).sort());
                      setSelectedClass(newClassName.trim());
                      if (!studentsByClass[newClassName.trim()]) {
                        setStudentsByClass(prev => ({...prev, [newClassName.trim()]: []}));
                      }
                    } else if (classes.includes(newClassName.trim())) {
                      setSelectedClass(newClassName.trim());
                    }
                    setIsAddingClass(false);
                    setNewClassName('');
                  }}
                >
                  Ok
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="h-11 px-3 rounded-xl border-slate-200"
                  onClick={() => setIsAddingClass(false)}
                >
                  Batal
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <select 
                  className="h-11 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent min-w-[120px]"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                >
                  {classes.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-11 w-11 rounded-xl border-slate-200 text-slate-600 shrink-0"
                  onClick={() => setIsAddingClass(true)}
                  title="Tambah Kelas"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
          <Input 
            placeholder="Password (Opsional)" 
            type="password"
            className="rounded-xl border-slate-200 h-11"
          />
          <Button 
            onClick={handleSimpan}
            disabled={saving || !nama.trim()}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 font-medium shadow-sm transition-all"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Simpan
          </Button>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <p className="text-xs text-slate-500">
              Tip: Untuk upload banyak, gunakan file CSV dengan format: <span className="font-semibold text-slate-700">Nama, Kelas, Password(opsional)</span>.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Database Siswa Header */}
      <div>
        <h3 className="text-base font-bold text-slate-800 mb-4 px-1">Database Siswa (Klik nama untuk lihat profil)</h3>
        
        {loading ? (
           <div className="flex justify-center p-12">
             <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(studentsByClass).sort(([a], [b]) => a.localeCompare(b)).map(([className, students], i) => (
              <motion.div
                key={className}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden h-[250px] flex flex-col">
                  <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between sticky top-0 z-10">
                    <CardTitle className="text-sm font-bold text-slate-800">{className}</CardTitle>
                    <div className="bg-white border border-slate-200 text-slate-600 text-[11px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                      {students.length}
                    </div>
                  </CardHeader>
                  <div className="flex-1 overflow-y-auto p-0">
                    {students.length === 0 ? (
                       <div className="flex items-center justify-center h-full text-xs text-slate-400">
                         Belum ada siswa
                       </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {students.map((student, idx) => (
                          <div key={student.id} className="flex items-center justify-between p-3 px-4 hover:bg-slate-50 transition-colors group cursor-pointer">
                            <div className="text-xs font-medium text-slate-700">
                              <span className="text-slate-400 mr-1.5">{idx + 1}.</span> {student.displayName}
                            </div>
                            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-md transition-colors">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button className="text-red-500 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                        {/* Add extra padding at bottom to match scroll UI */}
                        <div className="h-4"></div>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
