import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { Clock, CheckCircle, XCircle } from 'lucide-react';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ approved: 0, rejected: 0, pending: 0 });

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    const { data } = await supabase.from('leave_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) {
        setHistory(data);
        setStats({
            approved: data.filter(r => r.status === 'approved').length,
            rejected: data.filter(r => r.status === 'rejected').length,
            pending: data.filter(r => r.status === 'pending').length,
        });
    }
  };

  return (
    <div className="p-8">
       <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
             {user?.full_name?.charAt(0)}
          </div>
          <div>
             <h1 className="text-2xl font-bold text-slate-800">Halo, {user?.full_name}</h1>
             <p className="text-slate-500">{user?.role?.toUpperCase()} • {user?.department}</p>
          </div>
       </div>

       {/* KARTU SALDO */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-blue-600 text-white p-6 rounded-2xl shadow-lg">
             <p className="text-blue-100 font-bold text-xs uppercase mb-2">Sisa Cuti Tahunan</p>
             <h2 className="text-4xl font-bold">{user?.leave_balance} <span className="text-lg">Hari</span></h2>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
             <p className="text-slate-400 font-bold text-xs uppercase mb-2">Menunggu Persetujuan</p>
             <h2 className="text-4xl font-bold text-orange-500">{stats.pending}</h2>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
             <p className="text-slate-400 font-bold text-xs uppercase mb-2">Total Disetujui</p>
             <h2 className="text-4xl font-bold text-green-600">{stats.approved}</h2>
          </div>
       </div>

       {/* RIWAYAT */}
       <h3 className="font-bold text-slate-700 mb-4">Riwayat Pengajuan</h3>
       <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
             <thead className="bg-slate-50 border-b text-xs font-bold text-slate-500 uppercase">
                <tr><th className="p-4">Tanggal</th><th className="p-4">Alasan</th><th className="p-4">Status</th></tr>
             </thead>
             <tbody className="divide-y">
                {history.map(req => (
                   <tr key={req.id} className="hover:bg-slate-50">
                      <td className="p-4 text-sm">{req.start_date}</td>
                      <td className="p-4 text-sm">{req.reason}</td>
                      <td className="p-4">
                         {req.status === 'approved' && <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded font-bold">Disetujui</span>}
                         {req.status === 'rejected' && <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded font-bold">Ditolak</span>}
                         {req.status === 'pending' && <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded font-bold">Proses {req.current_stage}</span>}
                      </td>
                   </tr>
                ))}
             </tbody>
          </table>
       </div>
    </div>
  );
}