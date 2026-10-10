import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreatePaymentRequest,
  CreatePaymentResponse,
  OfferFeedItem,
  Merchant,
  Order,
} from '@too2go/shared';

import { useAuth } from './auth';
import { invokeFunction, supabase } from './supabase';

/** Fila de la vista order_summaries con los campos que la app necesita no nulos. */
export interface OrderSummary {
  id: string;
  offer_id: string;
  merchant_id: string;
  customer_id: string;
  quantity: number;
  total_hnl: number;
  status: Order['status'];
  pickup_code: string;
  reservation_expires_at: string | null;
  paid_at: string | null;
  picked_up_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  offer_title: string;
  category: string;
  original_value_hnl: number;
  pickup_start: string;
  pickup_end: string;
  merchant_name: string;
  merchant_address: string;
  merchant_zone: string | null;
  merchant_lat: number;
  merchant_lng: number;
  merchant_whatsapp: string | null;
  saved_hnl: number;
  has_review: boolean;
}

export const keys = {
  feed: ['offer_feed'] as const,
  offer: (id: string) => ['offer_feed', id] as const,
  orders: ['order_summaries'] as const,
  order: (id: string) => ['order_summaries', id] as const,
  favorites: ['favorites'] as const,
  merchant: (id: string) => ['merchant', id] as const,
  merchantReviews: (id: string) => ['merchant_reviews', id] as const,
  impact: ['community_impact'] as const,
};

export interface MerchantReview {
  id: string;
  merchant_id: string;
  rating: number;
  comment: string | null;
  tags: string[];
  created_at: string;
  customer_first_name: string;
}

export interface CommunityImpact {
  bags_rescued: number;
  saved_hnl: number;
  co2e_kg: number;
  merchants_active: number;
  customers: number;
}

/** Ids de comercios favoritos del usuario. */
export function useFavorites() {
  const { session } = useAuth();
  return useQuery({
    queryKey: keys.favorites,
    enabled: !!session,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase.from('favorites').select('merchant_id');
      if (error) throw error;
      return new Set(data.map((f) => f.merchant_id));
    },
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: async (vars: { merchantId: string; isFavorite: boolean }) => {
      if (vars.isFavorite) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('merchant_id', vars.merchantId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({ customer_id: session?.user.id ?? '', merchant_id: vars.merchantId });
        if (error) throw error;
      }
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.favorites }),
  });
}

export function useMerchant(id: string | undefined) {
  return useQuery({
    queryKey: keys.merchant(id ?? ''),
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

export function useMerchantReviews(id: string | undefined) {
  return useQuery({
    queryKey: keys.merchantReviews(id ?? ''),
    enabled: !!id,
    queryFn: async (): Promise<MerchantReview[]> => {
      const { data, error } = await supabase
        .from('merchant_reviews')
        .select('*')
        .eq('merchant_id', id ?? '')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as unknown as MerchantReview[];
    },
  });
}

export function useCommunityImpact() {
  return useQuery({
    queryKey: keys.impact,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<CommunityImpact | null> => {
      const { data, error } = await supabase.rpc('community_impact');
      if (error) throw error;
      const row = (data as unknown as CommunityImpact[])[0];
      return row ?? null;
    },
  });
}

export function useOfferFeed() {
  return useQuery({
    queryKey: keys.feed,
    queryFn: async (): Promise<OfferFeedItem[]> => {
      const { data, error } = await supabase
        .from('offer_feed')
        .select('*')
        .order('pickup_start', { ascending: true });
      if (error) throw error;
      return data;
    },
    refetchInterval: 30_000,
  });
}

export function useOffer(id: string | undefined) {
  return useQuery({
    queryKey: keys.offer(id ?? ''),
    enabled: !!id,
    queryFn: async (): Promise<OfferFeedItem | null> => {
      const { data, error } = await supabase
        .from('offer_feed')
        .select('*')
        .eq('id', id ?? '')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useMyOrders() {
  const { session } = useAuth();
  return useQuery({
    queryKey: keys.orders,
    enabled: !!session,
    queryFn: async (): Promise<OrderSummary[]> => {
      const { data, error } = await supabase
        .from('order_summaries')
        .select('*')
        .eq('customer_id', session?.user.id ?? '')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as OrderSummary[];
    },
  });
}

export function useOrder(id: string | undefined, opts: { poll?: boolean } = {}) {
  return useQuery({
    queryKey: keys.order(id ?? ''),
    enabled: !!id,
    queryFn: async (): Promise<OrderSummary | null> => {
      const { data, error } = await supabase
        .from('order_summaries')
        .select('*')
        .eq('id', id ?? '')
        .maybeSingle();
      if (error) throw error;
      return data as unknown as OrderSummary | null;
    },
    ...(opts.poll ? { refetchInterval: 3_000 } : {}),
  });
}

export function useReserveOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { offerId: string; quantity: number }): Promise<Order> => {
      const { data, error } = await supabase.rpc('reserve_order', {
        p_offer: vars.offerId,
        p_quantity: vars.quantity,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.feed });
      void qc.invalidateQueries({ queryKey: keys.orders });
    },
  });
}

export function useCreatePayment() {
  return useMutation({
    mutationFn: (body: CreatePaymentRequest) =>
      invokeFunction<CreatePaymentResponse>('create-payment', body),
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string): Promise<Order> => {
      const { data, error } = await supabase.rpc('cancel_order_by_customer', { p_order: orderId });
      if (error) throw error;
      return data;
    },
    onSuccess: (order) => {
      void qc.invalidateQueries({ queryKey: keys.order(order.id) });
      void qc.invalidateQueries({ queryKey: keys.orders });
      void qc.invalidateQueries({ queryKey: keys.feed });
    },
  });
}

export function useSubmitReview() {
  const qc = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: async (vars: {
      orderId: string;
      merchantId: string;
      rating: number;
      comment: string;
      tags: string[];
    }) => {
      const { error } = await supabase.from('reviews').insert({
        order_id: vars.orderId,
        merchant_id: vars.merchantId,
        customer_id: session?.user.id ?? '',
        rating: vars.rating,
        comment: vars.comment.trim() || null,
        tags: vars.tags,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: keys.order(vars.orderId) });
      void qc.invalidateQueries({ queryKey: keys.orders });
      void qc.invalidateQueries({ queryKey: keys.merchantReviews(vars.merchantId) });
      void qc.invalidateQueries({ queryKey: keys.feed });
    },
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: async () => {
      await invokeFunction<{ ok: boolean }>('delete-account', {});
    },
  });
}
