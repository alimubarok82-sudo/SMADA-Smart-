import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, CheckCircle, Circle } from 'lucide-react';
import { motion } from 'motion/react';

const normalize = (str: string) => str ? str.replace(/\s+/g, '').toUpperCase() : '';

interface Material {
  id: string;
  title: string;
  url: string;
  bab?: string;
  chapterTitle?: string;
  targetClasses: string[];
  completedClasses: string[];
  isActive: boolean;
  createdAt: any;
}

export default function StudentMaterials() {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMaterials();
    }
  }, [user]);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'materials'), where('isActive', '==', true), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Material[];
      
      const studentClass = (user as any)?.classId || '';
      const normalizedStudentClass = normalize(studentClass);

      const filtered = list.filter(m => {
        const targets = m.targetClasses || [];
        return targets.includes(studentClass) || targets.map(c => normalize(c)).includes(normalizedStudentClass);
      });
      
      // Sort by creation time ascending to mimic chapter ordering conceptually
      filtered.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeA - timeB;
      });

      setMaterials(filtered);
    } catch (error) {
      console.error("Error fetching materials:", error);
    } finally {
      setLoading(false);
    }
  };

  // Group materials by Bab/Chapter
  const groupedMaterials: Record<string, { groupTitle: string, items: Material[] }> = {};
  
  materials.forEach(m => {
    const bab = m.bab || "Bab 1";
    const title = m.chapterTitle || "Materi Umum";
    const key = `${bab}_${title}`;
    
    if (!groupedMaterials[key]) {
      groupedMaterials[key] = { groupTitle: title, items: [] };
    }
    groupedMaterials[key].items.push(m);
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mb-4" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Memuat Daftar Isi...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto pb-24">
      <div className="mb-10">
        <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Daftar Isi & Materi</h1>
        <p className="text-slate-500 font-medium">Pelajari materi sesuai urutan bab yang tersedia.</p>
      </div>

      {Object.keys(groupedMaterials).length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-slate-400 font-medium">Belum ada materi untuk kelas Anda.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {Object.entries(groupedMaterials).map(([key, group], idx) => {
            const babName = key.split('_')[0];
            return (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                key={key} 
                className="relative pl-2 md:pl-4"
              >
                {/* Group Header */}
                <div className="flex items-stretch relative z-10 w-full sm:w-11/12 md:w-3/4">
                   {/* Badge */}
                   <div className="bg-slate-100 border-2 border-slate-500 rounded-full px-4 md:px-6 py-2 flex items-center justify-center font-bold text-sm text-slate-700 shadow-sm z-20 relative min-w-[80px]">
                     {babName}
                   </div>
                   {/* Title */}
                   <div className="bg-slate-300 border-y-2 border-r-2 border-slate-500 rounded-r-xl flex-1 ml-[-20px] pl-8 pr-4 py-2 flex items-center font-bold text-slate-800 shadow-sm z-10 text-sm md:text-base">
                     {group.groupTitle}
                   </div>
                </div>

                {/* Vertical Tree Line */}
                <div className="absolute left-[40px] md:left-[48px] top-[40px] bottom-4 w-0.5 bg-slate-400 z-0"></div>

                {/* Items */}
                <div className="mt-2 ml-[70px] md:ml-[90px] flex flex-col relative z-10 shadow-sm w-full sm:w-11/12 md:w-3/4">
                  {group.items.map((item, itemIdx) => {
                     const isCompleted = (item.completedClasses || []).includes((user as any)?.classId);
                     
                     return (
                       <div key={item.id} className="relative bg-white border-x-2 border-b-2 border-slate-400 p-3 md:p-4 first:border-t-2 flex items-center justify-between group hover:bg-slate-50 transition-colors">
                          {/* Horizontal Branch */}
                          <div className="absolute -left-[32px] md:-left-[44px] top-1/2 w-[32px] md:w-[44px] h-0.5 bg-slate-400"></div>
                          {/* Connecting Dot */}
                          <div className="absolute -left-[36px] md:-left-[48px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-slate-500 border-[3px] border-slate-100"></div>

                          <div className="flex-1 pr-4">
                             <a href={item.url} target="_blank" rel="noreferrer" className="font-semibold text-slate-700 group-hover:text-indigo-700 text-sm md:text-base inline-block">
                               {item.title}
                             </a>
                          </div>

                          {/* Status */}
                          <div className="shrink-0 flex items-center justify-center">
                             {isCompleted ? (
                               <CheckCircle className="text-emerald-500 w-5 h-5 md:w-6 md:h-6" />
                             ) : (
                               <Circle className="text-slate-300 w-5 h-5 md:w-6 md:h-6" />
                             )}
                          </div>
                       </div>
                     );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
