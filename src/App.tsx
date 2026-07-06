import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/auth/Login';
import { DashboardLayout } from './components/layout/DashboardLayout';
import StudentDashboard from './pages/student/StudentDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import ExamPage from './pages/student/Exam';

import StudentData from './pages/admin/StudentData';
import Attendance from './pages/admin/Attendance';
import Exams from './pages/admin/Exams';
import Grades from './pages/admin/Grades';

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

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<DashboardRouter />} />
            {/* Additional stub routes */}
            <Route path="students" element={<StudentData />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="exams" element={<Exams />} />
            <Route path="grades" element={<Grades />} />
            <Route path="reports" element={<div>Raport</div>} />
            <Route path="settings" element={<div>Pengaturan</div>} />
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
