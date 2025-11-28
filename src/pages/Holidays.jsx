import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Calendar, Plus, Trash2, CalendarDays, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import ModalConfirm from '../components/ModalConfirm';

export default function Holidays() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State Form Tambah
  const [newDate, setNewDate] = useState('');
  const [description, setDescription] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // State Modal Hapus
  const [modal, setModal] = useState({ isOpen: false, id: null });

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('public_holidays')
      .select('*')
      .order('date', { ascending: true });
    
    if (error) toast.error("Gagal memuat data libur.");
    else setHolidays(data || []);
    
    setLoading(false);
  };

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (!newDate || !description) return toast.error("Lengkapi data!");

    setIsAdding(true);
    const { error } = await supabase.from('public_holidays').insert({
      date: newDate,
      description: description
    });

    if (error) {
      if (error.code === '23505') toast.error("Tanggal ini sudah terdaftar!");
      else toast.error(error.message);
    } else {
      toast.success("Hari libur ditambahkan!");
      setNewDate('');
      setDescription('');
      fetchHolidays();
    }
    setIsAdding(false);
  };

  const handleDelete = async () => {
    const { error } = await supabase.from('public_holidays').delete().eq('id', modal.id);
    if (error) toast.error("Gagal menghapus.");
    else {
      toast.success("Dihapus.");
      fetchHolidays();
    }
    setModal({ isOpen: false, id: null });
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  const isPast = (dateStr) => new Date(dateStr) < new Date().setHours(0,0,0,0);

  return (
    <div className="p-8 max-w-5xl mx-auto min-h-screen">
      <ModalConfirm 
        isOpen={modal.isOpen} 
        onClose={() => setModal({isOpen: false, id: null})} 
        onConfirm={handleDelete}
        title="Hapus Hari Libur?"
        message="Tanggal ini tidak akan lagi dihitung sebagai pengecualian cuti."
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <CalendarDays className="text-blue-600" /> Konfigurasi Hari Libur
          </h1>
          <p className="text-gray-500 mt-1">Daftar tanggal merah nasional & cuti bersama perusahaan.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* FORM */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 sticky top-8">
            <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Plus size={20} className="text-blue-600"/> Tambah Baru
            </h2>
            <form onSubmit={handleAddHoliday} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tanggal</label>
                <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Keterangan</label>
                <input type="text" placeholder="Contoh: Tahun Baru Imlek" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
              </div>
              <button disabled={isAdding} className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 flex justify-center items-center gap-2">
                {isAdding ? <Loader2 className="animate-spin" /> : 'Simpan ke Database'}
              </button>
            </form>
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs text-blue-700 leading-relaxed">
                <strong>Catatan:</strong> Tanggal yang Anda tambahkan di sini otomatis 
                akan dilewati (tidak dihitung) saat kalkulasi durasi cuti karyawan.
              </p>
            </div>
          </div>
        </div>
        {/* TABLE */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Tanggal</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Keterangan</th>
                    <th className="p-4 text-right text-xs font-bold text-slate-500 uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? ( <tr><td colSpan="3" className="p-8 text-center text-slate-400">Memuat data...</td></tr> ) 
                  : holidays.length === 0 ? ( <tr><td colSpan="3" className="p-8 text-center text-slate-400 italic">Belum ada data libur.</td></tr> ) 
                  : ( holidays.map(h => {
                      const passed = isPast(h.date);
                      return (
                        <tr key={h.id} className={`transition-colors ${passed ? 'bg-slate-50 grayscale opacity-60' : 'hover:bg-blue-50'}`}>
                          <td className="p-4 whitespace-nowrap">
                            <div className={`font-bold ${passed ? 'text-slate-500' : 'text-slate-700'}`}>{formatDate(h.date)}</div>
                            {passed && <span className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded text-gray-500">Sudah lewat</span>}
                          </td>
                          <td className="p-4 text-sm text-slate-600">{h.description}</td>
                          <td className="p-4 text-right">
                            <button onClick={() => setModal({ isOpen: true, id: h.id })} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                          </td>
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