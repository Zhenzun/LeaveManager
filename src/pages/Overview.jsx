import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Users, Clock, CalendarCheck, TrendingUp, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import toast from 'react-hot-toast';

export default function Overview() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    onLeaveToday: 0,
    pendingRequests: 0,
    leaveDebtUsers: 0
  });
  const [deptData, setDeptData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];

    // 1. Ambil Data Karyawan
    const { data: users } = await supabase.from('profiles').select('*');
    
    // 2. Ambil Data Cuti (Semua)
    const { data: leaves } = await supabase.from('leave_requests').select('*, profiles(department)');

    // --- HITUNG STATISTIK ---
    
    // Siapa yang cuti hari ini? (Approved & Tanggal Masuk Range)
    const onLeave = leaves?.filter(l => 
        l.status === 'approved' && 
        l.start_date <= today && 
        l.end_date >= today
    ).length || 0;

    // Berapa yang pending?
    const pending = leaves?.filter(l => l.status === 'pending').length || 0;

    // Siapa yang hutang cuti?
    const debts = users?.filter(u => u.leave_balance < 0).length || 0;

    setStats({
      totalEmployees: users?.length || 0,
      onLeaveToday: onLeave,
      pendingRequests: pending,
      leaveDebtUsers: debts
    });

    // --- OLAH DATA UNTUK GRAFIK PIE (Per Dept) ---
    // Hitung total hari cuti yang DISETUJUI per departemen
    const deptMap = {};
    leaves?.filter(l => l.status === 'approved').forEach(l => {
      const dept = l.profiles?.department || 'Unknown';
      if (!deptMap[dept]) deptMap[dept] = 0;
      deptMap[dept]++;
    });

    const pieData = Object.keys(deptMap).map(key => ({
      name: key,
      value: deptMap[key]
    }));
    setDeptData(pieData);

    // --- OLAH DATA UNTUK GRAFIK BAR (Tren Bulanan) ---
    const monthMap = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    
    // Inisialisasi 0
    months.forEach(m => monthMap[m] = 0);

    leaves?.filter(l => l.status === 'approved').forEach(l => {
      const date = new Date(l.start_date);
      const monthIdx = date.getMonth();
      const monthName = months[monthIdx];
      monthMap[monthName]++;
    });

    const barData = Object.keys(monthMap).map(key => ({
      name: key,
      leaves: monthMap[key]
    }));
    setTrendData(barData);

    setLoading(false);
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-gray-50">
      <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
        <TrendingUp className="text-blue-600" /> Executive Dashboard
      </h1>
      <p className="text-gray-500 mb-8">Ringkasan statistik operasional SDM & Cuti.</p>

      {/* --- KARTU STATISTIK --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        
        <StatCard 
          icon={<Users className="text-blue-600" />}
          label="Total Karyawan"
          value={stats.totalEmployees}
          color="bg-blue-50 border-blue-100"
        />
        <StatCard 
          icon={<CalendarCheck className="text-green-600" />}
          label="Cuti Hari Ini"
          value={stats.onLeaveToday}
          color="bg-green-50 border-green-100"
          desc="Orang tidak masuk"
        />
        <StatCard 
          icon={<Clock className="text-orange-600" />}
          label="Butuh Approval"
          value={stats.pendingRequests}
          color="bg-orange-50 border-orange-100"
          desc="Request tertunda"
        />
        <StatCard 
          icon={<AlertCircle className="text-red-600" />}
          label="Hutang Cuti"
          value={stats.leaveDebtUsers}
          color="bg-red-50 border-red-100"
          desc="Karyawan minus saldo"
        />

      </div>

      {/* --- GRAFIK SECTION --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* GRAFIK 1: PIE CHART */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-bold text-gray-700 mb-4">Distribusi Cuti per Departemen</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deptData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label
                >
                  {deptData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRAFIK 2: BAR CHART */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-bold text-gray-700 mb-4">Tren Cuti Tahunan</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="leaves" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}

// Komponen Kecil Kartu
function StatCard({ icon, label, value, color, desc }) {
  return (
    <div className={`p-6 rounded-xl border ${color} flex items-center gap-4`}>
      <div className="p-3 bg-white rounded-full shadow-sm">
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <h4 className="text-2xl font-bold text-gray-800">{value}</h4>
        {desc && <p className="text-xs text-gray-400 mt-1">{desc}</p>}
      </div>
    </div>
  );
}