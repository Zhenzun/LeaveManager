import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { calculateWorkingDays, calculateQuotaByTenure } from '../utils/dateUtils'; // IMPORT BARU
import { 
  ArrowLeft, Mail, Phone, MapPin, Calendar, Briefcase, 
  Shield, Clock, CheckCircle, XCircle, UserCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function UserDetail() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [holidays, setHolidays] = useState([]); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: hols } = await supabase.from('public_holidays').select('date');
      const holidayList = hols ? hols.map(h => h.date) : [];
      setHolidays(holidayList);

      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*, manager:manager_id(full_name)')
        .eq('id', id)
        .single();
      
      if (userError) throw userError;
      setProfile(userData);

      const { data: historyData, error: historyError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', id)
        .order('created_at', { ascending: false });

      if (historyError) throw historyError;
      setHistory(historyData || []);

    } catch (err) {
      toast.error("Gagal memuat data");
      navigate('/users');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-400">Memuat profil...</div>;
  if (!profile) return null;

  // --- LOGIKA BARU ---
  // 1. Total Kuota berdasarkan Masa Kerja
  const totalQuota = calculateQuotaByTenure(profile.join_date);

  // 2. Saldo Real diambil LANGSUNG dari Database (karena sudah dikelola sistem encashment/reset)
  // Kita tidak menghitung ulang manual disini agar sinkron dengan hasil "Cairkan"
  const currentBalance = profile.leave_balance;

  // 3. Hitung yang terpakai (hanya untuk info progress bar)
  const usedQuota = totalQuota - currentBalance;
  const usagePercent = totalQuota > 0 ? Math.min(100, (usedQuota / totalQuota) * 100) : 0;

  const approvedHistory = history.filter(h => h.status === 'approved');
  const totalRejected = history.filter(h => h.status === 'rejected').length;

  return (
    <div className="p-8 max-w-6xl mx-auto min-h-screen animate-in fade-in slide-in-from-bottom-4">
      
      <button onClick={() => navigate('/users')} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-sm transition-colors">
        <ArrowLeft size={16}/> Kembali ke Daftar
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        <div className="h-32 bg-gradient-to-r from-slate-800 to-blue-900"></div>
        <div className="px-8 pb-8">
          <div className="flex flex-col md:flex-row gap-6 items-start -mt-12">
            <div className="relative">
              <div className="w-32 h-32 rounded-2xl border-4 border-white shadow-md bg-slate-100 overflow-hidden">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover"/>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-600 text-4xl font-bold">{profile.full_name.charAt(0)}</div>
                )}
              </div>
              <span className={`absolute bottom-2 right-[-10px] px-3 py-1 rounded-full text-xs font-bold border-2 border-white uppercase shadow-sm ${profile.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{profile.status}</span>
            </div>
            <div className="flex-1 pt-14 md:pt-12">
              <h1 className="text-3xl font-bold text-slate-800">{profile.full_name}</h1>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500">
                <span className="flex items-center gap-1"><Briefcase size={14}/> {profile.role}</span>
                <span className="flex items-center gap-1"><Shield size={14}/> Dept: {profile.department}</span>
                <span className="flex items-center gap-1"><MapPin size={14}/> Jakarta HQ</span>
                <span className="flex items-center gap-1"><Calendar size={14}/> Join: {new Date(profile.join_date).toLocaleDateString('id-ID')}</span>
              </div>
            </div>
            <div className="mt-4 md:mt-12 bg-slate-50 p-4 rounded-xl border border-slate-100 min-w-[250px]">
              <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">Informasi Kontak</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-700"><Mail size={14} className="text-blue-500"/> {profile.email}</div>
                <div className="flex items-center gap-2 text-slate-700"><Phone size={14} className="text-blue-500"/> {profile.phone || '-'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-1 space-y-6">
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Clock size={18} className="text-blue-600"/> Saldo Cuti Tahunan
            </h3>
            
            <div className="mb-2 flex justify-between items-end">
              {/* TAMPILAN SALDO DARI DB */}
              <span className={`text-4xl font-bold ${currentBalance <= 0 ? 'text-red-600' : 'text-slate-800'}`}>
                {currentBalance}
              </span>
              {/* TAMPILAN TOTAL KUOTA DINAMIS */}
              <span className="text-sm text-slate-400 mb-1">/ {totalQuota} Hari</span>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2 overflow-hidden">
              <div className={`h-2.5 rounded-full transition-all duration-1000 ${currentBalance < 3 ? 'bg-red-500' : 'bg-blue-600'}`} style={{ width: `${usagePercent}%` }}></div>
            </div>
            <p className="text-xs text-slate-500 text-right">
               {totalQuota === 0 ? "Belum genap 1 tahun (Masa Probation)" : `${Math.max(0, usedQuota)} hari terpakai tahun ini`}
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
             <h3 className="font-bold text-slate-700 mb-4">Ringkasan Performa</h3>
             <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-100"><div className="flex items-center gap-2"><CheckCircle size={16} className="text-green-600"/> <span className="text-sm font-medium text-green-800">Disetujui</span></div><span className="font-bold text-green-700">{approvedHistory.length}x</span></div>
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100"><div className="flex items-center gap-2"><XCircle size={16} className="text-red-600"/> <span className="text-sm font-medium text-red-800">Ditolak</span></div><span className="font-bold text-red-700">{totalRejected}x</span></div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100"><div className="flex items-center gap-2"><UserCheck size={16} className="text-slate-500"/> <span className="text-sm font-medium text-slate-700">Manager</span></div><span className="text-sm font-bold text-slate-600 truncate max-w-[100px]">{profile.manager?.full_name || 'CEO'}</span></div>
             </div>
          </div>
        </div>

        <div className="lg:col-span-2">
           <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100"><h3 className="font-bold text-slate-700">Riwayat Pengajuan Cuti</h3></div>
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
                       <tr><th className="p-4">Tanggal</th><th className="p-4">Periode</th><th className="p-4">Durasi Efektif</th><th className="p-4 text-right">Status</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {history.length === 0 ? ( <tr><td colSpan="4" className="p-8 text-center text-slate-400 italic">Belum ada riwayat cuti.</td></tr> ) : (
                          history.map(item => {
                             const days = calculateWorkingDays(item.start_date, item.end_date, holidays);
                             return (
                               <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="p-4 text-sm text-slate-600">{new Date(item.created_at).toLocaleDateString('id-ID')}</td>
                                  <td className="p-4 text-sm font-bold text-slate-700">
                                     {item.start_date} <span className="text-slate-400">➜</span> {item.end_date}
                                     <div className="text-xs text-slate-400 font-normal mt-1 italic">"{item.reason}"</div>
                                  </td>
                                  <td className="p-4 text-sm font-mono text-slate-600">{days} Hari</td>
                                  <td className="p-4 text-right"><StatusBadge status={item.status} /></td>
                               </tr>
                             );
                          })
                       )}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === 'approved') return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">Disetujui</span>;
  if (status === 'rejected') return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">Ditolak</span>;
  return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">Pending</span>;
}