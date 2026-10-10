import type { Session } from '@supabase/supabase-js';
import type { Merchant, Profile } from '@too2go/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { supabase } from './supabase';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  /** Comercios de los que el usuario es miembro. */
  merchants: Merchant[];
  /** Comercio seleccionado en el panel (el primero por defecto). */
  merchant: Merchant | null;
  setMerchantId: (id: string) => void;
  isAdmin: boolean;
  /** true mientras se restaura la sesión o se carga el perfil (rol, comercios). */
  loading: boolean;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
  reload: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const load = useCallback(async (userId: string) => {
    setProfileLoading(true);
    const [{ data: p }, { data: m }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('merchant_members').select('merchants(*)').eq('user_id', userId),
    ]);
    setProfile(p ?? null);
    const list = (m ?? [])
      .map((row) => row.merchants as unknown as Merchant | null)
      .filter((x): x is Merchant => x !== null);
    setMerchants(list);
    setMerchantId((cur) => cur ?? list[0]?.id ?? null);
    setProfileLoading(false);
  }, []);

  useEffect(() => {
    void supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) await load(data.session.user.id);
      setSessionLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, next) => {
      setSession(next);
      if (next) void load(next.user.id);
      else {
        setProfile(null);
        setMerchants([]);
        setMerchantId(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const value = useMemo<AuthState>(
    () => ({
      session,
      profile,
      merchants,
      merchant: merchants.find((m) => m.id === merchantId) ?? merchants[0] ?? null,
      setMerchantId,
      isAdmin: profile?.role === 'admin',
      loading: sessionLoading || profileLoading,
      async sendOtp(phone) {
        const { error } = await supabase.auth.signInWithOtp({ phone });
        if (error) throw error;
      },
      async verifyOtp(phone, token) {
        const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
        if (error) throw error;
      },
      async signOut() {
        await supabase.auth.signOut();
        // Volver al inicio para que la próxima persona no herede la URL de la sesión anterior.
        window.history.replaceState(null, '', '/');
      },
      async reload() {
        if (session) await load(session.user.id);
      },
    }),
    [session, profile, merchants, merchantId, sessionLoading, profileLoading, load],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
