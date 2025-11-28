import React, { useEffect, useState } from 'react';
import { supabase, logActivity } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle, XCircle, Clock, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import SkeletonTable from '../../components/SkeletonTable';

export default function ApprovalDashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if(user) fetchTasks();
  }, [user]);

  const fetchTasks = async () => {
    setLoading(true);
    // Logic: Ambil yang statusnya pending DAN stage-nya sesuai role user (manager/dfd)
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*, profiles:user_id(full_name, department, role)')
      .eq('current_stage', user.role) // KUNCI: Filter stage = role login
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) toast.error("Gagal load tugas");
    else setRequests(data || []);
    setLoading(false);
  };

  const handleProcess = async (req, action) => {
    const toastId = toast.loading("Memproses...");
    try {
        let updates = {};
        if (action === 'reject') {
            updates = { status: 'rejected', current_stage: 'completed' };
            await logActivity('REJECT', `${user.role} menolak cuti ${req.profiles.full_name}`);
        } else {
            // Jika Approve, lempar ke tahap selanjutnya
            const nextStage = user.role === 'manager' ? 'hrd' : 'hrd'; // Manager/DFD lempar ke HRD
            updates = { 
                [`approved_by_${user.role}`]: true, // approved_by_manager = true
                current_stage: nextStage 
            };
            await logActivity('APPROVE', `${user.role} menyetujui cuti ${req.profiles.full_name}`);
        }

        await supabase.from('leave_requests').update(updates).eq('id', req.id);
        
        toast.success("Berhasil!", { id: toastId });
        fetchTasks(); // Refresh

    } catch (err) {
        toast.error("Error: " + err.message, { id: toastId });
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-slate-800 mb-6">Tugas Persetujuan ({user?.role?.toUpperCase()})</h1>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? <SkeletonTable /> : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b">
               <tr>
                 <th className="p-4">Pemohon</th>
                 <th className="p-4">Tanggal</th>
                 <th className="p-4">Alasan</th>
                 <th className="p-4 text-right">Aksi</th>
               </tr>
            </thead>
            <tbody className="divide-y">
               {requests.length === 0 ? <tr><td colSpan="4" className="p-10 text-center text-slate-400">Tidak ada tugas pending.</td></tr> : 
                 requests.map(req => (
                   <tr key={req.id} className="hover:bg-slate-50">
                      <td className="p-4 font-bold">{req.profiles.full_name} <br/><span className="text-xs font-normal text-slate-500">{req.profiles.department}</span></td>
                      <td className="p-4 text-sm">{req.start_date} s/d {req.end_date}</td>
                      <td className="p-4 text-sm italic">"{req.reason}"</td>
                      <td className="p-4 text-right flex justify-end gap-2">
                         <button onClick={() => handleProcess(req, 'reject')} className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200">Tolak</button>
                         <button onClick={() => handleProcess(req, 'approve')} className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700">Setujui</button>
                      </td>
                   </tr>
                 ))
               }
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}