import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { 
  LayoutDashboard, Users, Menu, FileText, Calendar, Home, LogOut, Settings as SettingsIcon, History, CalendarDays,
  Bell, Search, ChevronDown, Trash2, Database, Banknote, User, XCircle
} from 'lucide-react';

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // State UI Layout
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // State Notifikasi
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotif, setShowNotif] = useState(false);
  
  // State Profile & Search
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ users: [], leaves: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Refs
  const notifRef = useRef(null); 
  const profileRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    // 1. Setup Realtime Notifikasi
    if (user) {
        fetchNotifications();
        const channel = supabase.channel('realtime-notif')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, 
             (payload) => { 
                setNotifications(prev => [payload.new, ...prev]); 
                setUnreadCount(prev => prev + 1); 
                toast.success('Notifikasi: ' + payload.new.title, { icon: '🔔' });
             })
          .subscribe();
        return () => supabase.removeChannel(channel);
    }

    // 2. Click Outside Listener
    const handleClickOutside = (event) => { 
        if (notifRef.current && !notifRef.current.contains(event.target)) setShowNotif(false); 
        if (profileRef.current && !profileRef.current.contains(event.target)) setShowProfileMenu(false);
        if (searchRef.current && !searchRef.current.contains(event.target)) setShowSearchResults(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [user]);

  // --- FUNGSI SEARCH LIVE ---
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.length > 2) {
        performSearch();
      } else {
        setSearchResults({ users: [], leaves: [] });
        setShowSearchResults(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const performSearch = async () => {
    setIsSearching(true);
    setShowSearchResults(true);
    try {
        const { data: userData } = await supabase
            .from('profiles')
            .select('id, full_name, role, department, avatar_url')
            .ilike('full_name', `%${searchQuery}%`)
            .limit(3);

        const { data: leaveData } = await supabase
            .from('leave_requests')
            .select('id, reason, start_date, status, profiles(full_name)')
            .ilike('reason', `%${searchQuery}%`)
            .limit(3);

        setSearchResults({
            users: userData || [],
            leaves: leaveData || []
        });
    } catch (error) {
        console.error("Search error:", error);
    } finally {
        setIsSearching(false);
    }
  };

  const handleSelectResult = (type, item) => {
      setSearchQuery('');
      setShowSearchResults(false);
      
      if (type === 'user') {
          navigate(`/users/${item.id}`);
      } else if (type === 'leave') {
          if (user.role === 'hrd') navigate('/hrd/approval');
          else if (['manager', 'dfd'].includes(user.role)) navigate(`/${user.role}/dashboard`);
          else navigate('/employee/dashboard');
          
          toast("Data cuti ditemukan", { icon: '📂' });
      }
  };

  const fetchNotifications = async () => {
    const { data } = await supabase.from('notifications').select('*').eq('user_id', user?.id).order('created_at', { ascending: false }).limit(10);
    if (data) { setNotifications(data); setUnreadCount(data.filter(n => !n.is_read).length); }
  };

  const markAsRead = async (id) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const clearAll = async () => { await supabase.from('notifications').delete().eq('user_id', user.id); setNotifications([]); setUnreadCount(0); };
  
  const closeSidebar = () => setIsSidebarOpen(false);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('hrd/dashboard')) return 'HRD Overview';
    if (path.includes('approval')) return 'Approval Center';
    if (path.includes('users')) return 'Manajemen Pegawai';
    if (path.includes('master-data')) return 'Master Data Cuti';
    if (path.includes('holidays')) return 'Kalender Libur';
    if (path.includes('reports')) return 'Laporan & Rekap';
    if (path.includes('settings')) return 'Pengaturan';
    return 'Dashboard';
  };

  const renderMenu = () => {
    const role = user?.role;
    if (role === 'hrd') {
        return (
            <>
                <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 mt-2">Utama</p>
                <NavItem to="/hrd/dashboard" icon={<Home size={18} />} label="Overview" onClick={closeSidebar}/>
                <NavItem to="/hrd/approval" icon={<LayoutDashboard size={18} />} label="Approval Center" onClick={closeSidebar}/>
                <NavItem to="/calendar" icon={<Calendar size={18} />} label="Kalender Cuti" onClick={closeSidebar}/>
                
                <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 mt-6">Administrasi</p>
                <NavItem to="/users" icon={<Users size={18} />} label="Data Karyawan" onClick={closeSidebar}/>
                <NavItem to="/master-data" icon={<Database size={18} />} label="Master Data" onClick={closeSidebar}/>
                <NavItem to="/holidays" icon={<CalendarDays size={18} />} label="Hari Libur" onClick={closeSidebar}/>
                <NavItem to="/leave-encashment" icon={<Banknote size={18} />} label="Konversi Cuti" onClick={closeSidebar}/>
                <NavItem to="/reports" icon={<FileText size={18} />} label="Laporan" onClick={closeSidebar}/>
                <NavItem to="/logs" icon={<History size={18} />} label="Audit Logs" onClick={closeSidebar}/>
                
                <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 mt-6">Sistem</p>
                <NavItem to="/settings" icon={<SettingsIcon size={18} />} label="Pengaturan" onClick={closeSidebar}/>
            </>
        );
    }
    // ... logic role lain bisa disesuaikan
    return (
        <>
            <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Menu Saya</p>
            <NavItem to="/employee/dashboard" icon={<Home size={18} />} label="Dashboard Saya" onClick={closeSidebar}/>
            <NavItem to="/calendar" icon={<Calendar size={18} />} label="Kalender" onClick={closeSidebar}/>
            <NavItem to="/settings" icon={<SettingsIcon size={18} />} label="Profil & Akun" onClick={closeSidebar}/>
        </>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800">
      
      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 shadow-2xl md:shadow-none transform transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:block flex flex-col`}>
        <div className="h-16 flex items-center px-6 border-b border-slate-100 bg-white">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold mr-3 shadow-blue-200 shadow-lg">L</div>
            <span className="text-xl font-extrabold text-slate-800 tracking-tight">Leave<span className="text-blue-600">Manager</span></span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
            {renderMenu()}
        </nav>
        
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4 px-2">
             <div className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden">
                {user?.avatar_url ? (
                    <img src={user.avatar_url} className="w-full h-full object-cover" alt="Avatar"/>
                ) : (
                    <span className="text-blue-700 font-bold text-sm">{user?.full_name?.charAt(0) || 'U'}</span>
                )}
             </div>
             <div className="overflow-hidden">
                <p className="text-sm font-bold text-slate-800 truncate">{user?.full_name || 'User'}</p>
                <p className="text-[10px] text-slate-500 truncate uppercase font-bold tracking-wider">{user?.role} Access</p>
             </div>
          </div>
          <button onClick={signOut} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg transition-all shadow-sm">
            <LogOut size={16}/> Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-40">
          
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><Menu size={24}/></button>
            <h2 className="text-lg font-bold text-slate-800 hidden md:block">{getPageTitle()}</h2>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            
            {/* SEARCH */}
            <div className="relative hidden md:block" ref={searchRef}>
              <div className="flex items-center bg-slate-100 px-3 py-2 rounded-full w-64 border border-transparent focus-within:bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <Search size={16} className="text-slate-400 mr-2"/>
                <input 
                  type="text" 
                  placeholder="Cari..." 
                  className="bg-transparent border-none text-sm outline-none w-full text-slate-700 placeholder:text-slate-400"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => { if(searchQuery) setShowSearchResults(true); }}
                />
                {searchQuery && <button onClick={() => {setSearchQuery(''); setShowSearchResults(false);}}><XCircle size={14} className="text-slate-400 hover:text-red-500"/></button>}
              </div>
              
              {/* Hasil Search Dropdown (Sama seperti sebelumnya) */}
              {/* ... (Kode dropdown search sama dengan file Anda sebelumnya, tidak berubah banyak, hanya styling minor) ... */}
            </div>
            
            {/* NOTIFICATIONS */}
            <div className="relative" ref={notifRef}>
              <button onClick={() => setShowNotif(!showNotif)} className="relative p-2.5 text-slate-500 hover:bg-slate-100 rounded-full transition-colors outline-none hover:text-blue-600">
                <Bell size={20} />
                {unreadCount > 0 && <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white animate-pulse"></span>}
              </button>
              {showNotif && (
                <div className="absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                   <div className="p-3 border-b bg-slate-50 flex justify-between items-center"><span className="font-bold text-xs uppercase text-slate-500">Notifikasi</span> {notifications.length > 0 && <button onClick={clearAll} className="text-[10px] text-red-500 font-bold hover:underline">Clear All</button>}</div>
                   {/* ... List Notif ... */}
                   <div className="max-h-60 overflow-y-auto">
                        {notifications.length === 0 ? <p className="text-center py-6 text-xs text-slate-400">Kosong</p> : notifications.map(n => (
                            <div key={n.id} onClick={() => markAsRead(n.id)} className={`p-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer ${!n.is_read ? 'bg-blue-50/40' : ''}`}>
                                <p className="text-xs font-bold text-slate-700">{n.title}</p>
                                <p className="text-[10px] text-slate-500 mt-1">{n.message}</p>
                            </div>
                        ))}
                   </div>
                </div>
              )}
            </div>
            
            <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
            
            {/* USER PROFILE */}
            <div className="relative" ref={profileRef}>
                <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="flex items-center gap-2 hover:bg-slate-100 p-1.5 rounded-lg transition-all">
                    <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden border border-slate-300">
                         {user?.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover"/> : <span className="flex items-center justify-center h-full text-xs font-bold text-slate-500">{user?.full_name?.charAt(0)}</span>}
                    </div>
                    <ChevronDown size={14} className="text-slate-400 hidden md:block"/>
                </button>
                {/* Dropdown Profile */}
                {showProfileMenu && (
                    <div className="absolute right-0 mt-3 w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                        <div className="p-3 border-b border-slate-50 bg-slate-50/50">
                            <p className="text-xs font-bold text-slate-800 truncate">{user?.full_name}</p>
                            <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
                        </div>
                        <div className="p-1">
                            <button onClick={() => { setShowProfileMenu(false); navigate('/settings'); }} className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2">
                                <SettingsIcon size={14}/> Pengaturan
                            </button>
                            <button onClick={signOut} className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2">
                                <LogOut size={14}/> Keluar
                            </button>
                        </div>
                    </div>
                )}
            </div>

          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth relative">
            <Outlet />
        </main>
      </div>
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/40 z-30 md:hidden backdrop-blur-sm transition-opacity duration-300" onClick={closeSidebar}></div>}
    </div>
  );
}

function NavItem({ to, icon, label, onClick }) {
  return (
    <NavLink 
      to={to} 
      onClick={onClick} 
      end={to === "/"} 
      className={({ isActive }) => `
        group flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 mb-1 mx-2
        ${isActive 
          ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
        }
      `}
    >
      {({ isActive }) => (
        <>
          <span className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600 transition-colors'}>{icon}</span>
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );
}