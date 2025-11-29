import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { 
  User, Building, Lock, ShieldCheck, Save, Camera, 
  Smartphone, Mail, Loader2, Settings as SettingsIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';

export default function Settings() {
  // Ambil user dan refreshProfile dari Context
  // Jika refreshProfile undefined, kita beri fungsi kosong agar tidak error
  const { user: authUser, refreshProfile } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('profile');

  // --- STATE DATA ---
  const [profile, setProfile] = useState({ 
    full_name: '', email: '', phone: '', avatar_url: '', department: '', role: '' 
  });
  
  // State Perusahaan (Hanya dipakai jika HRD)
  const [company, setCompany] = useState({ company_name: '', company_address: '' });
  
  // State Keamanan
  const [passwords, setPasswords] = useState({ new: '', confirm: '' });
  const [mfaData, setMfaData] = useState(null);
  const [isMfaEnabled, setIsMfaEnabled] = useState(false);
  const [showMfaModal, setShowMfaModal] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  
  // Upload Avatar
  const [avatarFile, setAvatarFile] = useState(null);
  const fileInputRef = useRef(null);

  // --- 1. INITIAL LOAD ---
  useEffect(() => {
    if (authUser) {
      setProfile({
        full_name: authUser.full_name || '',
        email: authUser.email || '',
        phone: authUser.phone || '',
        avatar_url: authUser.avatar_url || '',
        department: authUser.department || '',
        role: authUser.role || ''
      });
      
      checkMfaStatus();
      
      // LOGIKA KHUSUS: Hanya ambil data perusahaan jika user adalah HRD
      if (authUser.role === 'hrd') {
        fetchCompanySettings();
      }
    }
  }, [authUser]);

  const fetchCompanySettings = async () => {
    const { data } = await supabase.from('company_settings').select('*').single();
    if (data) setCompany(data);
  };

  const checkMfaStatus = async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) return;
    const activeFactor = data.totp.find(f => f.status === 'verified');
    setIsMfaEnabled(!!activeFactor);
  };

  // --- 2. HANDLERS ---
  const handleUploadAvatar = async () => {
    if (!avatarFile) return profile.avatar_url;
    
    const fileExt = avatarFile.name.split('.').pop();
    const fileName = `${authUser.id}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, avatarFile);
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSavePersonal = async (e) => {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading("Menyimpan data...");

    try {
      const avatarUrl = await handleUploadAvatar();
      
      // Update Profil (Berlaku untuk SEMUA ROLE)
      const updates = {
        full_name: profile.full_name,
        phone: profile.phone,
        avatar_url: avatarUrl
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', authUser.id);

      if (error) throw error;

      // PERBAIKAN UTAMA: Cek dulu apakah refreshProfile ada
      if (typeof refreshProfile === 'function') {
          await refreshProfile(); 
      }
      
      toast.success("Profil berhasil disimpan!", { id: toastId });
      setAvatarFile(null); 

    } catch (err) {
      console.error(err);
      toast.error("Gagal: " + err.message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCompany = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('company_settings').update(company).eq('id', 1);
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success('Info Perusahaan disimpan!');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) return toast.error('Konfirmasi password tidak sama!');
    if (passwords.new.length < 6) return toast.error('Minimal 6 karakter');
    
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: passwords.new });
    setLoading(false);
    
    if (error) toast.error(error.message);
    else { 
      toast.success('Password berhasil diubah!'); 
      setPasswords({ new: '', confirm: '' }); 
    }
  };

  const handleEnrollMfa = async () => {
    setLoading(true);
    try {
      const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) throw listError;
      const unverifiedFactors = factors.totp.filter(f => f.status === 'unverified');
      for (const factor of unverifiedFactors) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }
      const uniqueName = `${profile.full_name} (${new Date().getTime().toString().slice(-4)})`;
      const { data, error } = await supabase.auth.mfa.enroll({ 
        factorType: 'totp', 
        friendlyName: uniqueName 
      });

      if (error) throw error;
      
      setMfaData(data); 
      setShowMfaModal(true);
    } catch (err) { 
      console.error("MFA Error:", err);
      if (err.message?.includes("already exists")) {
         toast.error("Sedang membersihkan sesi lama, coba klik tombol sekali lagi.");
      } else {
         toast.error(err.message); 
      }
    } finally { 
      setLoading(false); 
    }
  };

  const handleVerifyMfa = async () => {
    setLoading(true);
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId: mfaData.id });
      const verify = await supabase.auth.mfa.verify({ factorId: mfaData.id, challengeId: challenge.data.id, code: verifyCode });
      if (verify.error) throw verify.error;
      toast.success("2FA Berhasil Diaktifkan!"); setIsMfaEnabled(true); setShowMfaModal(false);
    } catch (err) { toast.error("Kode Salah!"); } finally { setLoading(false); }
  };

  const handleUnenroll = async () => {
    if(!window.confirm("Matikan 2FA?")) return;
    setLoading(true);
    try {
      const factors = await supabase.auth.mfa.listFactors();
      const active = factors.data?.totp?.find(f => f.status === 'verified');
      if (active) await supabase.auth.mfa.unenroll({ factorId: active.id });
      setIsMfaEnabled(false); toast.success("2FA Dimatikan.");
    } catch (err) { toast.error(err.message); } finally { setLoading(false); }
  };

  // --- KOMPONEN MENU ---
  const MenuButton = ({ id, label, icon }) => (
    <button 
      onClick={() => setActiveSection(id)}
      className={`w-full text-left px-4 py-3 flex items-center gap-3 rounded-lg transition-all mb-1 font-medium text-sm
        ${activeSection === id ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}
      `}
    >
      <div className={`${activeSection === id ? 'text-blue-600' : 'text-slate-400'}`}>{icon}</div>
      {label}
    </button>
  );

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto min-h-screen font-sans">
      
      <div className="flex items-center gap-3 mb-8">
        <SettingsIcon className="text-blue-600" size={28} />
        <h1 className="text-2xl font-bold text-slate-800">Pengaturan Akun</h1>
      </div>

      <div className="grid grid-cols-12 gap-8">
        
        {/* === SIDEBAR MENU (Otomatis Berubah Sesuai Role) === */}
        <div className="col-span-12 md:col-span-3">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sticky top-8">
             {/* Menu ini muncul untuk SEMUA orang */}
             <MenuButton id="profile" label="Profil Saya" icon={<User size={18}/>} />
             <MenuButton id="security" label="Keamanan" icon={<ShieldCheck size={18}/>} />
             
             {/* Menu ini HANYA muncul untuk HRD */}
             {authUser?.role === 'hrd' && (
                <div className="mt-2 pt-2 border-t border-slate-100">
                    <p className="px-4 text-[10px] font-bold text-slate-400 uppercase mb-2">Admin</p>
                    <MenuButton id="company" label="Info Perusahaan" icon={<Building size={18}/>} />
                </div>
             )}
          </div>
        </div>

        {/* === KONTEN === */}
        <div className="col-span-12 md:col-span-9 space-y-6">

            {/* --- SECTION 1: PROFIL SAYA (Untuk Semua Role) --- */}
            {activeSection === 'profile' && (
                <div className="bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden">
                    <div className="p-6 pb-0">
                        <div className="flex items-center gap-2 mb-4">
                            <User className="text-slate-600" size={20}/>
                            <h2 className="text-lg font-bold text-slate-700">Profil Saya</h2>
                        </div>
                        <hr className="border-t border-slate-200" />
                    </div>

                    <form onSubmit={handleSavePersonal} className="p-6 pt-4 space-y-5">
                        <div className="flex items-center gap-4 mb-2">
                             <div className="relative group cursor-pointer" onClick={() => fileInputRef.current.click()}>
                                <div className="w-16 h-16 rounded-full border border-slate-300 overflow-hidden bg-slate-50 flex items-center justify-center">
                                    {avatarFile ? (
                                        <img src={URL.createObjectURL(avatarFile)} className="w-full h-full object-cover" alt="Preview"/>
                                    ) : profile.avatar_url ? (
                                        <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Avatar"/>
                                    ) : (
                                        <User className="text-slate-300" size={32}/>
                                    )}
                                </div>
                                <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera className="text-white" size={20}/>
                                </div>
                             </div>
                             <div>
                                 <button type="button" onClick={() => fileInputRef.current.click()} className="text-xs font-bold text-blue-600 hover:underline">Ganti Foto</button>
                                 <input type="file" ref={fileInputRef} onChange={e => setAvatarFile(e.target.files[0])} className="hidden" accept="image/*" />
                             </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">NAMA LENGKAP</label>
                            <input type="text" className="w-full p-2.5 bg-white border border-slate-400 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500" value={profile.full_name} onChange={e => setProfile({...profile, full_name: e.target.value})} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">EMAIL (READ-ONLY)</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                                    <input type="text" disabled className="w-full pl-9 pr-3 py-2.5 bg-slate-100 border border-slate-300 rounded-md text-sm text-slate-500 cursor-not-allowed" value={profile.email} />
                                </div>
                            </div>
                             <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">WHATSAPP</label>
                                <div className="relative">
                                    <Smartphone className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                                    <input type="text" className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-400 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} />
                                </div>
                            </div>
                        </div>

                        <div className="pt-2 flex justify-end">
                             <button disabled={loading} className="bg-blue-600 text-white px-5 py-2.5 rounded-md font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-70 shadow-blue-100">
                                {loading ? <Loader2 className="animate-spin" size={16}/> : <><Save size={16}/> Simpan Profil</>}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* --- SECTION 2: KEAMANAN (Untuk Semua Role) --- */}
            {activeSection === 'security' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden">
                        <div className="p-6 pb-0">
                            <div className="flex items-center gap-2 mb-4">
                                <Lock className="text-slate-600" size={20}/>
                                <h2 className="text-lg font-bold text-slate-700">Ganti Password</h2>
                            </div>
                            <hr className="border-t border-slate-200" />
                        </div>
                        <form onSubmit={handleChangePassword} className="p-6 pt-4 space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">PASSWORD BARU</label>
                                    <input type="password" value={passwords.new} onChange={e => setPasswords({...passwords, new: e.target.value})} placeholder="••••••••" className="w-full p-2.5 bg-white border border-slate-400 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">KONFIRMASI PASSWORD</label>
                                    <input type="password" value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} placeholder="••••••••" className="w-full p-2.5 bg-white border border-slate-400 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>
                            <div className="pt-2 flex justify-end">
                                <button disabled={loading} className="bg-slate-800 text-white px-5 py-2.5 rounded-md font-bold text-sm hover:bg-black transition-colors shadow-sm flex items-center gap-2">
                                    {loading ? <Loader2 className="animate-spin" size={16}/> : 'Update Password'}
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden">
                        <div className="p-6 pb-0">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="text-slate-600" size={20}/>
                                    <h2 className="text-lg font-bold text-slate-700">Autentikasi Dua Faktor (2FA)</h2>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wide ${isMfaEnabled ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                    {isMfaEnabled ? 'Status: Aktif' : 'Status: Non-Aktif'}
                                </span>
                            </div>
                            <hr className="border-t border-slate-200" />
                        </div>
                        
                        <div className="p-6 pt-4">
                            {isMfaEnabled ? (
                                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-emerald-50 border border-emerald-200 p-4 rounded-md">
                                    <div>
                                        <p className="text-sm font-bold text-emerald-800">Akun Anda Terlindungi</p>
                                        <p className="text-xs text-emerald-600 mt-1">Kode Authenticator diperlukan setiap kali login.</p>
                                    </div>
                                    <button onClick={handleUnenroll} className="px-4 py-2 bg-white border border-emerald-300 text-red-600 text-xs font-bold rounded hover:bg-red-50 transition-colors">Matikan 2FA</button>
                                </div>
                            ) : (
                                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-blue-50 border border-blue-200 p-4 rounded-md">
                                    <div>
                                        <p className="text-sm font-bold text-blue-800">Tingkatkan Keamanan Akun</p>
                                        <p className="text-xs text-blue-600 mt-1">Aktifkan fitur ini untuk mencegah akses tidak sah.</p>
                                    </div>
                                    <button onClick={handleEnrollMfa} disabled={loading} className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 transition-colors shadow-sm">Aktifkan Sekarang</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- SECTION 3: INFO PERUSAHAAN (KHUSUS HRD) --- */}
            {activeSection === 'company' && authUser?.role === 'hrd' && (
                <div className="bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden">
                    <div className="p-6 pb-0">
                        <div className="flex items-center gap-2 mb-4">
                            <Building className="text-slate-600" size={20}/>
                            <h2 className="text-lg font-bold text-slate-700">Info Perusahaan</h2>
                        </div>
                        <hr className="border-t border-slate-200" />
                    </div>

                    <form onSubmit={handleSaveCompany} className="p-6 pt-4 space-y-5">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">NAMA PERUSAHAAN</label>
                            <input type="text" className="w-full p-2.5 bg-white border border-slate-400 rounded-md text-slate-800 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500" value={company.company_name} onChange={e => setCompany({...company, company_name: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">ALAMAT</label>
                            <textarea rows="3" className="w-full p-2.5 bg-white border border-slate-400 rounded-md text-slate-800 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500" value={company.company_address} onChange={e => setCompany({...company, company_address: e.target.value})} />
                        </div>
                        <div className="pt-2 flex justify-end">
                            <button disabled={loading} className="bg-blue-600 text-white px-5 py-2.5 rounded-md font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-70 shadow-blue-100">
                                {loading ? <Loader2 className="animate-spin" size={16}/> : <><Save size={16}/> Simpan Info</>}
                            </button>
                        </div>
                    </form>
                </div>
            )}

        </div>
      </div>

      {/* MODAL QR CODE */}
      {showMfaModal && mfaData && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-8 flex flex-col items-center text-center border border-slate-200">
                <h3 className="font-bold text-xl text-slate-800 mb-2">Scan QR Code</h3>
                <p className="text-xs text-slate-500 mb-6">Buka Google Authenticator & Scan.</p>
                <div className="p-4 bg-white border-2 border-slate-100 rounded-xl shadow-inner mb-6">
                    <QRCodeSVG value={mfaData.totp.uri} size={180} />
                </div>
                <input 
                    type="text" placeholder="000000" 
                    className="w-full text-center text-2xl font-mono tracking-[0.5em] p-3 border border-slate-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 outline-none text-slate-700"
                    maxLength={6}
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g,''))}
                />
                <div className="flex gap-3 w-full">
                    <button onClick={() => setShowMfaModal(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-lg transition-colors text-sm">Batal</button>
                    <button onClick={handleVerifyMfa} disabled={verifyCode.length < 6 || loading} className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md disabled:opacity-50 text-sm">Verifikasi</button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}