import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Loader2 } from 'lucide-react';

// Imports Pages
import Login from './pages/Login';
import Layout from './components/Layout';
// HRD Pages
import Overview from './pages/Overview';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import Holidays from './pages/Holidays'; 
import LeaveCalendar from './pages/LeaveCalendar';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import ActivityLogs from './pages/ActivityLogs';
import UserDetail from './pages/UserDetail';
import MasterData from './pages/MasterData';
import LeaveEncashment from './pages/LeaveEncashment';
// Role Pages
import ApprovalDashboard from './pages/dashboards/ApprovalDashboard';
import EmployeeDashboard from './pages/dashboards/EmployeeDashboard';

// Komponen Pembungkus untuk Proteksi Halaman
const RoleRoute = ({ children, allowedRoles }) => {
  const { session, user, loading } = useAuth();
  
  if (loading) return <div className="h-screen flex justify-center items-center"><Loader2 className="animate-spin text-blue-600" size={40}/></div>;
  
  if (!session) return <Navigate to="/login" replace />;
  
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
     if (user?.role === 'employee') return <Navigate to="/employee/dashboard" replace />;
     if (user?.role === 'manager') return <Navigate to="/manager/dashboard" replace />;
     if (user?.role === 'dfd') return <Navigate to="/dfd/dashboard" replace />;
     return <Navigate to="/" replace />;
  }
  return children;
};

// KOMPONEN BARU: Pengarah Otomatis Halaman Utama
function DashboardRedirect() {
  const { user, loading } = useAuth();

  if (loading) return <div className="h-screen flex justify-center items-center"><Loader2 className="animate-spin text-blue-600" size={30}/></div>;
  
  if (!user) return <Navigate to="/login" replace />;

  // Arahkan user ke dashboard masing-masing sesuai role
  if (user.role === 'hrd') return <Navigate to="/hrd/dashboard" replace />;
  if (user.role === 'manager') return <Navigate to="/manager/dashboard" replace />;
  if (user.role === 'dfd') return <Navigate to="/dfd/dashboard" replace />;
  
  // Default (Employee)
  return <Navigate to="/employee/dashboard" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<LoginWrapper />} />
          
          <Route path="/" element={<Layout />}>
            {/* PERBAIKAN DISINI: Menambahkan Index Route */}
            {/* Jika buka localhost:5173, otomatis diarahkan component DashboardRedirect */}
            <Route index element={<DashboardRedirect />} />

            <Route path="hrd">
               <Route path="dashboard" element={<RoleRoute allowedRoles={['hrd']}><Overview /></RoleRoute>} />
               <Route path="approval" element={<RoleRoute allowedRoles={['hrd']}><Dashboard /></RoleRoute>} />
            </Route>

            <Route path="manager/dashboard" element={<RoleRoute allowedRoles={['manager']}><ApprovalDashboard /></RoleRoute>} />
            <Route path="dfd/dashboard" element={<RoleRoute allowedRoles={['dfd']}><ApprovalDashboard /></RoleRoute>} />
            <Route path="employee/dashboard" element={<RoleRoute allowedRoles={['employee', 'manager', 'dfd']}><EmployeeDashboard /></RoleRoute>} />

            <Route path="users" element={<RoleRoute allowedRoles={['hrd']}><UserManagement /></RoleRoute>} />
            <Route path="master-data" element={<RoleRoute allowedRoles={['hrd']}><MasterData /></RoleRoute>} />
            <Route path="users/:id" element={<RoleRoute allowedRoles={['hrd']}><UserDetail /></RoleRoute>} />
            <Route path="holidays" element={<RoleRoute allowedRoles={['hrd']}><Holidays /></RoleRoute>} />
            <Route path="leave-encashment" element={<RoleRoute allowedRoles={['hrd']}><LeaveEncashment /></RoleRoute>} />
            <Route path="calendar" element={<LeaveCalendar />} />
            <Route path="reports" element={<RoleRoute allowedRoles={['hrd']}><Reports /></RoleRoute>} />
            <Route path="settings" element={<RoleRoute allowedRoles={['hrd', 'manager', 'dfd', 'employee']}><Settings /></RoleRoute>} />
            <Route path="logs" element={<RoleRoute allowedRoles={['hrd']}><ActivityLogs /></RoleRoute>} />
          </Route>
          
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

function LoginWrapper() { 
  const { session, loading } = useAuth();
  
  if (loading) return <div className="h-screen flex justify-center items-center bg-slate-100"><Loader2 className="animate-spin text-blue-600"/></div>;
  
  if (session) return <Navigate to="/" replace />;
  
  return <Login />; 
}