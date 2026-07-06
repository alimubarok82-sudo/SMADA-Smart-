import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  BookOpen, 
  LayoutDashboard, 
  LogOut, 
  Menu, 
  X, 
  CheckCircle,
  FileText,
  Users,
  Settings,
  Bell,
  Send
} from 'lucide-react';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';
import { Button } from '../ui/button';

export const DashboardLayout = () => {
  const { user, logoutDemo } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    if (localStorage.getItem('demo_user')) {
      logoutDemo();
      navigate('/login');
      return;
    }
    await signOut(auth);
    navigate('/login');
  };

  const getNavItems = () => {
    if (user?.role === 'admin' || user?.role === 'guru') {
      return [
        { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
        { name: 'Leger Nilai', path: '/dashboard/grades', icon: <BookOpen size={20} /> },
        { name: 'Portofolio', path: '/dashboard/submissions', icon: <Send size={20} /> },
        { name: 'Absensi', path: '/dashboard/attendance', icon: <CheckCircle size={20} /> },
        { name: 'Sistem Ujian', path: '/dashboard/exams', icon: <FileText size={20} /> },
        { name: 'Data Siswa', path: '/dashboard/students', icon: <Users size={20} /> },
        { name: 'Pengaturan', path: '/dashboard/settings', icon: <Settings size={20} /> },
      ];
    }
    
    // Siswa defaults
    return [
      { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
      { name: 'Ujian Aktif', path: '/dashboard/exams', icon: <FileText size={20} /> },
    ];
  };

  const navItems = getNavItems();

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-white border-r border-slate-200 flex flex-col shrink-0 transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-slate-100 flex items-center space-x-3 bg-gradient-to-br from-indigo-600 to-purple-700">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm shadow-inner shrink-0">
            <div className="w-4 h-4 bg-white rounded-sm rotate-45"></div>
          </div>
          <span className="text-white font-bold tracking-tight text-lg whitespace-nowrap overflow-hidden text-ellipsis">SMADA INFORMATIKA</span>
          <button className="lg:hidden ml-auto shrink-0" onClick={() => setSidebarOpen(false)}>
            <X size={24} className="text-white" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Main Menu</div>
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === '/dashboard'}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-colors font-medium ${
                  isActive 
                    ? 'bg-indigo-50 text-indigo-700' 
                    : 'text-slate-500 hover:bg-slate-50'
                }`
              }
              onClick={() => setSidebarOpen(false)}
            >
              {item.icon}
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 m-4 bg-slate-100 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600">Status Server</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </div>
          <div className="text-[10px] text-slate-400">Aktif: TP 2023/2024 (Genap)</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 lg:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-4">
            <button 
              className="lg:hidden text-slate-500 hover:text-slate-700"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            <h1 className="text-xl font-bold text-slate-800 hidden sm:block">
              Dashboard {user?.role === 'admin' ? 'Administrator' : user?.role === 'guru' ? 'Guru' : 'Siswa'}
            </h1>
            <div className="hidden sm:flex items-center space-x-1 bg-slate-100 px-3 py-1 rounded-full text-xs text-slate-500">
              <span className="font-medium">Home</span>
              <span className="mx-1">/</span>
              <span>Overview</span>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <button className="relative p-2 text-slate-400 hover:text-indigo-600 transition-colors">
              <Bell size={24} />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full"></span>
            </button>
            <div className="flex items-center space-x-3 pl-6 border-l border-slate-200">
              <div className="text-right hidden md:block">
                <div className="text-sm font-bold text-slate-800">{user?.displayName || 'User'}</div>
                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">{user?.role || 'Siswa'}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-100 to-indigo-200 border-2 border-white shadow-sm flex items-center justify-center text-indigo-600 font-bold shrink-0">
                {user?.displayName?.substring(0, 2).toUpperCase() || 'U'}
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-500 hover:text-red-600 shrink-0">
                <LogOut size={20} />
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 lg:p-8 bg-slate-50">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
