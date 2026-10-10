import { useQuery } from '@tanstack/react-query';
import type { Offer, OfferTemplate, OrderStatus, Payout } from '@too2go/shared';

import { supabase } from './supabase';

/** Fila de order_summaries tal como la usan los paneles. */
export interface OrderSummary {
  id: string;
  offer_id: string;
  merchant_id: string;
  customer_id: string;
  quantity: number;
  unit_price_hnl: number;
  total_hnl: number;
  commission_hnl: number;
  merchant_net_hnl: number;
  status: OrderStatus;
  pickup_code: string;
  paid_at: string | null;
  picked_up_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  payout_id: string | null;
  created_at: string;
  offer_title: string;
  category: string;
  original_value_hnl: number;
  pickup_start: string;
  pickup_end: string;
  offer_status: Offer['status'];
  merchant_name: string;
  merchant_zone: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  saved_hnl: number;
  has_review: boolean;
}

export const keys = {
  offers: (merchantId: string) => ['offers', merchantId] as const,
  orders: (merchantId: string) => ['orders', merchantId] as const,
  templates: (merchantId: string) => ['templates', merchantId] as const,
  payouts: (merchantId: string) => ['payouts', merchantId] as const,
};

/** Ofertas del comercio desde una fecha (ISO) hacia adelante, más recientes primero. */
export function useMerchantOffers(merchantId: string | undefined, sinceIso: string) {
  return useQuery({
    queryKey: [...keys.offers(merchantId ?? ''), sinceIso],
    enabled: !!merchantId,
    queryFn: async (): Promise<Offer[]> => {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('merchant_id', merchantId ?? '')
        .gte('pickup_start', sinceIso)
        .order('pickup_start', { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchInterval: 15_000,
  });
}

export function useMerchantOrders(merchantId: string | undefined, sinceIso?: string) {
  return useQuery({
    queryKey: [...keys.orders(merchantId ?? ''), sinceIso ?? 'all'],
    enabled: !!merchantId,
    queryFn: async (): Promise<OrderSummary[]> => {
      let q = supabase
        .from('order_summaries')
        .select('*')
        .eq('merchant_id', merchantId ?? '')
        .order('created_at', { ascending: false });
      if (sinceIso) q = q.gte('pickup_start', sinceIso);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as OrderSummary[];
    },
    refetchInterval: 15_000,
  });
}

export function useTemplates(merchantId: string | undefined) {
  return useQuery({
    queryKey: keys.templates(merchantId ?? ''),
    enabled: !!merchantId,
    queryFn: async (): Promise<OfferTemplate[]> => {
      const { data, error } = await supabase
        .from('offer_templates')
        .select('*')
        .eq('merchant_id', merchantId ?? '')
        .order('created_at');
      if (error) throw error;
      return data;
    },
  });
}

export function usePayouts(merchantId: string | undefined) {
  return useQuery({
    queryKey: keys.payouts(merchantId ?? ''),
    enabled: !!merchantId,
    queryFn: async (): Promise<Payout[]> => {
      const { data, error } = await supabase
        .from('payouts')
        .select('*')
        .eq('merchant_id', merchantId ?? '')
        .order('period_start', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
