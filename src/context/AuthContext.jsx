import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Loader2 } from 'lucide-react';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- FIX UTAMA: fetchProfile SELALU matikan loading ---
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('Profil tidak ditemukan / error:', error.message);
        setUserProfile(null);
      } else {
        setUserProfile(data);
      }
    } catch (err) {
      console.error('Error fetch profile:', err);
      setUserProfile(null);
    } finally {
      setLoading(false); // <- TIDAK BOLEH DILEPAS
    }
  };

  useEffect(() => {
    let active = true;

    // 1. Ambil session awal
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;

      setSession(session);

      if (session?.user?.id) {
        fetchProfile(session.user.id);
      } else {
        // --- FIX: jika session null, jangan nunggu ---
        setLoading(false);
      }
    });

    // 2. Listener login/logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return;

        setSession(session);

        if (session?.user?.id) {
          fetchProfile(session.user.id);
        } else {
          setUserProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.replace('/login');
  };

  const value = {
    session,
    user: userProfile,
    isAdmin: userProfile?.role === 'hrd',
    isManager: ['manager', 'dfd'].includes(userProfile?.role),
    signOut,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading ? children : (
        <div className="h-screen w-full flex items-center justify-center bg-gray-50">
           <Loader2 className="animate-spin text-blue-600" size={40} />
        </div>
      )}
    </AuthContext.Provider>
  );
};
