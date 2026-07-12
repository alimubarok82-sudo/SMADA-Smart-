import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Download, Upload, Pencil, Trash2, UserPlus, Loader2, Plus, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, getDocs, query, where, addDoc, orderBy, writeBatch, doc as firestoreDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';

interface Student {
  id: string;
  displayName: string;
  classId: string;
}

export default function StudentData() {
  const [selectedClass, setSelectedClass] = useState('');
  const [nama, setNama] = useState('');
  const [password, setPassword] = useState('');
  const [classes, setClasses] = useState<string[]>([]);
  const [isAddingClass, setIsAddingClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [studentsByClass, setStudentsByClass] = useState<Record<string, Student[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{success: boolean, message: string} | null>(null);
  const [editingStudent, setEditingStudent] = useState<(Student & { password?: string }) | null>(null);
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchClasses = async () => {
    try {
      const q = query(collection(db, 'classes'), orderBy('name'));
      const snap = await getDocs(q);
      const classList = snap.docs.map(doc => doc.data().name).filter(Boolean);
      
      // Also check students for classes
      const studentsSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'siswa')));
      const classesFromStudents = new Set<string>();
      studentsSnap.docs.forEach(d => {
        const cId = d.data().classId;
        if (cId) classesFromStudents.add(cId);
      });

      const combined = Array.from(new Set([...classList, ...Array.from(classesFromStudents)]))
        .filter(Boolean)
        .sort();
      
      if (combined.length === 0) {
        // Only use defaults if absolutely no classes found anywhere
        const defaults = ['XE1', 'XE2', 'XE3', 'XE4'];
        setClasses(defaults);
        setSelectedClass(defaults[0]);
      } else {
        setClasses(combined);
        if (!selectedClass || !combined.includes(selectedClass)) {
          setSelectedClass(combined[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
    }
  };

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
          classId: data.classId || 'Unassigned',
          password: data.password || ''
        } as any);
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
      
      setStudentsByClass(grouped);
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchClasses();
      await fetchStudents();
    };
    init();
  }, []);

  const handleSimpan = async () => {
    if (!nama.trim()) return;

    // Check for duplicates in current class
    const existingInClass = studentsByClass[selectedClass] || [];
    if (existingInClass.some(s => s.displayName.toLowerCase() === nama.trim().toLowerCase())) {
      alert(`Siswa dengan nama "${nama.trim()}" sudah ada di kelas ${selectedClass}`);
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, 'users'), {
        displayName: nama.trim(),
        classId: selectedClass,
        role: 'siswa',
        password: password.trim() || '123456', // Default password if empty
        createdAt: new Date().toISOString()
      });
      setNama('');
      setPassword('');
      fetchStudents();
    } catch (error) {
      console.error("Error saving student:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddClass = async () => {
    const trimmed = newClassName.trim();
    if (trimmed && !classes.includes(trimmed)) {
      try {
        await addDoc(collection(db, 'classes'), { name: trimmed });
        const updatedClasses = [...classes, trimmed].sort();
        setClasses(updatedClasses);
        setSelectedClass(trimmed);
        if (!studentsByClass[trimmed]) {
          setStudentsByClass(prev => ({...prev, [trimmed]: []}));
        }
        setIsAddingClass(false);
        setNewClassName('');
      } catch (error) {
        console.error("Error adding class:", error);
      }
    }
  };

  const handleUpdate = async () => {
    if (!editingStudent || !editingStudent.displayName.trim()) return;
    setSaving(true);
    try {
      const { updateDoc } = await import('firebase/firestore');
      await updateDoc(firestoreDoc(db, 'users', editingStudent.id), {
        displayName: editingStudent.displayName.trim(),
        classId: editingStudent.classId,
        password: editingStudent.password || '123456'
      });
      setEditingStudent(null);
      fetchStudents();
    } catch (error) {
      console.error("Error updating student:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus data siswa ini? Semua nilai, presensi, dan tugas siswa ini juga akan terhapus.')) return;
    setLoading(true);
    try {
      const { deleteDoc } = await import('firebase/firestore');
      const batch = writeBatch(db);
      
      // 1. Delete student record
      batch.delete(firestoreDoc(db, 'users', id));
      
      // 2. Cleanup related data
      const collections = ['exam_results', 'attendance', 'submissions'];
      for (const col of collections) {
        const q = query(collection(db, col), where('studentId', '==', id));
        const snap = await getDocs(q);
        snap.forEach(d => {
          batch.delete(firestoreDoc(db, col, d.id));
        });
      }
      
      await batch.commit();
      fetchStudents();
      setUploadStatus({ success: true, message: "Data siswa dan seluruh riwayatnya berhasil dihapus." });
    } catch (error) {
      console.error("Error deleting student:", error);
      alert("Gagal menghapus data siswa.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = async (className: string) => {
    if (!confirm(`Hapus seluruh data kelas "${className}"? Tindakan ini akan menghapus permanen:\n1. Seluruh data siswa di kelas ini\n2. Seluruh riwayat presensi siswa tersebut\n3. Seluruh nilai ujian siswa tersebut\n\nPastikan Anda sudah membackup data jika diperlukan.`)) return;
    
    setLoading(true);
    try {
      const batch = writeBatch(db);
      
      // Helper function to normalize text for robust comparison
      // Removes spaces, hyphens, and dots to treat "XI-F4", "XI.F4", and "XIF4" as same
      const normalize = (s: string) => s?.trim().toUpperCase().replace(/[\s\-\.]/g, '') || '';
      const targetNormalized = normalize(className);

      // 1. Get all students and filter client-side
      const studentsSnap = await getDocs(collection(db, 'users'));
      const studentDocsToDelete = studentsSnap.docs.filter(d => normalize(d.data().classId) === targetNormalized);
      const studentIdsToDelete = studentDocsToDelete.map(d => d.id);
      
      studentDocsToDelete.forEach(d => {
        batch.delete(firestoreDoc(db, 'users', d.id));
      });
      
      // 2. Get the class documents and filter
      const classesSnap = await getDocs(collection(db, 'classes'));
      const classDocsToDelete = classesSnap.docs.filter(d => normalize(d.data().name) === targetNormalized);
      
      classDocsToDelete.forEach(d => {
        batch.delete(firestoreDoc(db, 'classes', d.id));
      });

      // 3. Cleanup related data (exam_results, attendance, submissions)
      // We check BOTH classId AND studentId for maximum reliability
      const collections = ['exam_results', 'attendance', 'submissions'];
      for (const col of collections) {
        const colSnap = await getDocs(collection(db, col));
        const docsToDelete = colSnap.docs.filter(d => {
          const data = d.data();
          const matchesClass = normalize(data.classId) === targetNormalized;
          const matchesStudent = data.studentId && studentIdsToDelete.includes(data.studentId);
          return matchesClass || matchesStudent;
        });
        
        docsToDelete.forEach(d => {
          batch.delete(firestoreDoc(db, col, d.id));
        });
      }
      
      await batch.commit();
      
      // Refresh local state
      await fetchClasses();
      await fetchStudents();
      
      setUploadStatus({ 
        success: true, 
        message: `Database berhasil dibersihkan. Seluruh data terkait kelas "${className}" dan riwayat siswanya telah dihapus.` 
      });
    } catch (error) {
      console.error("Error deleting class:", error);
      alert("Gagal menghapus data kelas secara menyeluruh.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetOrphanedData = async () => {
    if (!confirm('Fitur ini akan membersihkan data absensi dan nilai ujian yang usang/nyangkut (misalnya karena kelas dihapus sebelumnya). Lanjutkan?')) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      
      // Get all valid users
      const usersSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'siswa')));
      const validStudentIds = new Set(usersSnap.docs.map(d => d.id));
      
      let deletedCount = 0;
      
      const collections = ['exam_results', 'attendance', 'submissions'];
      for (const col of collections) {
        const colSnap = await getDocs(collection(db, col));
        colSnap.docs.forEach(doc => {
          const data = doc.data();
          // If the studentId in the record no longer exists in users collection, it's orphaned
          if (data.studentId && !validStudentIds.has(data.studentId)) {
            batch.delete(doc.ref);
            deletedCount++;
          }
        });
      }
      
      if (deletedCount > 0) {
        await batch.commit();
        alert(`Berhasil membersihkan ${deletedCount} data sampah (absensi & nilai) dari sistem.`);
        setUploadStatus({ success: true, message: `Berhasil membersihkan ${deletedCount} data sampah.` });
      } else {
        alert("Sistem sudah bersih, tidak ada data sampah ditemukan.");
        setUploadStatus({ success: true, message: `Sistem sudah bersih.` });
      }
      
    } catch (error) {
      console.error("Error cleaning up orphaned data:", error);
      alert("Terjadi kesalahan saat membersihkan data.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = ['Nama', 'Kelas', 'Password'];
    const rows = [
      ['Ahmad Faisal', 'XE1', '123456'],
      ['Siti Aminah', 'XE2', '654321'],
      ['Budi Santoso', 'XE1', ''],
    ];
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_siswa.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      setUploading(true);
      setUploadStatus(null);
      
      try {
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        if (lines.length <= 1) {
          throw new Error("File CSV kosong atau tidak valid.");
        }

        const dataRows = lines.slice(1);
        const batch = writeBatch(db);
        const usersRef = collection(db, 'users');
        const classesRef = collection(db, 'classes');
        
        let count = 0;
        let skipped = 0;
        const newClassesFound = new Set<string>();

        // Create a lookup for current students to check for duplicates
        const existingLookup: Record<string, Set<string>> = {};
        (Object.entries(studentsByClass) as [string, Student[]][]).forEach(([cId, students]) => {
          existingLookup[cId] = new Set(students.map(s => s.displayName.toLowerCase()));
        });

        for (const line of dataRows) {
          // Simple CSV parser that handles commas inside quotes if needed (but here we assume simple CSV)
          const [nama, kelas, pass] = line.split(',').map(s => s.trim());
          
          if (nama && kelas) {
            // Check if already exists in this class
            const isDuplicate = existingLookup[kelas]?.has(nama.toLowerCase());

            if (!isDuplicate) {
              const studentRef = firestoreDoc(usersRef);
              batch.set(studentRef, {
                displayName: nama,
                classId: kelas,
                role: 'siswa',
                password: pass || '123456',
                createdAt: new Date().toISOString()
              });
              
              if (!classes.includes(kelas)) {
                newClassesFound.add(kelas);
              }

              // Update lookup to handle duplicates within the CSV itself
              if (!existingLookup[kelas]) existingLookup[kelas] = new Set();
              existingLookup[kelas].add(nama.toLowerCase());

              count++;
            } else {
              skipped++;
            }
          }
        }

        // Also add new classes if any
        for (const cls of newClassesFound) {
          const classRef = firestoreDoc(classesRef);
          batch.set(classRef, { name: cls });
        }

        if (count > 0) {
          await batch.commit();
          const message = skipped > 0 
            ? `Berhasil mengimpor ${count} siswa. (${skipped} siswa dilewati karena sudah ada).`
            : `Berhasil mengimpor ${count} siswa.`;
          setUploadStatus({ success: true, message });
          await fetchClasses();
          await fetchStudents();
        } else if (skipped > 0) {
          setUploadStatus({ success: true, message: `Tidak ada data baru. ${skipped} siswa sudah ada dalam database.` });
        } else {
          throw new Error("Tidak ada data siswa yang valid ditemukan.");
        }
      } catch (error: any) {
        setUploadStatus({ success: false, message: error.message || "Gagal mengupload file." });
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Upload Notification */}
      <AnimatePresence>
        {uploadStatus && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-4 rounded-2xl border flex items-center gap-3 ${
              uploadStatus.success 
                ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                : 'bg-rose-50 border-rose-100 text-rose-700'
            }`}
          >
            {uploadStatus.success ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <p className="text-sm font-bold">{uploadStatus.message}</p>
            <button 
              onClick={() => setUploadStatus(null)}
              className="ml-auto p-1 hover:bg-black/5 rounded-full transition-colors"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept=".csv" 
        className="hidden" 
      />

      {/* Tambah Siswa Card */}
      <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden bg-white">
        <CardHeader className="bg-white border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between py-4 px-6 gap-4">
          <div className="flex items-center space-x-2">
            <UserPlus className="w-5 h-5 text-emerald-600" />
            <CardTitle className="text-lg font-bold text-emerald-800">Tambah Siswa</CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 text-xs font-medium text-rose-600 border-rose-100 hover:bg-rose-50 rounded-lg"
              onClick={handleResetOrphanedData}
              title="Bersihkan data absensi & nilai dari kelas/siswa yang sudah dihapus"
            >
              <Trash2 className="w-3 h-3 mr-1.5" /> Bersihkan Data Error
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 text-xs font-medium text-slate-600 rounded-lg"
              onClick={handleDownloadTemplate}
            >
              <Download className="w-3 h-3 mr-1.5" /> Template
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 text-xs font-medium text-blue-600 bg-blue-50 border-blue-100 hover:bg-blue-100 rounded-lg"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Upload className="w-3 h-3 mr-1.5" />}
              {uploading ? 'Mengupload...' : 'Upload CSV'}
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
                      handleAddClass();
                    } else if (e.key === 'Escape') {
                      setIsAddingClass(false);
                    }
                  }}
                />
                <Button 
                  size="sm" 
                  className="h-11 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                  onClick={handleAddClass}
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
            placeholder="Password (Opsional, Default: 123456)" 
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
            {(Object.entries(studentsByClass) as [string, Student[]][]).sort(([a], [b]) => a.localeCompare(b)).map(([className, students], i) => (
              <motion.div
                key={className}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden h-[250px] flex flex-col">
                  <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-sm font-bold text-slate-800">{className}</CardTitle>
                      <button 
                        onClick={() => handleDeleteClass(className)}
                        className="text-rose-300 hover:text-rose-600 transition-colors p-1.5 hover:bg-rose-50 rounded-lg"
                        title="Hapus Seluruh Data Kelas & Siswa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
                            <div className="text-xs font-medium text-slate-700" onClick={() => setEditingStudent(student)}>
                              <span className="text-slate-400 mr-1.5">{idx + 1}.</span> {student.displayName}
                              <span className="ml-2 text-[10px] text-slate-400 font-normal">({(student as any).password || '***'})</span>
                            </div>
                            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => setEditingStudent(student)}
                                className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-md transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => handleDelete(student.id)}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition-colors"
                              >
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

      {/* Edit Student Modal */}
      <AnimatePresence>
        {editingStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-800">Edit Profil Siswa</h3>
                <button onClick={() => setEditingStudent(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nama Siswa</label>
                  <Input 
                    value={editingStudent.displayName}
                    onChange={(e) => setEditingStudent({...editingStudent, displayName: e.target.value})}
                    className="rounded-xl border-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Kelas</label>
                  <select 
                    className="w-full h-11 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={editingStudent.classId}
                    onChange={(e) => setEditingStudent({...editingStudent, classId: e.target.value})}
                  >
                    {classes.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Password Baru / Reset</label>
                  <Input 
                    value={editingStudent.password || ''}
                    onChange={(e) => setEditingStudent({...editingStudent, password: e.target.value})}
                    className="rounded-xl border-slate-200 font-mono"
                  />
                  <p className="text-[10px] text-slate-400 italic">Siswa akan menggunakan password ini untuk login.</p>
                </div>
              </div>
              <div className="p-6 pt-2 flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1 rounded-xl h-12"
                  onClick={() => setEditingStudent(null)}
                >
                  Batal
                </Button>
                <Button 
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12"
                  onClick={handleUpdate}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Simpan Perubahan
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
