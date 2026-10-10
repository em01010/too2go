import { useQuery } from '@tanstack/react-query';
import type { Merchant, Offer, Payout, Profile, Review } from '@too2go/shared';

import type { OrderSummary } from './queries';
import { supabase } from './supabase';

export const adminKeys = {
  merchants: ['admin', 'merchants'] as const,
  merchant: (id: string) => ['admin', 'merchants', id] as const,
  members: (id: string) => ['admin', 'members', id] as const,
  orders: ['admin', 'orders'] as const,
  offers: ['admin', 'offers'] as const,
  reviews: ['admin', 'reviews'] as const,
  payouts: ['admin', 'payouts'] as const,
  customers: ['admin', 'customers'] as const,
};

export function useAdminMerchants() {
  return useQuery({
    queryKey: adminKeys.merchants,
    queryFn: async (): Promise<Merchant[]> => {
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAdminMerchant(id: string | undefined) {
  return useQuery({
    queryKey: adminKeys.merchant(id ?? ''),
    enabled: !!id,
    queryFn: async (): Promise<Merchant | null> => {
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', id ?? '')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export interface MemberRow {
  user_id: string;
  role: 'owner' | 'staff';
  profiles: Pick<Profile, 'full_name' | 'phone'> | null;
}

export function useAdminMembers(merchantId: string | undefined) {
  return useQuery({
    queryKey: adminKeys.members(merchantId ?? ''),
    enabled: !!merchantId,
    queryFn: async (): Promise<MemberRow[]> => {
      const { data, error } = await supabase
        .from('merchant_members')
        .select('user_id, role, profiles(full_name, phone)')
        .eq('merchant_id', merchantId ?? '');
      if (error) throw error;
      return data;
    },
  });
}

/** Pedidos (admin ve todos) desde una fecha ISO. */
export function useAdminOrders(sinceIso?: string) {
  return useQuery({
    queryKey: [...adminKeys.orders, sinceIso ?? 'all'],
    queryFn: async (): Promise<OrderSummary[]> => {
      let q = supabase
        .from('order_summaries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (sinceIso) q = q.gte('created_at', sinceIso);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as OrderSummary[];
    },
  });
}

export function useAdminOffers(sinceIso: string) {
  return useQuery({
    queryKey: [...adminKeys.offers, sinceIso],
    queryFn: async (): Promise<Offer[]> => {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .gte('pickup_start', sinceIso)
        .order('pickup_start', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export interface ReviewRow extends Review {
  merchants: { name: string } | null;
  profiles: { full_name: string | null } | null;
}

export function useAdminReviews() {
  return useQuery({
    queryKey: adminKeys.reviews,
    queryFn: async (): Promise<ReviewRow[]> => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*, merchants(name), profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(300);
      if (error) throw error;
      return data;
    },
  });
}

export interface PayoutRow extends Payout {
  merchants: { name: string } | null;
}

export function useAdminPayouts() {
  return useQuery({
    queryKey: adminKeys.payouts,
    queryFn: async (): Promise<PayoutRow[]> => {
      const { data, error } = await supabase
        .from('payouts')
        .select('*, merchants(name)')
        .order('period_start', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAdminCustomerCount() {
  return useQuery({
    queryKey: adminKeys.customers,
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'customer');
      if (error) throw error;
      return count ?? 0;
    },
  });
}
