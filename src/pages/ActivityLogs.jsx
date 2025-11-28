import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { History, Search, ShieldCheck } from 'lucide-react';

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false }) // Yang terbaru diatas
      .limit(100); // Batasi 100 log terakhir agar ringan

    setLogs(data || []);
    setLoading(false);
  };

  // Helper warna badge berdasarkan tipe aksi
  const getActionColor = (type) => {
    if (type.includes('REJECT') || type.includes('DELETE')) return 'bg-red-100 text-red-700';
    if (type.includes('APPROVE') || type.includes('CREATE')) return 'bg-green-100 text-green-700';
    if (type.includes('LOGIN') || type.includes('RESET')) return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="p-8 max-w-6xl mx-auto min-h-screen bg-gray-50">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-white rounded-full shadow-sm">
          <History className="text-blue-600" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Audit Trail (Rekam Jejak)</h1>
          <p className="text-gray-500 text-sm">Memantau 100 aktivitas terakhir administrator.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">Waktu</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">Admin (Pelaku)</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">Aksi</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">Detail Aktivitas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="4" className="p-6 text-center text-gray-400">Memuat log...</td></tr>
            ) : logs.map(log => (
              <tr key={log.id} className="hover:bg-blue-50 transition-colors">
                <td className="p-4 text-sm text-gray-600 font-mono">
                  {new Date(log.created_at).toLocaleString('id-ID')}
                </td>
                <td className="p-4 text-sm font-bold text-gray-800 flex items-center gap-2">
                  <ShieldCheck size={14} className="text-green-500"/>
                  {log.user_email}
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${getActionColor(log.action_type)}`}>
                    {log.action_type}
                  </span>
                </td>
                <td className="p-4 text-sm text-gray-700">
                  {log.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
