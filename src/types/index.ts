export type Role = 'admin' | 'guru' | 'siswa';

export interface User {
  uid: string;
  email: string;
  displayName: string | null;
  role: Role;
  nisn?: string;
  classId?: string;
}

export interface Exam {
  id: string;
  title: string;
  subject: string;
  teacher: string;
  questionCount: number;
  durationMinutes: number;
  kkm: number;
  date: string;
  status: 'published' | 'draft';
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  status: 'hadir' | 'izin' | 'sakit' | 'alpha';
  checkInTime?: string;
  checkOutTime?: string;
  location?: { lat: number; lng: number };
  selfieUrl?: string;
}
