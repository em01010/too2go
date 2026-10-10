import type { Session } from '@supabase/supabase-js';
import type { Profile } from '@too2go/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { supabase } from './supabase';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  /** true mientras se restaura la sesión guardada. */
  loading: boolean;
  sendOtp: (phoneE164: string) => Promise<void>;
  verifyOtp: (phoneE164: string, token: string) => Promise<void>;
  updateName: (fullName: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    setProfile(data ?? null);
  }, []);

  useEffect(() => {
    void supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) await loadProfile(data.session.user.id);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next) void loadProfile(next.user.id);
      else setProfile(null);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const value = useMemo<AuthState>(
    () => ({
      session,
      profile,
      loading,
      async sendOtp(phone) {
        const { error } = await supabase.auth.signInWithOtp({ phone });
        if (error) throw error;
      },
      async verifyOtp(phone, token) {
        const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
        if (error) throw error;
      },
      async updateName(fullName) {
        if (!session) return;
        const { error } = await supabase
          .from('profiles')
          .update({ full_name: fullName })
          .eq('id', session.user.id);
        if (error) throw error;
        await loadProfile(session.user.id);
      },
      async refreshProfile() {
        if (session) await loadProfile(session.user.id);
      },
      async signOut() {
        await supabase.auth.signOut();
      },
    }),
    [session, profile, loading, loadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
