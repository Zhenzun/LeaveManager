import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext'; // IMPORT BARU
import { FileText, Printer, FileSpreadsheet, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

export default function Reports() {
  const { user } = useAuth(); // AMBIL USER YANG SEDANG LOGIN
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); 
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({ totalDays: 0, totalPeople: 0 });
  const [loading, setLoading] = useState(false);
  
  // STATE BARU: Hanya simpan data PT & Alamat (Signer dihapus)
  const [company, setCompany] = useState({ 
    company_name: 'Memuat...', 
    company_address: '' 
  });

  useEffect(() => {
    fetchCompanySettings(); 
    fetchReport();          
  }, [month]);

  const fetchCompanySettings = async () => {
    const { data, error } = await supabase
      .from('company_settings')
      .select('company_name, company_address') // Hapus hrd_signer dari select
      .single();
    
    if (data) {
      setCompany(data);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    setData([]); 
    
    const [year, monthIndex] = month.split('-');
    const startDate = `${month}-01`;
    const lastDay = new Date(year, monthIndex, 0).getDate(); 
    const endDate = `${month}-${lastDay}`; 

    const { data: requests, error } = await supabase
      .from('leave_requests')
      .select(`*, profiles:user_id ( full_name, department, role )`)
      .eq('status', 'approved') 
      .gte('start_date', startDate)
      .lte('start_date', endDate) 
      .order('start_date', { ascending: true });

    if (error) {
      toast.error("Error: " + error.message);
    } else {
      setData(requests || []);
      
      let daysCount = 0;
      const uniquePeople = new Set();
      requests?.forEach(req => {
        const start = new Date(req.start_date);
        const end = new Date(req.end_date);
        const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        daysCount += diff;
        uniquePeople.add(req.user_id);
      });
      setStats({ totalDays: daysCount, totalPeople: uniquePeople.size });
    }
    setLoading(false);
  };

  const handleExportCSV = () => {
    if (data.length === 0) return toast.success('Tidak ada data');
    let csv = "No,Nama Karyawan,Departemen,Tanggal Mulai,Tanggal Selesai,Durasi (Hari),Alasan\n";
    data.forEach((req, index) => {
      const start = new Date(req.start_date);
      const end = new Date(req.end_date);
      const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      csv += `${index + 1},"${req.profiles?.full_name}","${req.profiles?.department}",${req.start_date},${req.end_date},${duration},"${req.reason}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Cuti_${month}.csv`;
    a.click();
  };

  const handleExportExcel = () => {
    if (data.length === 0) return toast.success('Tidak ada data');
    const excelData = data.map((req, index) => {
        const start = new Date(req.start_date);
        const end = new Date(req.end_date);
        const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        return {
            "No": index + 1,
            "Nama Karyawan": req.profiles?.full_name,
            "Departemen": req.profiles?.department,
            "Jabatan": req.profiles?.role,
            "Tanggal Mulai": req.start_date,
            "Tanggal Selesai": req.end_date,
            "Durasi (Hari)": duration,
            "Alasan": req.reason
        };
    });
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Cuti");
    const wscols = [{wch: 5}, {wch: 25}, {wch: 15}, {wch: 10}, {wch: 15}, {wch: 15}, {wch: 10}, {wch: 40}];
    worksheet['!cols'] = wscols;
    XLSX.writeFile(workbook, `Laporan_Cuti_${month}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString) => {
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-gray-50">
      
      {/* STYLE PRINT */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-area, #printable-area * { visibility: visible; }
          #printable-area {
            position: absolute;
            left: 0; top: 0; width: 100%; margin: 0; padding: 20px;
            background: white; box-shadow: none !important; border: none !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* HEADER NAVIGASI */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 no-print gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="text-blue-600" /> Laporan Cuti
          </h1>
          <p className="text-gray-500 mt-1">Rekapitulasi penggunaan cuti karyawan per bulan.</p>
        </div>
        
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Pilih Periode</label>
            <input 
              type="month" 
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="p-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          
          <button onClick={handleExportExcel} className="flex items-center gap-2 bg-green-600 text-white px-3 py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors shadow-sm">
            <FileSpreadsheet size={18} /> Excel
          </button>

          <button onClick={handleExportCSV} className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm">
            <Download size={18} /> CSV
          </button>

          <button onClick={handlePrint} className="flex items-center gap-2 bg-gray-800 text-white px-3 py-2.5 rounded-lg font-medium hover:bg-black transition-colors shadow-sm">
            <Printer size={18} /> Print / PDF
          </button>
        </div>
      </div>

      {/* --- KERTAS LAPORAN --- */}
      <div id="printable-area" className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        
        {/* KOP LAPORAN */}
        <div className="border-b-2 border-gray-800 pb-4 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 uppercase tracking-wider">Laporan Bulanan HRD</h2>
              <p className="text-sm text-gray-500 uppercase font-bold">{company.company_name}</p>
              <p className="text-xs text-gray-400 max-w-md">{company.company_address}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-gray-600">Periode</p>
              <p className="text-lg font-mono text-blue-600 font-bold">
                {new Date(month).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        {/* RINGKASAN */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 print:bg-gray-50 print:border-gray-300">
            <p className="text-xs text-blue-600 font-bold uppercase print:text-black">Total Karyawan Cuti</p>
            <p className="text-2xl font-bold text-gray-800">{stats.totalPeople} <span className="text-sm font-normal text-gray-500">Orang</span></p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-100 print:bg-gray-50 print:border-gray-300">
            <p className="text-xs text-green-600 font-bold uppercase print:text-black">Total Hari Terpakai</p>
            <p className="text-2xl font-bold text-gray-800">{stats.totalDays} <span className="text-sm font-normal text-gray-500">Hari Kerja</span></p>
          </div>
        </div>

        {/* TABEL DATA */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-gray-300 text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-700 text-xs uppercase font-bold print:bg-gray-200">
                <th className="p-3 border border-gray-300">No</th>
                <th className="p-3 border border-gray-300">Nama Karyawan</th>
                <th className="p-3 border border-gray-300">Dept.</th>
                <th className="p-3 border border-gray-300">Tanggal Cuti</th>
                <th className="p-3 border border-gray-300 text-center">Durasi</th>
                <th className="p-3 border border-gray-300">Alasan</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="p-4 text-center">Memuat data...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan="6" className="p-4 text-center text-gray-400 italic">Tidak ada data cuti pada bulan ini.</td></tr>
              ) : (
                data.map((req, index) => {
                  const start = new Date(req.start_date);
                  const end = new Date(req.end_date);
                  const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

                  return (
                    <tr key={req.id} className="border-b border-gray-200">
                      <td className="p-3 border border-gray-300 text-center">{index + 1}</td>
                      <td className="p-3 border border-gray-300 font-bold text-gray-700">{req.profiles?.full_name}</td>
                      <td className="p-3 border border-gray-300">{req.profiles?.department}</td>
                      <td className="p-3 border border-gray-300 whitespace-nowrap">
                        {formatDate(req.start_date)} 
                        <br className="hidden print:block"/>
                        {req.start_date !== req.end_date && ` - ${formatDate(req.end_date)}`}
                      </td>
                      <td className="p-3 border border-gray-300 text-center font-bold">{duration} Hari</td>
                      <td className="p-3 border border-gray-300 text-gray-600 italic">"{req.reason}"</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* FOOTER TANDA TANGAN (DINAMIS SESUAI USER LOGIN) */}
        <div className="flex justify-end mt-16 break-inside-avoid">
          <div className="text-center pr-8">
            <p className="mb-20 text-sm">
              Jakarta, {new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}
            </p>
            
            {/* GANTI INI: MENGGUNAKAN NAMA USER YANG LOGIN */}
            <p className="font-bold underline uppercase">{user?.full_name || '......................'}</p>
            
            <p className="text-xs mb-1">Manager HRD</p>
            <p className="text-xs font-bold">{company.company_name}</p>
          </div>
        </div>

      </div>
    </div>
  );
}