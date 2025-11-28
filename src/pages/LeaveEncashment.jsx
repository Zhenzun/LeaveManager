import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  Calculator, CheckCircle, Search, History, 
  AlertTriangle, Wallet, UserCheck, Calendar, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import ModalConfirm from '../components/ModalConfirm';
import { calculateQuotaByTenure } from '../utils/dateUtils'; // Import Helper Quota

export default function LeaveEncashment() {
  const [users, setUsers] = useState([]); 
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('eligible'); 
  const [searchTerm, setSearchTerm] = useState('');
  
  const [modal, setModal] = useState({ isOpen: false, user: null });
  
  // State untuk Reset Tahunan
  const [resetModalOpen, setResetModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'eligible') {
        // 1. Ambil User Aktif
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('*') 
          .eq('status', 'active')
          .order('full_name', { ascending: true });

        if (profileError) throw profileError;

        // 2. Filter yang punya sisa saldo > 0 (Berdasarkan DB, karena kita percaya DB sekarang)
        const eligibleOnly = profiles.filter(u => u.leave_balance > 0);
        setUsers(eligibleOnly || []);

      } else {
        // Ambil Riwayat Pencairan
        const { data, error } = await supabase
          .from('payrolls')
          .select('*, profiles(full_name, department)') 
          .gt('encashment_amount', 0)
          .order('created_at', { ascending: false });
        
        if (!error) setHistory(data || []);
      }
    } catch (error) {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  const calculateEncashment = (basicSalary, leaveBalance) => {
    const salary = parseFloat(basicSalary) || 0;
    if (salary === 0) return 0;
    // Rumus: Gaji / 21 * Sisa Cuti
    return Math.floor((salary / 21) * leaveBalance); 
  };

  const formatIDR = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0);

  // --- PROSES CAIRKAN (SATUAN) ---
  const handleProcess = async () => {
    const user = modal.user;
    if (!user) return;

    const amount = calculateEncashment(user.basic_salary, user.leave_balance);
    const toastId = toast.loading("Memproses pencairan...");

    try {
      const period = new Date().toISOString().slice(0, 7) + '-01'; 
      
      // 1. Catat ke Payroll
      const payload = {
        user_id: user.id,
        period: period,
        basic_salary: user.basic_salary || 0, 
        encashment_amount: amount, 
        net_salary: amount, 
        status: 'paid' 
      };

      const { error: payError } = await supabase.from('payrolls').upsert(payload, { onConflict: 'user_id, period' });
      if (payError) throw payError;

      // 2. NOL-KAN Saldo di DB
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ leave_balance: 0 })
        .eq('id', user.id);
      
      if (profileError) throw profileError;

      toast.success(`Berhasil! Cuti ${user.full_name} dicairkan.`, { id: toastId });
      setModal({ isOpen: false, user: null });
      fetchData(); 

    } catch (err) {
      toast.error("Gagal: " + err.message, { id: toastId });
    }
  };

  // --- PROSES RESET TAHUNAN (MASSAL) ---
  const handleAnnualReset = async () => {
    const toastId = toast.loading("Mereset saldo cuti seluruh karyawan...");
    try {
        // Panggil Fungsi SQL yang sudah kita buat
        const { error } = await supabase.rpc('reset_leave_balances_by_tenure');
        
        if (error) throw error;

        toast.success("Reset Berhasil! Saldo cuti diperbarui sesuai masa kerja.", { id: toastId });
        setResetModalOpen(false);
        fetchData();

    } catch (err) {
        toast.error("Gagal Reset: " + err.message, { id: toastId });
    }
  };

  const filteredList = (activeTab === 'eligible' ? users : history).filter(item => {
    const name = activeTab === 'eligible' ? item.full_name : item.profiles?.full_name;
    return name?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      
      {/* Modal Cairkan Satuan */}
      <ModalConfirm 
        isOpen={modal.isOpen}
        onClose={() => setModal({ isOpen: false, user: null })}
        onConfirm={handleProcess}
        title="Konfirmasi Pencairan"
        message={modal.user ? `Cairkan ${modal.user.leave_balance} hari cuti ${modal.user.full_name} senilai ${formatIDR(calculateEncashment(modal.user.basic_salary, modal.user.leave_balance))}?\n\nSisa cuti karyawan akan menjadi 0.` : ''}
        confirmText="Ya, Cairkan"
        type="success"
      />

      {/* Modal Reset Tahunan */}
      <ModalConfirm 
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        onConfirm={handleAnnualReset}
        title="Reset Periode Baru (1 April)"
        message={`PERINGATAN KERAS:\n\nAksi ini akan MENGHAPUS sisa saldo cuti lama dan MENGISI ULANG saldo baru untuk SEMUA KARYAWAN berdasarkan masa kerja mereka:\n\n• < 1 Tahun = 0 Hari\n• 1 - 5 Tahun = 12 Hari\n• 5 - 10 Tahun = 18 Hari\n• > 10 Tahun = 24 Hari\n\nPastikan semua pencairan (Encashment) sudah selesai dilakukan sebelum menekan tombol ini.`}
        confirmText="Ya, Reset Saldo Semua Karyawan"
        type="danger"
      />

      <div className="mb-8 flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Wallet className="text-green-600" /> Konversi & Reset Cuti
            </h1>
            <p className="text-slate-500 mt-1">Manajemen pencairan cuti dan reset saldo tahunan.</p>
        </div>
        
        {/* TOMBOL RESET TAHUNAN */}
        <button 
            onClick={() => setResetModalOpen(true)}
            className="bg-red-600 text-white px-5 py-3 rounded-xl font-bold shadow-lg shadow-red-200 hover:bg-red-700 transition-transform active:scale-95 flex items-center gap-2"
        >
            <RefreshCw size={20}/> Reset Periode Baru (1 April)
        </button>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 flex">
          <button onClick={() => setActiveTab('eligible')} className={`px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'eligible' ? 'bg-green-50 text-green-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
            <UserCheck size={18}/> Karyawan Sisa Cuti
          </button>
          <button onClick={() => setActiveTab('history')} className={`px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'history' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
            <History size={18}/> Riwayat Pencairan
          </button>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-3 text-slate-400" size={18}/>
          <input type="text" placeholder="Cari nama..." className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? <div className="p-10 text-center text-slate-400">Memuat data...</div> : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-bold">
              <tr>
                <th className="p-4">Karyawan</th>
                <th className="p-4 text-center">{activeTab === 'eligible' ? 'Sisa Cuti (DB)' : 'Jumlah Dicairkan'}</th>
                <th className="p-4 text-right">Estimasi Uang</th>
                <th className="p-4 text-right">{activeTab === 'eligible' ? 'Aksi' : 'Tanggal Cair'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr><td colSpan="4" className="p-10 text-center text-slate-400 italic">Tidak ada data.</td></tr>
              ) : (
                filteredList.map(item => {
                  if (activeTab === 'eligible') {
                    const nominal = calculateEncashment(item.basic_salary, item.leave_balance);
                    // Hitung total kuota dia seharusnya (hanya untuk info tooltip)
                    const myQuota = calculateQuotaByTenure(item.join_date);
                    
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-slate-700">{item.full_name}</div>
                          <div className="text-xs text-slate-500">
                             {item.department} • Join: {new Date(item.join_date).getFullYear()} (Jatah: {myQuota})
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 font-bold rounded-lg text-sm">
                            {item.leave_balance} Hari
                          </span>
                        </td>
                        <td className="p-4 text-right font-bold text-green-600 text-lg">
                          {formatIDR(nominal)}
                          {(!item.basic_salary || item.basic_salary == 0) && <div className="text-[10px] text-red-500 font-normal">Gaji 0</div>}
                        </td>
                        <td className="p-4 text-right">
                          <button onClick={() => setModal({ isOpen: true, user: item })} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-green-700 shadow-md transition-all active:scale-95 flex items-center gap-2 ml-auto">
                            <Calculator size={14}/> Cairkan
                          </button>
                        </td>
                      </tr>
                    );
                  } else {
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors bg-slate-50/50">
                        <td className="p-4">
                          <div className="font-bold text-slate-700">{item.profiles?.full_name}</div>
                          <div className="text-xs text-slate-500">{item.profiles?.department}</div>
                        </td>
                        <td className="p-4 text-center text-slate-500">
                           <span className="line-through text-xs mr-2 text-red-400">Reset 0</span> 
                           <CheckCircle size={16} className="inline text-green-500"/>
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-slate-700">{formatIDR(item.encashment_amount)}</td>
                        <td className="p-4 text-right text-sm text-slate-500">
                          <div className="flex items-center justify-end gap-2"><Calendar size={14}/> {new Date(item.created_at).toLocaleDateString('id-ID')}</div>
                        </td>
                      </tr>
                    );
                  }
                })
              )}
            </tbody>
          </table>
        )}
      </div>
      
      {activeTab === 'eligible' && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex gap-3 items-start">
           <AlertTriangle className="text-yellow-600 shrink-0" size={24} />
           <div>
              <h4 className="font-bold text-yellow-800">Info Penting</h4>
              <p className="text-sm text-yellow-700 mt-1 leading-relaxed">
                 Halaman ini menampilkan data <strong>langsung dari database</strong>. <br/>
                 Gunakan tombol <strong>"Reset Periode Baru"</strong> di pojok kanan atas setiap tanggal 1 April untuk memperbarui jatah cuti semua karyawan sesuai masa kerja mereka.
              </p>
           </div>
        </div>
      )}
    </div>
  );
}