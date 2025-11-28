import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Lock, Mail, Loader2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault(); 
    if (loading) return; 
    setLoading(true);

    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Ambil Profile Role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
          // Fallback jika profile belum dibuat
          toast.error("Profil pengguna tidak ditemukan.");
          setLoading(false);
          return;
      }

      toast.success(`Selamat datang!`, { duration: 3000, position: 'top-center' });

      // Redirect Sesuai Role
      const target = 
          profile.role === 'hrd' ? '/hrd/dashboard' :
          profile.role === 'manager' ? '/manager/dashboard' :
          profile.role === 'dfd' ? '/dfd/dashboard' :
          '/employee/dashboard';
      
      // Gunakan replace: true agar tombol back browser tidak kembali ke login
      navigate(target, { replace: true });

    } catch (error) {
       toast.error(error.message === "Invalid login credentials" ? "Email atau password salah." : error.message);
       setLoading(false); 
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-md border border-white/50 backdrop-blur-xl">
        <div className="text-center mb-8">
          <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-200 transform rotate-3">
             <Lock className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Portal Pegawai</h1>
          <p className="text-slate-500 text-sm mt-2">Silahkan masuk menggunakan akun kantor.</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Email</label>
            <div className="relative group">
                <Mail className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                <input 
                    type="email" 
                    required 
                    className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-700" 
                    placeholder="nama@perusahaan.com"
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Password</label>
            <div className="relative group">
                <Lock className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                <input 
                    type="password" 
                    required 
                    className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-700" 
                    placeholder="••••••••"
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                />
            </div>
          </div>
          
          <div className="pt-2">
              <button disabled={loading} className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 flex justify-center items-center gap-2 shadow-xl shadow-blue-200 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed">
                {loading ? <Loader2 className="animate-spin" /> : <>Masuk Sistem <ArrowRight size={18}/></>}
              </button>
          </div>
        </form>
      </div>
    </div>
  );
}