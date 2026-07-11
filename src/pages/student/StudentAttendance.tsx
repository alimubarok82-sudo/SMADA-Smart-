import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Clock, CheckCircle2, Loader2, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function StudentAttendance() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);
  const [checkInData, setCheckInData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  const today = new Date().toLocaleDateString('en-CA');

  useEffect(() => {
    if (user) {
      checkTodayStatus();
      fetchHistory();
    }
  }, [user]);

  const checkTodayStatus = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'attendance'),
        where('studentId', '==', user.uid),
        where('date', '==', today),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        setAlreadyCheckedIn(true);
        setCheckInData(snap.docs[0].data());
      }
    } catch (error) {
      console.error("Error checking attendance status:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'attendance'),
        where('studentId', '==', user.uid),
        orderBy('date', 'desc'),
        limit(10)
      );
      const snap = await getDocs(q);
      const historyData = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setHistory(historyData);
    } catch (error) {
      console.error("Error fetching attendance history:", error);
    }
  };

  const handleCheckIn = async () => {
    if (!user || alreadyCheckedIn) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'attendance'), {
        studentId: user.uid,
        studentName: user.displayName,
        classId: (user as any).classId || 'Unknown',
        date: today,
        timestamp: serverTimestamp(),
        status: 'hadir'
      });
      setAlreadyCheckedIn(true);
      setCheckInData({
        timestamp: new Date(),
        status: 'hadir'
      });
      fetchHistory();
    } catch (error) {
      console.error("Error checking in:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-12 h-12 animate-spin mb-4 text-indigo-500" />
        <p className="font-bold uppercase tracking-widest text-xs text-center">Menyiapkan Sistem Presensi...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Check-in</h2>
        <p className="text-slate-500 text-sm font-medium mt-1">Silahkan melakukan check-in kehadiran hari ini.</p>
      </div>

      <Card className="rounded-3xl border-slate-100 shadow-xl shadow-slate-200/50 bg-white overflow-hidden border-2">
        <CardContent className="p-8">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className={`w-24 h-24 rounded-3xl flex items-center justify-center shadow-lg transition-all duration-500 ${
              alreadyCheckedIn 
                ? 'bg-emerald-500 text-white scale-110 rotate-3' 
                : 'bg-indigo-50 text-indigo-600'
            }`}>
              {alreadyCheckedIn ? <CheckCircle2 size={48} /> : <Calendar size={48} />}
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-800">
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h3>
              <p className="text-slate-400 text-sm font-medium">Tahun Ajaran 2024/2025</p>
            </div>

            {alreadyCheckedIn ? (
              <div className="w-full bg-emerald-50 border border-emerald-100 rounded-2xl p-6 space-y-3">
                <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold">
                  <CheckCircle2 size={20} />
                  <span>Anda Sudah Check-in!</span>
                </div>
                <div className="flex flex-col items-center text-xs text-emerald-700 font-medium space-y-1">
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    <span>Waktu: {checkInData.timestamp?.toDate ? checkInData.timestamp.toDate().toLocaleTimeString('id-ID') : new Date().toLocaleTimeString('id-ID')} WIB</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <Button 
                  onClick={handleCheckIn}
                  disabled={isSubmitting}
                  className="w-full h-16 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg shadow-xl shadow-indigo-200 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <><Loader2 className="mr-2 animate-spin" /> Memproses...</>
                  ) : (
                    "Check-in Sekarang"
                  )}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3">
        <Clock className="text-amber-500 shrink-0" size={20} />
        <p className="text-xs text-amber-700 font-medium leading-relaxed">
          <strong>Penting:</strong> Check-in hanya dapat dilakukan satu kali setiap hari. Jika Anda berhalangan hadir (Sakit/Izin), silahkan hubungi wali kelas.
        </p>
      </div>

      {history.length > 0 && (
        <Card className="rounded-3xl border-slate-100 shadow-sm bg-white overflow-hidden">
          <div className="p-6 border-b border-slate-50">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Riwayat Presensi</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-3">Tanggal</th>
                  <th className="px-6 py-3">Waktu</th>
                  <th className="px-6 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {history.map((item) => (
                  <tr key={item.id} className="text-sm">
                    <td className="px-6 py-4 font-bold text-slate-700">
                      {new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium">
                      {item.timestamp?.toDate ? item.timestamp.toDate().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'} WIB
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${
                        item.status === 'hadir' ? 'bg-emerald-50 text-emerald-600' :
                        item.status === 'izin' ? 'bg-blue-50 text-blue-600' :
                        item.status === 'sakit' ? 'bg-amber-50 text-amber-600' :
                        'bg-rose-50 text-rose-600'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
