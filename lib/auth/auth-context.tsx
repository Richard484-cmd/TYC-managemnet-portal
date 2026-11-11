'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/browser';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { RoleAssignment } from '@/lib/auth/constants';

interface AuthContextValue {
  user: User | null;
  roles: RoleAssignment[];
  loading: boolean;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  roles: [],
  loading: true,
  signOut: async () => {},
  refreshRoles: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<RoleAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      setSupabase(createClient());
    } catch (error) {
      console.error('Unable to initialize authentication:', error);
      setLoading(false);
    }
  }, []);

  const fetchRoles = useCallback(async (userId: string) => {
    if (!supabase) return;

    try {
      const { data } = await supabase
        .from('role_assignments')
        .select('id, user_id, role_key, scope_type, scope_id, granted_at, revoked_at')
        .eq('user_id', userId)
        .is('revoked_at', null);
      setRoles((data as RoleAssignment[]) ?? []);
    } catch (error) {
      console.error('Unable to load account roles:', error);
      setRoles([]);
    }
  }, [supabase]);

  useEffect(() => {
    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        window.setTimeout(() => {
          void fetchRoles(currentUser.id);
        }, 0);
      } else {
        setRoles([]);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchRoles]);

  const signOut = useCallback(async () => {
    if (!supabase) return;

    await supabase.auth.signOut();
    setUser(null);
    setRoles([]);
  }, [supabase]);

  const refreshRoles = useCallback(async () => {
    if (user && supabase) await fetchRoles(user.id);
  }, [user, supabase, fetchRoles]);

  return (
    <AuthContext.Provider value={{ user, roles, loading, signOut, refreshRoles }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
