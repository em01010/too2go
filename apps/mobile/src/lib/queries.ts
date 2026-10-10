import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreatePaymentRequest,
  CreatePaymentResponse,
  OfferFeedItem,
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
};

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
    }) => {
      const { error } = await supabase.from('reviews').insert({
        order_id: vars.orderId,
        merchant_id: vars.merchantId,
        customer_id: session?.user.id ?? '',
        rating: vars.rating,
        comment: vars.comment.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: keys.order(vars.orderId) });
      void qc.invalidateQueries({ queryKey: keys.orders });
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
