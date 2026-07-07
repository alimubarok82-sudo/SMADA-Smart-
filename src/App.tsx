import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/auth/Login';
import { DashboardLayout } from './components/layout/DashboardLayout';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentResults from './pages/student/StudentResults';
import StudentAttendance from './pages/student/StudentAttendance';
import SettingsPage from './pages/shared/Settings';
import AdminDashboard from './pages/admin/AdminDashboard';
import ExamPage from './pages/student/Exam';

import StudentData from './pages/admin/StudentData';
import Attendance from './pages/admin/Attendance';
import Exams from './pages/admin/Exams';
import ExamResults from './pages/admin/ExamResults';
import Grades from './pages/admin/Grades';
import Submissions from './pages/admin/Submissions';

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  
  return <>{children}</>;
};

const DashboardRouter = () => {
  const { user } = useAuth();
  if (user?.role === 'admin' || user?.role === 'guru') {
    return <AdminDashboard />;
  }
  return <StudentDashboard />;
};

const ExamRouter = () => {
  const { user } = useAuth();
  if (user?.role === 'admin' || user?.role === 'guru') {
    return <Exams />;
  }
  return <StudentResults />;
};

const AttendanceRouter = () => {
  const { user } = useAuth();
  if (user?.role === 'admin' || user?.role === 'guru') {
    return <Attendance />;
  }
  return <StudentAttendance />;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<DashboardRouter />} />
            
            {/* Admin/Guru Only Routes */}
            <Route path="students" element={<ProtectedRoute allowedRoles={['admin', 'guru']}><StudentData /></ProtectedRoute>} />
            <Route path="grades" element={<ProtectedRoute allowedRoles={['admin', 'guru']}><Grades /></ProtectedRoute>} />
            <Route path="submissions" element={<ProtectedRoute allowedRoles={['admin', 'guru']}><Submissions /></ProtectedRoute>} />
            
            {/* Shared Path, Different Components */}
            <Route path="exams" element={<ExamRouter />} />
            <Route path="exams/results/:id" element={<ExamResults />} />
            <Route path="attendance" element={<AttendanceRouter />} />
            
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="/exam/:id" element={
            <ProtectedRoute allowedRoles={['siswa']}>
              <ExamPage />
            </ProtectedRoute>
          } />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
