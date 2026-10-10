import type { Database } from './database';

export type { Database, Json } from './database';
export * from './payments';

type PublicSchema = Database['public'];

/** Fila de una tabla o vista pública, ej. `Tables<'offers'>`. */
export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row'];
export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update'];
export type Views<T extends keyof PublicSchema['Views']> = PublicSchema['Views'][T]['Row'];
export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T];
export type Functions<T extends keyof PublicSchema['Functions']> = PublicSchema['Functions'][T];

// Alias de uso frecuente
export type Profile = Tables<'profiles'>;
export type Merchant = Tables<'merchants'>;
export type MerchantMember = Tables<'merchant_members'>;
export type Offer = Tables<'offers'>;
export type OfferTemplate = Tables<'offer_templates'>;
// PostgREST expone `_release_inventory(orders)` como "columna calculada"; no es parte de la fila real.
export type Order = Omit<Tables<'orders'>, '_release_inventory'>;
export type OrderEvent = Tables<'order_events'>;
export type Review = Tables<'reviews'>;
export type Payout = Tables<'payouts'>;
export type OfferFeedItem = Views<'offer_feed'>;

export type UserRole = Enums<'user_role'>;
export type MerchantStatus = Enums<'merchant_status'>;
export type FoodCategory = Enums<'food_category'>;
export type OfferStatus = Enums<'offer_status'>;
export type OrderStatus = Enums<'order_status'>;
export type LeftoverDisposition = Enums<'leftover_disposition'>;
export type PayoutStatus = Enums<'payout_status'>;
