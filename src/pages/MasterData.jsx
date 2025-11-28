import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  Database, Plus, Trash2, Layers, Save, Loader2, 
  FileType, CheckSquare, Square, Tag 
} from 'lucide-react';
import toast from 'react-hot-toast';
import ModalConfirm from '../components/ModalConfirm';

export default function MasterData() {
  const [activeTab, setActiveTab] = useState('departments'); // 'departments' | 'leavetypes'
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ isOpen: false, id: null, type: '' });

  // Data State
  const [departments, setDepartments] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);

  // Form State
  const [deptForm, setDeptForm] = useState({ name: '', code: '' });
  const [typeForm, setTypeForm] = useState({ name: '', code: '', is_quota_deduction: true, requires_file: false, badge_color: 'blue' });
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    if (activeTab === 'departments') {
      const { data } = await supabase.from('departments').select('*').order('name', { ascending: true });
      setDepartments(data || []);
    } else {
      const { data } = await supabase.from('leave_types').select('*').order('created_at', { ascending: true });
      setLeaveTypes(data || []);
    }
    setLoading(false);
  };

  // --- HANDLERS DEPARTEMEN ---
  const handleAddDept = async (e) => {
    e.preventDefault();
    if (!deptForm.name || !deptForm.code) return toast.error("Wajib diisi semua");
    setIsAdding(true);
    const { error } = await supabase.from('departments').insert(deptForm);
    setIsAdding(false);
    if (error) toast.error(error.message);
    else { toast.success("Departemen ditambah"); setDeptForm({ name: '', code: '' }); fetchData(); }
  };

  // --- HANDLERS TIPE CUTI ---
  const handleAddType = async (e) => {
    e.preventDefault();
    if (!typeForm.name || !typeForm.code) return toast.error("Wajib diisi semua");
    setIsAdding(true);
    const { error } = await supabase.from('leave_types').insert(typeForm);
    setIsAdding(false);
    if (error) toast.error(error.message);
    else { toast.success("Tipe Cuti ditambah"); setTypeForm({ name: '', code: '', is_quota_deduction: true, requires_file: false, badge_color: 'blue' }); fetchData(); }
  };

  const handleDelete = async () => {
    const table = modal.type === 'departments' ? 'departments' : 'leave_types';
    const { error } = await supabase.from(table).delete().eq('id', modal.id);
    if (error) toast.error("Gagal hapus.");
    else { toast.success("Dihapus"); fetchData(); }
    setModal({ isOpen: false, id: null, type: '' });
  };

  return (
    <div className="p-8 max-w-6xl mx-auto min-h-screen">
      <ModalConfirm 
        isOpen={modal.isOpen} 
        onClose={() => setModal({ isOpen: false, id: null })} 
        onConfirm={handleDelete} 
        title="Hapus Data?" 
        message="Data yang dihapus tidak bisa dikembalikan dan mungkin berpengaruh ke data karyawan/cuti." 
      />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <Database className="text-blue-600" /> Master Data
        </h1>
        <p className="text-slate-500 mt-1">Pusat konfigurasi referensi sistem HRIS.</p>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex gap-4 border-b border-slate-200 mb-8">
        <button 
          onClick={() => setActiveTab('departments')}
          className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 transition-all border-b-2 ${activeTab === 'departments' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Layers size={18}/> Struktur Organisasi (Dept)
        </button>
        <button 
          onClick={() => setActiveTab('leavetypes')}
          className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 transition-all border-b-2 ${activeTab === 'leavetypes' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <FileType size={18}/> Jenis Cuti & Kebijakan
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        
        {/* --- FORM INPUT (KIRI) --- */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 sticky top-8">
            
            {activeTab === 'departments' ? (
              /* FORM DEPARTEMEN */
              <form onSubmit={handleAddDept} className="space-y-4">
                <h2 className="font-bold text-slate-700 flex items-center gap-2 border-b pb-3 mb-2">
                   <Plus size={18} className="text-blue-500"/> Tambah Departemen
                </h2>
                <div>
                  <label className="label">Nama Departemen</label>
                  <input type="text" placeholder="Ex: Information Technology" className="input-field" value={deptForm.name} onChange={e => setDeptForm({...deptForm, name: e.target.value})}/>
                </div>
                <div>
                  <label className="label">Kode Singkatan</label>
                  <input type="text" placeholder="Ex: IT" className="input-field uppercase" maxLength={5} value={deptForm.code} onChange={e => setDeptForm({...deptForm, code: e.target.value})}/>
                </div>
                <button disabled={isAdding} className="btn-primary">{isAdding ? <Loader2 className="animate-spin"/> : 'Simpan'}</button>
              </form>
            ) : (
              /* FORM TIPE CUTI */
              <form onSubmit={handleAddType} className="space-y-4">
                <h2 className="font-bold text-slate-700 flex items-center gap-2 border-b pb-3 mb-2">
                   <Plus size={18} className="text-blue-500"/> Tambah Jenis Cuti
                </h2>
                <div>
                  <label className="label">Nama Cuti</label>
                  <input type="text" placeholder="Ex: Cuti Tahunan / Sakit" className="input-field" value={typeForm.name} onChange={e => setTypeForm({...typeForm, name: e.target.value})}/>
                </div>
                <div>
                  <label className="label">Kode Sistem</label>
                  <input type="text" placeholder="Ex: ANNUAL" className="input-field uppercase" maxLength={10} value={typeForm.code} onChange={e => setTypeForm({...typeForm, code: e.target.value})}/>
                </div>
                
                {/* Opsi Kebijakan */}
                <div className="space-y-3 py-2">
                   <label className="flex items-center gap-3 cursor-pointer p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                      <div onClick={() => setTypeForm({...typeForm, is_quota_deduction: !typeForm.is_quota_deduction})}>
                         {typeForm.is_quota_deduction ? <CheckSquare className="text-blue-600" size={20}/> : <Square className="text-slate-400" size={20}/>}
                      </div>
                      <span className="text-sm font-medium text-slate-700">Potong Saldo Cuti?</span>
                   </label>
                   <label className="flex items-center gap-3 cursor-pointer p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                      <div onClick={() => setTypeForm({...typeForm, requires_file: !typeForm.requires_file})}>
                         {typeForm.requires_file ? <CheckSquare className="text-blue-600" size={20}/> : <Square className="text-slate-400" size={20}/>}
                      </div>
                      <span className="text-sm font-medium text-slate-700">Wajib Lampiran?</span>
                   </label>
                </div>

                <div>
                   <label className="label">Warna Label</label>
                   <div className="flex gap-2 mt-2">
                      {['blue', 'green', 'red', 'orange', 'purple'].map(color => (
                        <div 
                          key={color}
                          onClick={() => setTypeForm({...typeForm, badge_color: color})}
                          className={`w-8 h-8 rounded-full cursor-pointer border-2 transition-all ${typeForm.badge_color === color ? 'border-slate-600 scale-110' : 'border-transparent'}`}
                          style={{ backgroundColor: color === 'blue' ? '#3b82f6' : color === 'green' ? '#22c55e' : color === 'red' ? '#ef4444' : color === 'orange' ? '#f97316' : '#a855f7' }}
                        ></div>
                      ))}
                   </div>
                </div>

                <button disabled={isAdding} className="btn-primary">{isAdding ? <Loader2 className="animate-spin"/> : 'Simpan Kebijakan'}</button>
              </form>
            )}

          </div>
        </div>

        {/* --- DATA LIST (KANAN) --- */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Kode</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">{activeTab === 'departments' ? 'Nama Dept' : 'Jenis Cuti'}</th>
                  {activeTab === 'leavetypes' && <th className="p-4 text-xs font-bold text-slate-500 uppercase">Kebijakan</th>}
                  <th className="p-4 text-right text-xs font-bold text-slate-500 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? <tr><td colSpan="4" className="p-8 text-center text-slate-400">Loading data...</td></tr> : 
                 (activeTab === 'departments' ? departments : leaveTypes).length === 0 ? <tr><td colSpan="4" className="p-8 text-center text-slate-400">Data kosong.</td></tr> :
                 (activeTab === 'departments' ? departments : leaveTypes).map(item => (
                  <tr key={item.id} className="hover:bg-blue-50 transition-colors">
                    <td className="p-4 font-mono text-sm font-bold text-blue-600">{item.code}</td>
                    <td className="p-4">
                        {activeTab === 'leavetypes' ? (
                           <span className={`px-2 py-1 rounded text-xs font-bold bg-${item.badge_color}-100 text-${item.badge_color}-700 border border-${item.badge_color}-200 uppercase`}>
                              {item.name}
                           </span>
                        ) : (
                           <span className="font-medium text-slate-700">{item.name}</span>
                        )}
                    </td>
                    {activeTab === 'leavetypes' && (
                        <td className="p-4 text-sm space-y-1">
                           <div className={`flex items-center gap-2 ${item.is_quota_deduction ? 'text-red-600' : 'text-slate-400'}`}>
                              <Tag size={14}/> {item.is_quota_deduction ? 'Potong Saldo' : 'Tidak Potong Saldo'}
                           </div>
                           {item.requires_file && (
                              <div className="flex items-center gap-2 text-orange-600">
                                 <FileType size={14}/> Wajib Lampiran
                              </div>
                           )}
                        </td>
                    )}
                    <td className="p-4 text-right">
                      <button onClick={() => setModal({ isOpen: true, id: item.id, type: activeTab })} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
      
      {/* Utility Class */}
      <style>{`
        .label { @apply block text-xs font-bold text-slate-500 uppercase mb-1; }
        .input-field { @apply w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm; }
        .btn-primary { @apply w-full bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 flex justify-center items-center gap-2 transition-all active:scale-95; }
      `}</style>
    </div>
  );
}