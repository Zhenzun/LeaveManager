import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  Trash2, UserPlus, Shield, Users, Search, Edit3, Camera, X, 
  Smartphone, Mail, Briefcase, Lock
} from 'lucide-react';
import toast from 'react-hot-toast';
import ModalConfirm from '../components/ModalConfirm';
import { useNavigate } from 'react-router-dom';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]); // <--- STATE BARU UNTUK DEPT
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  // State Modal & Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  
  // Form Data
  const initialForm = { 
    email: '', full_name: '', department: '', role: 'employee', // Default dept kosong agar dipaksa pilih
    manager_id: '', join_date: '', leave_balance: 12, phone: '', status: 'active',
    password: '' 
  };
  const [formData, setFormData] = useState(initialForm);
  const [avatarFile, setAvatarFile] = useState(null);
  const fileInputRef = useRef(null);

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });

  useEffect(() => { 
    fetchUsers(); 
    fetchDepartments(); // <--- FETCH DEPT SAAT LOAD
  }, []);

  // 1. AMBIL DATA DEPARTEMEN (MASTER DATA)
  const fetchDepartments = async () => {
    const { data } = await supabase.from('departments').select('*').order('name', { ascending: true });
    setDepartments(data || []);
  };

  // 2. AMBIL DATA USER
  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*, manager:manager_id(full_name)')
      .order('created_at', { ascending: false });
    
    if (error) toast.error("Gagal load user");
    else setUsers(data || []);
    setLoading(false);
  };

  const handleUploadAvatar = async (userId) => {
    if (!avatarFile) return null;
    const fileExt = avatarFile.name.split('.').pop();
    const fileName = `${userId}-${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, avatarFile);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const loadId = toast.loading(isEditMode ? "Mengupdate..." : "Mendaftarkan...");

    try {
      // Validasi Manager (kecuali HRD atau jika dept 'Human Resources' sesuaikan dengan nama di DB Anda)
      if (['employee', 'manager'].includes(formData.role) && !formData.manager_id && !formData.department.includes('Human Resources')) {
         // Note: Validasi dept ini agak tricky kalau nama dept dinamis, bisa di relax atau dihapus bagian dept-nya
         // throw new Error("Staff/Manager wajib punya atasan!"); 
      }

      let userId = editId;

      if (!isEditMode) {
        if (!formData.password || formData.password.length < 6) throw new Error("Password minimal 6 karakter");
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password
        });
        if (authError) throw authError;
        if (!authData.user) throw new Error("Gagal membuat user Auth");
        userId = authData.user.id;
      }

      let avatarUrl = formData.avatar_url;
      if (avatarFile) avatarUrl = await handleUploadAvatar(userId);

      const payload = {
        id: userId,
        email: formData.email,
        full_name: formData.full_name,
        department: formData.department, // Value dari dropdown dinamis
        role: formData.role,
        manager_id: formData.manager_id || null,
        join_date: formData.join_date,
        leave_balance: parseInt(formData.leave_balance),
        phone: formData.phone,
        status: formData.status,
        avatar_url: avatarUrl
      };

      const { error: profileError } = await supabase.from('profiles').upsert(payload);
      if (profileError) throw profileError;

      toast.success(isEditMode ? "Data Diperbarui!" : "Karyawan Ditambahkan!", { id: loadId });
      closeModal();
      fetchUsers();

    } catch (error) {
      toast.error(error.message, { id: loadId });
    }
  };

  const openAddModal = () => {
    setFormData(initialForm); setIsEditMode(false); setAvatarFile(null); setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setFormData({ ...user, manager_id: user.manager_id || '', password: '' });
    setEditId(user.id); setIsEditMode(true); setAvatarFile(null); setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleDelete = async () => {
    const { error } = await supabase.from('profiles').delete().eq('id', deleteModal.id);
    if (!error) { toast.success("Data profil dihapus"); fetchUsers(); } 
    else { toast.error("Gagal hapus (Mungkin ada relasi data)"); }
    setDeleteModal({ isOpen: false, id: null });
  };

  const filteredUsers = users.filter(u => u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()));
  const potentialManagers = users.filter(u => ['manager', 'dfd'].includes(u.role));

  const labelStyle = "block text-xs font-bold text-slate-500 uppercase mb-1 tracking-wide";
  const inputStyle = "w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-white transition-all";

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      <ModalConfirm isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({isOpen: false, id: null})} onConfirm={handleDelete} title="Hapus Data Karyawan?" message="PERINGATAN: Menghapus data akan menghilangkan riwayat cuti karyawan ini." />

      <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
        <div>
           <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3"><Users className="text-blue-600" /> Data Karyawan</h1>
           <p className="text-slate-500 mt-1">Kelola database SDM, status, dan struktur organisasi.</p>
        </div>
        <button onClick={openAddModal} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center gap-2 transition-transform active:scale-95"><UserPlus size={18} /> Tambah Karyawan</button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex items-center gap-3">
         <Search className="text-slate-400" size={20}/>
         <input type="text" placeholder="Cari nama, email, atau departemen..." className="flex-1 outline-none text-sm text-slate-700 placeholder:text-slate-400" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      {loading ? <div className="text-center p-10 text-slate-400">Memuat data...</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map(user => (
            <div key={user.id} className={`bg-white rounded-xl border p-5 transition-all hover:shadow-md ${user.status === 'resigned' ? 'border-slate-100 bg-slate-50 opacity-70' : 'border-slate-200'}`}>
              <div className="flex justify-between items-start mb-4">
                <div onClick={() => navigate(`/users/${user.id}`)} className="flex items-center gap-3 cursor-pointer group" title="Klik untuk detail profil">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="Avatar" className="w-12 h-12 rounded-full object-cover border border-slate-200 group-hover:border-blue-400 transition-colors"/>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg group-hover:bg-blue-200 transition-colors">{user.full_name.charAt(0)}</div>
                  )}
                  <div className="overflow-hidden">
                    <h3 className="font-bold text-slate-800 truncate w-32 group-hover:text-blue-600 transition-colors">{user.full_name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500"><Briefcase size={12}/> {user.role} • {user.department}</div>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase border ${user.status === 'active' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{user.status === 'active' ? 'Aktif' : 'Resign'}</span>
              </div>
              <div className="space-y-2 text-sm text-slate-600 mb-5">
                 <div className="flex items-center gap-2"><Mail size={14} className="text-slate-400"/> <span className="truncate">{user.email}</span></div>
                 <div className="flex items-center gap-2"><Smartphone size={14} className="text-slate-400"/> {user.phone || '-'}</div>
                 <div className="flex items-center gap-2"><Shield size={14} className="text-slate-400"/> Atasan: {user.manager?.full_name || 'Top Level'}</div>
              </div>
              <div className="flex gap-2 border-t border-slate-100 pt-4">
                 <button onClick={() => openEditModal(user)} className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"><Edit3 size={16}/> Edit</button>
                 <button onClick={() => setDeleteModal({isOpen: true, id: user.id})} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18}/></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in my-8">
            <div className="flex justify-between items-center px-8 py-5 border-b border-slate-100">
               <div><h2 className="text-xl font-bold text-slate-800">{isEditMode ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}</h2><p className="text-xs text-slate-500 mt-1">Lengkapi formulir di bawah ini dengan data yang valid.</p></div>
               <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="text-slate-400"/></button>
            </div>
            <form onSubmit={handleSubmit}>
               <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                  <div className="flex flex-col md:flex-row gap-6 mb-8 items-center md:items-start">
                     <div className="relative group cursor-pointer flex-shrink-0" onClick={() => fileInputRef.current.click()}>
                        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-50 shadow-md bg-slate-100 flex items-center justify-center">
                           {avatarFile ? <img src={URL.createObjectURL(avatarFile)} alt="Preview" className="w-full h-full object-cover"/> : formData.avatar_url ? <img src={formData.avatar_url} alt="Current" className="w-full h-full object-cover"/> : <Users size={32} className="text-slate-300"/>}
                        </div>
                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera className="text-white"/></div>
                        <input type="file" ref={fileInputRef} onChange={e => setAvatarFile(e.target.files[0])} className="hidden" accept="image/*" />
                        <p className="text-[10px] text-center text-blue-600 font-bold mt-2">Ubah Foto</p>
                     </div>
                     <div className="w-full">
                        <label className={labelStyle}>Nama Lengkap Karyawan <span className="text-red-500">*</span></label>
                        <div className="relative"><Users className="absolute left-3 top-3 text-slate-400" size={18}/><input type="text" required className={`${inputStyle} pl-10`} placeholder="Contoh: Budi Santoso" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} /></div>
                     </div>
                  </div>
                  <hr className="border-slate-100 mb-6"/>
                  <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><Smartphone size={16} className="text-blue-500"/> Kontak & Akun</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                     <div><label className={labelStyle}>Email (Untuk Login) <span className="text-red-500">*</span></label><input type="email" required disabled={isEditMode} className={`${inputStyle} disabled:bg-slate-100 disabled:text-slate-500`} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                     <div><label className={labelStyle}>Nomor WhatsApp</label><input type="text" className={inputStyle} placeholder="0812..." value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                     {!isEditMode && (<div className="md:col-span-2"><label className={labelStyle}>Password Sementara <span className="text-red-500">*</span></label><div className="relative"><Lock className="absolute left-3 top-3 text-slate-400" size={18}/><input type="text" required className={`${inputStyle} pl-10`} placeholder="Min. 6 karakter" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} /></div></div>)}
                  </div>
                  <hr className="border-slate-100 mb-6"/>
                  <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><Briefcase size={16} className="text-blue-500"/> Informasi Pekerjaan</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                     
                     {/* --- UPDATE: DROPDOWN DEPARTEMEN DINAMIS --- */}
                     <div>
                        <label className={labelStyle}>Departemen <span className="text-red-500">*</span></label>
                        <select className={inputStyle} value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}>
                             <option value="">-- Pilih Departemen --</option>
                             {departments.map(dept => (
                                <option key={dept.id} value={dept.name}>{dept.name}</option>
                             ))}
                        </select>
                     </div>

                     <div>
                        <label className={labelStyle}>Jabatan / Role <span className="text-red-500">*</span></label>
                        <select className={inputStyle} value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                           <option value="employee">Staff</option><option value="manager">Manager</option><option value="dfd">DFD</option><option value="hrd">HRD</option>
                        </select>
                     </div>
                     <div className="md:col-span-2">
                        <label className={labelStyle}>Atasan Langsung (Reports To)</label>
                        <select className={inputStyle} value={formData.manager_id} onChange={e => setFormData({...formData, manager_id: e.target.value})}>
                           <option value="">-- Tanpa Atasan (Top Level / Direktur) --</option>
                           {potentialManagers.filter(m => m.id !== editId).map(mgr => (<option key={mgr.id} value={mgr.id}>{mgr.full_name} - {mgr.department}</option>))}
                        </select>
                     </div>
                     <div><label className={labelStyle}>Tanggal Bergabung</label><input type="date" className={inputStyle} value={formData.join_date} onChange={e => setFormData({...formData, join_date: e.target.value})} /></div>
                     <div><label className={labelStyle}>Kuota Cuti (Hari)</label><input type="number" className={inputStyle} value={formData.leave_balance} onChange={e => setFormData({...formData, leave_balance: e.target.value})} /></div>
                     <div className="md:col-span-2"><label className={labelStyle}>Status Kepegawaian</label><select className={`${inputStyle} font-bold ${formData.status === 'active' ? 'text-green-600 bg-green-50 border-green-200' : 'text-slate-500 bg-slate-50'}`} value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}><option value="active">🟢 Aktif Bekerja</option><option value="resigned">⚫ Resigned / Non-Aktif</option></select></div>
                  </div>
               </div>
               <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 rounded-b-2xl">
                  <button type="button" onClick={closeModal} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors">Batal</button>
                  <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-transform active:scale-95">{isEditMode ? 'Simpan Perubahan' : 'Simpan Data Karyawan'}</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}