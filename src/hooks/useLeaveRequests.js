import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

export function useLeaveRequests(filter) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    setLoading(true);
    let query = supabase
      .from('leave_requests')
      .select('*, profiles:user_id(full_name, department, role, leave_balance)')
      .order('created_at', { ascending: false });

    if (filter === 'pending_hrd') {
      query = query.eq('current_stage', 'hrd').eq('status', 'pending');
    } else if (filter === 'history') {
      query = query.neq('status', 'pending');
    }
    // ... logic filter lain ...

    const { data, error } = await query;
    if (error) {
        toast.error("Gagal memuat data");
        console.error(error);
    } else {
        setRequests(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  return { requests, loading, refetch: fetchRequests };
}