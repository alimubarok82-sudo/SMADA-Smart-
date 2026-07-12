import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { 
  User, 
  Lock, 
  Bell, 
  Shield, 
  Eye, 
  EyeOff, 
  Save, 
  School,
  Smartphone,
  Globe
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'motion/react';

type Tab = 'profile' | 'security' | 'notifications' | 'appearance';

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [profile, setProfile] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
    schoolName: 'SMA Negeri 2 Malang', // Default example
  });

  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    alert('Profil berhasil diperbarui! (Simulasi)');
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      alert('Password baru tidak cocok!');
      return;
    }
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    alert('Password berhasil diperbarui! (Simulasi)');
    setPasswords({ current: '', new: '', confirm: '' });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Pengaturan</h2>
        <p className="text-slate-500 font-medium mt-1">Kelola akun dan preferensi aplikasi Anda.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Sidebar Nav */}
        <div className="space-y-2">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${activeTab === 'profile' ? 'bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100' : 'text-slate-500 hover:bg-white'}`}
          >
            <User size={18} />
            Profil Pengguna
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${activeTab === 'security' ? 'bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100' : 'text-slate-500 hover:bg-white'}`}
          >
            <Lock size={18} />
            Keamanan
          </button>
          <button 
            onClick={() => setActiveTab('notifications')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${activeTab === 'notifications' ? 'bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100' : 'text-slate-500 hover:bg-white'}`}
          >
            <Bell size={18} />
            Notifikasi
          </button>
          <button 
            onClick={() => setActiveTab('appearance')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${activeTab === 'appearance' ? 'bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100' : 'text-slate-500 hover:bg-white'}`}
          >
            <Globe size={18} />
            Tampilan & Bahasa
          </button>
        </div>

        {/* Content Area */}
        <div className="md:col-span-2 space-y-8">
          {activeTab === 'profile' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="rounded-[32px] border-slate-100 shadow-sm overflow-hidden bg-white">
              <CardHeader className="p-8 pb-0">
                <CardTitle className="text-xl font-black text-slate-800 flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                    <User size={20} />
                  </div>
                  Informasi Profil
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Nama Lengkap</label>
                      <Input 
                        value={profile.displayName}
                        onChange={(e) => setProfile({...profile, displayName: e.target.value})}
                        className="h-12 px-4 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all font-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Email Address</label>
                      <Input 
                        type="email"
                        value={profile.email}
                        disabled
                        className="h-12 px-4 rounded-xl border-slate-200 bg-slate-100 font-medium text-slate-500 cursor-not-allowed"
                      />
                      <p className="text-[10px] text-slate-400 font-medium italic">* Email dikelola oleh administrator sistem.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Sekolah / Instansi</label>
                      <div className="relative">
                        <School className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                          value={profile.schoolName}
                          onChange={(e) => setProfile({...profile, schoolName: e.target.value})}
                          className="h-12 pl-12 pr-4 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all font-medium"
                        />
                      </div>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={saving}
                    className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-100"
                  >
                    {saving ? <Smartphone className="animate-spin" size={18} /> : <Save size={18} />}
                    Simpan Perubahan
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
          )}

          {activeTab === 'security' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="rounded-[32px] border-slate-100 shadow-sm overflow-hidden bg-white">
              <CardHeader className="p-8 pb-0">
                <CardTitle className="text-xl font-black text-slate-800 flex items-center gap-3">
                  <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
                    <Lock size={20} />
                  </div>
                  Ganti Password
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <form onSubmit={handleUpdatePassword} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Password Sekarang</label>
                      <Input 
                        type="password"
                        value={passwords.current}
                        onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                        className="h-12 px-4 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Password Baru</label>
                        <div className="relative">
                          <Input 
                            type={showPassword ? "text" : "password"}
                            value={passwords.new}
                            onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                            className="h-12 px-4 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                          />
                          <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Konfirmasi Password</label>
                        <Input 
                          type="password"
                          value={passwords.confirm}
                          onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                          className="h-12 px-4 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                        />
                      </div>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={saving}
                    className="h-12 px-8 bg-slate-800 hover:bg-black text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-slate-100"
                  >
                    Perbarui Password
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
          )}

          {activeTab === 'notifications' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="rounded-[32px] border-slate-100 shadow-sm overflow-hidden bg-white">
              <CardContent className="p-8 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                      <Bell size={24} />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800">Notifikasi Push</h4>
                      <p className="text-xs text-slate-500 font-medium">Terima pemberitahuan saat ujian baru tersedia.</p>
                    </div>
                  </div>
                  <div className="w-12 h-6 bg-emerald-500 rounded-full relative cursor-pointer">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          )}

          {activeTab === 'appearance' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="rounded-[32px] border-slate-100 shadow-sm overflow-hidden bg-white">
              <CardContent className="p-8 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                      <Globe size={24} />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800">Bahasa Indonesia</h4>
                      <p className="text-xs text-slate-500 font-medium">Bahasa utama yang digunakan di aplikasi.</p>
                    </div>
                  </div>
                  <div className="text-indigo-600 font-bold text-sm">
                    Aktif
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
