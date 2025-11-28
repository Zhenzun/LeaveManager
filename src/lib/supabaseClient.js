import { createClient } from '@supabase/supabase-js'

// Pastikan variabel env sudah diset di .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// --- FUNGSI PENCATAT AKTIVITAS (AUDIT LOG) ---
export const logActivity = async (actionType, description) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userEmail = session?.user?.email || 'System';

    await supabase.from('activity_logs').insert({
      user_email: userEmail,
      action_type: actionType,
      description: description
    });
  } catch (error) {
    console.error("Gagal mencatat log:", error);
  }
};