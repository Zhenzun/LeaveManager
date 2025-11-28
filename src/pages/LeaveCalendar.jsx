import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext'; // Import Context Auth
import { ChevronLeft, ChevronRight, Calendar as CalIcon, RefreshCw, User } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LeaveCalendar() {
  const { user } = useAuth(); // Ambil info user login
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if(user) fetchMonthData();
  }, [currentDate, user]);

  const fetchMonthData = async () => {
    setLoading(true);
    setEvents([]); 

    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const lastDay = new Date(year, month, 0).getDate();
      
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

      // 1. Query Dasar (Approved & Tanggal Masuk Range)
      let query = supabase
        .from('leave_requests')
        .select(`*, profiles:user_id ( id, full_name, role, department, manager_id )`) // Ambil detail profile
        .eq('status', 'approved')
        .lte('start_date', endDate) 
        .gte('end_date', startDate); 

      const { data, error } = await query;
      if (error) throw error;

      // 2. FILTER LOGIC (SCOPE ACCESS) DI CLIENT SIDE
      // Karena struktur hirarki (DFD -> Manager -> Staff) agak kompleks untuk query SQL langsung
      // Kita filter hasil array di JavaScript agar lebih fleksibel.

      const filteredEvents = data.filter(req => {
        const requester = req.profiles;
        
        // A. HRD: Melihat Semua (Mata Tuhan)
        if (user.role === 'hrd') return true;

        // B. SEMUA ORANG: Bisa melihat cutinya sendiri
        if (requester.id === user.id) return true;

        // C. MANAGER: Bisa melihat bawahan langsung
        if (user.role === 'manager') {
            // Cek apakah requester.manager_id == id saya
            return requester.manager_id === user.id;
        }

        // D. DFD: Bisa melihat Manager (Bawahan Langsung) & Staff (Bawahan dari Manager)
        if (user.role === 'dfd') {
            // Level 1: Manager yang lapor ke saya
            if (requester.manager_id === user.id) return true;
            
            // Level 2: Staff (Cek apakah atasan si staff ini lapor ke saya?)
            // Note: Ini butuh data tambahan "siapa manager si staff ini?".
            // Data requester sudah punya 'manager_id', tapi kita butuh tahu apakah manager_id itu adalah anak buah saya.
            // Untuk simplifikasi performa, DFD biasanya melihat PER DEPARTEMEN SAJA.
            
            // Opsi Alternatif DFD: Melihat semua orang di departemen yang sama
            return requester.department === user.department;
        }

        // E. EMPLOYEE: Hanya melihat diri sendiri (Strict Mode)
        // Jika ingin melihat rekan setim, gunakan: return requester.department === user.department;
        return false;
      });

      setEvents(filteredEvents || []);
      
    } catch (err) {
      toast.error("Gagal memuat kalender: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper Format Tanggal Lokal
  const formatDateLocal = (date) => {
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const getDaysArray = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  };

  const getLeavesForDate = (dateObj) => {
    if (!dateObj) return [];
    const dateStr = formatDateLocal(dateObj);
    return events.filter(req => dateStr >= req.start_date && dateStr <= req.end_date);
  };

  const days = getDaysArray();
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-gray-50">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
           <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2"><CalIcon className="text-blue-600" /> Kalender Monitoring</h1>
           <p className="text-gray-500">Jadwal cuti tim Anda (Mode: {user?.role?.toUpperCase()}).</p>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={goToToday} className="px-3 py-2 bg-white border rounded-lg text-sm font-medium hover:bg-gray-50">Hari Ini</button>
           <div className="flex items-center bg-white p-1 rounded-lg shadow-sm border">
             <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={20}/></button>
             <div className="w-40 text-center font-bold text-gray-800">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</div>
             <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight size={20}/></button>
           </div>
           <button onClick={fetchMonthData} className="p-2.5 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700" title="Refresh"><RefreshCw size={20} className={loading ? 'animate-spin' : ''} /></button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-7 bg-gray-50 border-b">
           {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d, i) => (
             <div key={d} className={`p-3 text-center text-sm font-bold uppercase ${i===0 || i===6 ? 'text-red-400' : 'text-gray-600'}`}>{d}</div>
           ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-fr bg-gray-200 gap-[1px] border-b">
           {days.map((dateObj, idx) => {
             const dayLeaves = getLeavesForDate(dateObj);
             const isToday = dateObj && formatDateLocal(dateObj) === formatDateLocal(new Date());
             const isWeekend = dateObj && (dateObj.getDay() === 0 || dateObj.getDay() === 6);

             return (
               <div key={idx} className={`min-h-[120px] p-2 bg-white transition-colors ${!dateObj ? 'bg-gray-50' : ''} ${isWeekend ? 'bg-slate-50' : ''}`}>
                 {dateObj && (
                   <>
                     <div className="flex justify-between items-start mb-2">
                        <span className={`text-xs font-bold ${isWeekend ? 'text-red-300' : 'text-transparent'}`}>LIBUR</span>
                        <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold ${isToday ? 'bg-blue-600 text-white shadow-md' : isWeekend ? 'text-red-500' : 'text-gray-700'}`}>{dateObj.getDate()}</div>
                     </div>
                     <div className="space-y-1">
                       {dayLeaves.map(leave => (
                         <div key={leave.id} className={`text-xs px-2 py-1.5 rounded border shadow-sm cursor-help hover:scale-105 transition-transform truncate
                            ${leave.user_id === user.id ? 'bg-green-100 text-green-800 border-green-200 font-bold' : // Cuti Saya (Hijau)
                              leave.profiles.role === 'manager' ? 'bg-purple-100 text-purple-800 border-purple-200' : 
                              leave.profiles.role === 'dfd' ? 'bg-orange-100 text-orange-800 border-orange-200' : 
                              'bg-blue-50 text-blue-700 border-blue-100'}`
                         } title={`${leave.profiles.full_name} (${leave.profiles.role})\nAlasan: ${leave.reason}`}>
                           <div className="flex items-center gap-1">
                             <User size={10} /> 
                             {leave.user_id === user.id ? 'Saya' : leave.profiles.full_name.split(' ')[0]}
                           </div>
                         </div>
                       ))}
                     </div>
                   </>
                 )}
               </div>
             );
           })}
        </div>
      </div>
      
      <div className="mt-4 flex gap-6 px-4 py-3 bg-white rounded-lg border text-sm text-gray-600 shadow-sm w-fit">
         <span className="font-bold mr-2">Keterangan:</span>
         <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div> Cuti Saya</div>
         {user?.role === 'hrd' && (
             <>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-purple-100 border border-purple-300 rounded"></div> Manager</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-50 border border-blue-300 rounded"></div> Staff</div>
             </>
         )}
      </div>
    </div>
  );
}