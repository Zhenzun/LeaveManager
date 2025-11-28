import React, { useEffect, useState } from 'react';
import { supabase, logActivity } from '../lib/supabaseClient'; 
import { 
  CheckCircle, XCircle, Clock, Calendar, Search, Filter, 
  FileText, Users, Activity 
} from 'lucide-react';
import toast from 'react-hot-toast';
import SkeletonTable from '../components/SkeletonTable';
import { calculateWorkingDays } from '../utils/dateUtils'; 

export default function Dashboard() {
  const [requests, setRequests] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // STATE: Menyimpan daftar departemen dari tabel 'departments'
  const [departments, setDepartments] = useState([]);

  const [statusFilter, setStatusFilter] = useState('pending'); 
  const [deptFilter, setDeptFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [conflictUsers, setConflictUsers] = useState([]); 

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Ambil Hari Libur
      const { data: holidayData } = await supabase.from('public_holidays').select('date');
      setHolidays(holidayData ? holidayData.map(h => h.date) : []);

      // 2. Ambil Request Cuti
      let query = supabase
        .from('leave_requests')
        .select(`
            *, 
            profiles:user_id ( full_name, department, role, leave_balance, avatar_url ),
            leave_types ( name, code, badge_color, is_quota_deduction )
        `)
        .order('created_at', { ascending: false });

      if (statusFilter === 'pending') {
        query = query.eq('status', 'pending');
      } else {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRequests(data || []);

      // 3. LOGIC BARU (PERBAIKAN): Ambil dari tabel 'departments'
      const { data: deptData, error: deptError } = await supabase
        .from('departments') // Mengambil dari tabel master departments
        .select('name')      // Hanya ambil kolom 'name'
        .order('name', { ascending: true });

      if (deptData) {
        // Map hasil object { name: 'IT' } menjadi array string ['IT', 'HR']
        setDepartments(deptData.map(d => d.name));
      }

    } catch (err) {
      toast.error("Gagal memuat data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIC KONFLIK & APPROVAL (TIDAK BERUBAH) ---
  const checkConflicts = (req) => {
    const conflicts = requests.filter(r => 
      r.id !== req.id && 
      r.status === 'approved' &&
      r.profiles?.department === req.profiles?.department &&
      (
        (r.start_date <= req.end_date && r.start_date >= req.start_date) ||
        (r.end_date >= req.start_date && r.end_date <= req.end_date)
      )
    );
    setConflictUsers(conflicts);
  };

  const openReviewModal = (req) => {
    setSelectedReq(req);
    checkConflicts(req); 
    setIsReviewOpen(true);
  };

  const handleProcess = async (action) => {
    const toastId = toast.loading("Memproses...");
    try {
      const isDeductible = selectedReq.leave_types?.is_quota_deduction ?? true;
      const realDuration = calculateWorkingDays(selectedReq.start_date, selectedReq.end_date, holidays);
      const deductionAmount = isDeductible ? realDuration : 0;

      if (action === 'approve') {
        const { error } = await supabase.rpc('approve_leave_request', {
          request_id: selectedReq.id,
          user_uuid: selectedReq.user_id,
          deduction_days: deductionAmount
        });

        if (error) throw error;

        await logActivity('APPROVE', `HRD menyetujui cuti ${selectedReq.profiles?.full_name}`);
        await supabase.from('notifications').insert({
          user_id: selectedReq.user_id,
          title: 'Pengajuan Disetujui ✅',
          message: `Pengajuan disetujui. Saldo terpotong: ${deductionAmount} hari.`
        });

        toast.success(`Disetujui!`, { id: toastId });

      } else {
        await supabase.from('leave_requests').update({ status: 'rejected', current_stage: 'completed' }).eq('id', selectedReq.id);
        await logActivity('REJECT', `HRD menolak cuti ${selectedReq.profiles?.full_name}`);
        await supabase.from('notifications').insert({
          user_id: selectedReq.user_id,
          title: 'Pengajuan Ditolak ❌',
          message: `Maaf, pengajuan cuti Anda ditolak.`
        });

        toast.success("Ditolak.", { id: toastId });
      }

      setIsReviewOpen(false);
      fetchData(); 

    } catch (err) {
      console.error(err);
      toast.error("Gagal: " + err.message, { id: toastId });
    }
  };

  const filteredRequests = requests.filter(req => {
    const matchSearch = req.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const matchDept = deptFilter === 'All' || req.profiles?.department === deptFilter;
    return matchSearch && matchDept;
  });

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const renderStatusBadge = (req) => {
    if (req.status === 'approved') return <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-100 text-green-700 text-xs font-bold border border-green-200"><CheckCircle size={14}/> APPROVED</span>;
    if (req.status === 'rejected') return <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-bold border border-red-200"><XCircle size={14}/> REJECTED</span>;
    
    let label = 'MANAGER';
    let colorClass = 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (req.current_stage === 'dfd') { label = 'DFD'; colorClass = 'bg-orange-100 text-orange-800 border-orange-200'; } 
    else if (req.current_stage === 'hrd') { label = 'HRD'; colorClass = 'bg-purple-100 text-purple-800 border-purple-200'; }

    return <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border uppercase ${colorClass}`}><Clock size={14}/> WAIT: {label}</span>;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      <div className="mb-8"><h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2"><FileText className="text-blue-600" /> Pusat Persetujuan</h1><p className="text-slate-500 mt-1">Tinjau, analisis, dan putuskan pengajuan cuti karyawan.</p></div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex bg-slate-100 p-1 rounded-lg">
          {['pending', 'approved', 'rejected'].map(status => (
            <button key={status} onClick={() => setStatusFilter(status)} className={`px-4 py-2 text-sm font-bold rounded-md transition-all capitalize ${statusFilter === status ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{status}</button>
          ))}
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64"><Search className="absolute left-3 top-2.5 text-slate-400" size={18}/><input type="text" placeholder="Cari karyawan..." className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/></div>
          
          {/* FILTER DEPARTEMEN DINAMIS DARI TABEL DEPARTMENTS */}
          <div className="relative">
            <Filter className="absolute left-3 top-2.5 text-slate-400" size={18}/>
            <select 
                className="pl-10 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white cursor-pointer hover:bg-slate-50" 
                value={deptFilter} 
                onChange={e => setDeptFilter(e.target.value)}
            >
                <option value="All">Semua Dept</option>
                {/* Looping data department dari database */}
                {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                ))}
            </select>
          </div>

        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? <SkeletonTable rows={5} /> : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs font-bold">
              <tr><th className="p-4">Karyawan</th><th className="p-4">Tipe & Durasi</th><th className="p-4">Status Saat Ini</th><th className="p-4 text-right">Aksi</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
             {filteredRequests.length === 0 ? ( <tr><td colSpan="4" className="p-10 text-center text-slate-400 italic">Tidak ada data.</td></tr> ) : (
               filteredRequests.map(req => {
                const duration = calculateWorkingDays(req.start_date, req.end_date, holidays);
                const badgeColor = req.leave_types?.badge_color || 'blue'; 
                const typeName = req.leave_types?.name || 'Cuti Tahunan';

                return (
                  <tr key={req.id} className="hover:bg-blue-50/50 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">{req.profiles?.full_name?.charAt(0) || 'U'}</div>
                        <div><div className="font-bold text-slate-800">{req.profiles?.full_name}</div><div className="text-xs text-slate-500">{req.profiles?.department}</div></div>
                      </div>
                    </td>
                    <td className="p-4">
                       <div className="flex items-center gap-2 mb-1">
                           <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-${badgeColor}-100 text-${badgeColor}-700 border border-${badgeColor}-200`}>{typeName}</span>
                           <span className="text-xs text-slate-500 font-medium">{duration} Hari Kerja</span>
                       </div>
                       
                       <div className="text-xs text-slate-700 font-bold flex items-center gap-1 mt-1">
                          <Calendar size={12} className="text-blue-500"/> 
                          <span>{formatDate(req.start_date)}</span>
                          <span className="text-slate-400 mx-1">➜</span>
                          <span>{formatDate(req.end_date)}</span>
                       </div>
                    </td>
                    
                    <td className="p-4">
                       {renderStatusBadge(req)}
                       <div className="text-xs text-slate-400 mt-1 italic line-clamp-1">"{req.reason}"</div>
                    </td>

                    <td className="p-4 text-right">
                        {statusFilter === 'pending' ? (
                          <button onClick={() => openReviewModal(req)} className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-md hover:bg-blue-700 transition-all active:scale-95">Tinjau</button>
                        ) : (
                          <span className="text-xs font-bold text-slate-400">Selesai</span>
                        )}
                    </td>
                  </tr>
                );
               })
             )}
            </tbody>
          </table>
        )}
      </div>

      {isReviewOpen && selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50">
              <div className="flex items-center gap-4">
                 <div className="w-14 h-14 rounded-full bg-white border-2 border-blue-100 text-blue-600 flex items-center justify-center font-bold text-xl shadow-sm">{selectedReq.profiles?.full_name?.charAt(0)}</div>
                 <div><h2 className="text-xl font-bold text-slate-800">{selectedReq.profiles?.full_name}</h2><p className="text-sm text-slate-500">{selectedReq.profiles?.department}</p></div>
              </div>
              <button onClick={() => setIsReviewOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><XCircle size={24}/></button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 mb-2 font-bold uppercase">Status Saat Ini</p>
                  <div className="flex justify-center">{renderStatusBadge(selectedReq)}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-xs font-bold text-blue-500 uppercase mb-1">Durasi</p>
                    <div className="text-2xl font-bold text-slate-800">{calculateWorkingDays(selectedReq.start_date, selectedReq.end_date, holidays)} <span className="text-sm text-slate-500">Hari</span></div>
                    <div className="text-xs text-blue-600 mt-1 font-medium">{formatDate(selectedReq.start_date)} - {formatDate(selectedReq.end_date)}</div>
                 </div>
                 <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                    <p className="text-xs font-bold text-orange-500 uppercase mb-1">Estimasi Sisa</p>
                    <div className="text-2xl font-bold text-slate-800">
                       {(selectedReq.leave_types?.is_quota_deduction === false) ? selectedReq.profiles?.leave_balance : selectedReq.profiles?.leave_balance - calculateWorkingDays(selectedReq.start_date, selectedReq.end_date, holidays)}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Awal: {selectedReq.profiles?.leave_balance}</p>
                 </div>
              </div>

              <div className="space-y-2"><h3 className="text-sm font-bold text-slate-700">Alasan</h3><div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-700 italic">"{selectedReq.reason}"</div></div>
              
              {conflictUsers.length > 0 && (
                 <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                    <div className="flex items-center gap-2 text-red-700 font-bold text-sm mb-2"><Users size={16}/> Konflik Jadwal</div>
                    {conflictUsers.map(c => (<div key={c.id} className="text-xs text-slate-600">• {c.profiles?.full_name}</div>))}
                 </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
               <button onClick={() => handleProcess('reject')} className="px-6 py-3 bg-white text-red-600 border border-red-200 font-bold rounded-xl hover:bg-red-50 text-sm">Tolak</button>
               <button onClick={() => handleProcess('approve')} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg flex items-center gap-2 text-sm"><CheckCircle size={18}/> Setujui</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}