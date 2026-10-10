export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      favorites: {
        Row: {
          created_at: string;
          customer_id: string;
          merchant_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          customer_id: string;
          merchant_id: string;
        };
        Update: {
          created_at?: string;
          customer_id?: string;
          merchant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'favorites_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'favorites_merchant_id_fkey';
            columns: ['merchant_id'];
            isOneToOne: false;
            referencedRelation: 'merchants';
            referencedColumns: ['id'];
          },
        ];
      };
      merchant_members: {
        Row: {
          created_at: string;
          merchant_id: string;
          role: Database['public']['Enums']['merchant_member_role'];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          merchant_id: string;
          role?: Database['public']['Enums']['merchant_member_role'];
          user_id: string;
        };
        Update: {
          created_at?: string;
          merchant_id?: string;
          role?: Database['public']['Enums']['merchant_member_role'];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'merchant_members_merchant_id_fkey';
            columns: ['merchant_id'];
            isOneToOne: false;
            referencedRelation: 'merchants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'merchant_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      merchants: {
        Row: {
          address: string;
          category: Database['public']['Enums']['food_category'];
          city: string;
          commission_rate: number;
          cover_url: string | null;
          created_at: string;
          description: string | null;
          donation_opt_in: boolean;
          has_parking: boolean;
          id: string;
          lat: number;
          legal_name: string | null;
          lng: number;
          logo_url: string | null;
          name: string;
          rtn: string | null;
          status: Database['public']['Enums']['merchant_status'];
          updated_at: string;
          whatsapp: string | null;
          zone: string | null;
        };
        ComputedFields: never;
        Insert: {
          address: string;
          category?: Database['public']['Enums']['food_category'];
          city?: string;
          commission_rate?: number;
          cover_url?: string | null;
          created_at?: string;
          description?: string | null;
          donation_opt_in?: boolean;
          has_parking?: boolean;
          id?: string;
          lat: number;
          legal_name?: string | null;
          lng: number;
          logo_url?: string | null;
          name: string;
          rtn?: string | null;
          status?: Database['public']['Enums']['merchant_status'];
          updated_at?: string;
          whatsapp?: string | null;
          zone?: string | null;
        };
        Update: {
          address?: string;
          category?: Database['public']['Enums']['food_category'];
          city?: string;
          commission_rate?: number;
          cover_url?: string | null;
          created_at?: string;
          description?: string | null;
          donation_opt_in?: boolean;
          has_parking?: boolean;
          id?: string;
          lat?: number;
          legal_name?: string | null;
          lng?: number;
          logo_url?: string | null;
          name?: string;
          rtn?: string | null;
          status?: Database['public']['Enums']['merchant_status'];
          updated_at?: string;
          whatsapp?: string | null;
          zone?: string | null;
        };
        Relationships: [];
      };
      offer_templates: {
        Row: {
          active: boolean;
          category: Database['public']['Enums']['food_category'];
          created_at: string;
          description: string | null;
          id: string;
          merchant_id: string;
          original_value_hnl: number;
          pickup_end_local: string;
          pickup_start_local: string;
          price_hnl: number;
          quantity: number;
          title: string;
          weekdays: number[];
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          category: Database['public']['Enums']['food_category'];
          created_at?: string;
          description?: string | null;
          id?: string;
          merchant_id: string;
          original_value_hnl: number;
          pickup_end_local: string;
          pickup_start_local: string;
          price_hnl: number;
          quantity: number;
          title?: string;
          weekdays: number[];
        };
        Update: {
          active?: boolean;
          category?: Database['public']['Enums']['food_category'];
          created_at?: string;
          description?: string | null;
          id?: string;
          merchant_id?: string;
          original_value_hnl?: number;
          pickup_end_local?: string;
          pickup_start_local?: string;
          price_hnl?: number;
          quantity?: number;
          title?: string;
          weekdays?: number[];
        };
        Relationships: [
          {
            foreignKeyName: 'offer_templates_merchant_id_fkey';
            columns: ['merchant_id'];
            isOneToOne: false;
            referencedRelation: 'merchants';
            referencedColumns: ['id'];
          },
        ];
      };
      offers: {
        Row: {
          allergens_note: string | null;
          category: Database['public']['Enums']['food_category'];
          closed_at: string | null;
          created_at: string;
          description: string | null;
          id: string;
          leftover_disposition: Database['public']['Enums']['leftover_disposition'];
          merchant_id: string;
          original_value_hnl: number;
          pickup_end: string;
          pickup_start: string;
          price_hnl: number;
          quantity_reserved: number;
          quantity_total: number;
          quantity_unsold: number | null;
          status: Database['public']['Enums']['offer_status'];
          template_id: string | null;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          allergens_note?: string | null;
          category: Database['public']['Enums']['food_category'];
          closed_at?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          leftover_disposition?: Database['public']['Enums']['leftover_disposition'];
          merchant_id: string;
          original_value_hnl: number;
          pickup_end: string;
          pickup_start: string;
          price_hnl: number;
          quantity_reserved?: number;
          quantity_total: number;
          quantity_unsold?: number | null;
          status?: Database['public']['Enums']['offer_status'];
          template_id?: string | null;
          title?: string;
          updated_at?: string;
        };
        Update: {
          allergens_note?: string | null;
          category?: Database['public']['Enums']['food_category'];
          closed_at?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          leftover_disposition?: Database['public']['Enums']['leftover_disposition'];
          merchant_id?: string;
          original_value_hnl?: number;
          pickup_end?: string;
          pickup_start?: string;
          price_hnl?: number;
          quantity_reserved?: number;
          quantity_total?: number;
          quantity_unsold?: number | null;
          status?: Database['public']['Enums']['offer_status'];
          template_id?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'offers_merchant_id_fkey';
            columns: ['merchant_id'];
            isOneToOne: false;
            referencedRelation: 'merchants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'offers_template_id_fkey';
            columns: ['template_id'];
            isOneToOne: false;
            referencedRelation: 'offer_templates';
            referencedColumns: ['id'];
          },
        ];
      };
      order_events: {
        Row: {
          actor_id: string | null;
          created_at: string;
          from_status: Database['public']['Enums']['order_status'] | null;
          id: number;
          note: string | null;
          order_id: string;
          to_status: Database['public']['Enums']['order_status'];
        };
        ComputedFields: never;
        Insert: {
          actor_id?: string | null;
          created_at?: string;
          from_status?: Database['public']['Enums']['order_status'] | null;
          id?: never;
          note?: string | null;
          order_id: string;
          to_status: Database['public']['Enums']['order_status'];
        };
        Update: {
          actor_id?: string | null;
          created_at?: string;
          from_status?: Database['public']['Enums']['order_status'] | null;
          id?: never;
          note?: string | null;
          order_id?: string;
          to_status?: Database['public']['Enums']['order_status'];
        };
        Relationships: [
          {
            foreignKeyName: 'order_events_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'order_summaries';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'order_events_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
        ];
      };
      orders: {
        Row: {
          cancel_reason: string | null;
          cancelled_at: string | null;
          commission_hnl: number;
          commission_rate: number;
          created_at: string;
          customer_id: string;
          id: string;
          merchant_id: string;
          merchant_net_hnl: number;
          offer_id: string;
          paid_at: string | null;
          payment_provider: string | null;
          payment_ref: string | null;
          payout_id: string | null;
          picked_up_at: string | null;
          pickup_code: string;
          quantity: number;
          reservation_expires_at: string | null;
          status: Database['public']['Enums']['order_status'];
          total_hnl: number;
          unit_price_hnl: number;
          updated_at: string;
          _release_inventory: undefined | null;
        };
        ComputedFields: '_release_inventory';
        Insert: {
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          commission_hnl: number;
          commission_rate: number;
          created_at?: string;
          customer_id: string;
          id?: string;
          merchant_id: string;
          merchant_net_hnl: number;
          offer_id: string;
          paid_at?: string | null;
          payment_provider?: string | null;
          payment_ref?: string | null;
          payout_id?: string | null;
          picked_up_at?: string | null;
          pickup_code: string;
          quantity: number;
          reservation_expires_at?: string | null;
          status?: Database['public']['Enums']['order_status'];
          total_hnl: number;
          unit_price_hnl: number;
          updated_at?: string;
        };
        Update: {
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          commission_hnl?: number;
          commission_rate?: number;
          created_at?: string;
          customer_id?: string;
          id?: string;
          merchant_id?: string;
          merchant_net_hnl?: number;
          offer_id?: string;
          paid_at?: string | null;
          payment_provider?: string | null;
          payment_ref?: string | null;
          payout_id?: string | null;
          picked_up_at?: string | null;
          pickup_code?: string;
          quantity?: number;
          reservation_expires_at?: string | null;
          status?: Database['public']['Enums']['order_status'];
          total_hnl?: number;
          unit_price_hnl?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'orders_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_merchant_id_fkey';
            columns: ['merchant_id'];
            isOneToOne: false;
            referencedRelation: 'merchants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_offer_id_fkey';
            columns: ['offer_id'];
            isOneToOne: false;
            referencedRelation: 'offer_feed';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_offer_id_fkey';
            columns: ['offer_id'];
            isOneToOne: false;
            referencedRelation: 'offers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_payout_fk';
            columns: ['payout_id'];
            isOneToOne: false;
            referencedRelation: 'payouts';
            referencedColumns: ['id'];
          },
        ];
      };
      payouts: {
        Row: {
          commission_hnl: number;
          created_at: string;
          gross_hnl: number;
          id: string;
          merchant_id: string;
          net_hnl: number;
          paid_at: string | null;
          period_end: string;
          period_start: string;
          reference: string | null;
          status: Database['public']['Enums']['payout_status'];
        };
        ComputedFields: never;
        Insert: {
          commission_hnl?: number;
          created_at?: string;
          gross_hnl?: number;
          id?: string;
          merchant_id: string;
          net_hnl?: number;
          paid_at?: string | null;
          period_end: string;
          period_start: string;
          reference?: string | null;
          status?: Database['public']['Enums']['payout_status'];
        };
        Update: {
          commission_hnl?: number;
          created_at?: string;
          gross_hnl?: number;
          id?: string;
          merchant_id?: string;
          net_hnl?: number;
          paid_at?: string | null;
          period_end?: string;
          period_start?: string;
          reference?: string | null;
          status?: Database['public']['Enums']['payout_status'];
        };
        Relationships: [
          {
            foreignKeyName: 'payouts_merchant_id_fkey';
            columns: ['merchant_id'];
            isOneToOne: false;
            referencedRelation: 'merchants';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string | null;
          id: string;
          phone: string | null;
          role: Database['public']['Enums']['user_role'];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          full_name?: string | null;
          id: string;
          phone?: string | null;
          role?: Database['public']['Enums']['user_role'];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          full_name?: string | null;
          id?: string;
          phone?: string | null;
          role?: Database['public']['Enums']['user_role'];
          updated_at?: string;
        };
        Relationships: [];
      };
      push_tokens: {
        Row: {
          created_at: string;
          id: string;
          platform: string | null;
          token: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          platform?: string | null;
          token: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          platform?: string | null;
          token?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'push_tokens_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      reviews: {
        Row: {
          comment: string | null;
          created_at: string;
          customer_id: string;
          hidden: boolean;
          id: string;
          merchant_id: string;
          order_id: string;
          rating: number;
        };
        ComputedFields: never;
        Insert: {
          comment?: string | null;
          created_at?: string;
          customer_id: string;
          hidden?: boolean;
          id?: string;
          merchant_id: string;
          order_id: string;
          rating: number;
        };
        Update: {
          comment?: string | null;
          created_at?: string;
          customer_id?: string;
          hidden?: boolean;
          id?: string;
          merchant_id?: string;
          order_id?: string;
          rating?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'reviews_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_merchant_id_fkey';
            columns: ['merchant_id'];
            isOneToOne: false;
            referencedRelation: 'merchants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: true;
            referencedRelation: 'order_summaries';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: true;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      offer_feed: {
        Row: {
          address: string | null;
          allergens_note: string | null;
          category: Database['public']['Enums']['food_category'] | null;
          cover_url: string | null;
          description: string | null;
          has_parking: boolean | null;
          id: string | null;
          lat: number | null;
          lng: number | null;
          logo_url: string | null;
          merchant_id: string | null;
          merchant_name: string | null;
          original_value_hnl: number | null;
          pickup_end: string | null;
          pickup_start: string | null;
          price_hnl: number | null;
          quantity_available: number | null;
          rating_avg: number | null;
          rating_count: number | null;
          title: string | null;
          zone: string | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: 'offers_merchant_id_fkey';
            columns: ['merchant_id'];
            isOneToOne: false;
            referencedRelation: 'merchants';
            referencedColumns: ['id'];
          },
        ];
      };
      order_summaries: {
        Row: {
          cancel_reason: string | null;
          cancelled_at: string | null;
          category: Database['public']['Enums']['food_category'] | null;
          commission_hnl: number | null;
          created_at: string | null;
          customer_id: string | null;
          customer_name: string | null;
          customer_phone: string | null;
          has_review: boolean | null;
          id: string | null;
          merchant_address: string | null;
          merchant_cover_url: string | null;
          merchant_id: string | null;
          merchant_lat: number | null;
          merchant_lng: number | null;
          merchant_logo_url: string | null;
          merchant_name: string | null;
          merchant_net_hnl: number | null;
          merchant_whatsapp: string | null;
          merchant_zone: string | null;
          offer_id: string | null;
          offer_status: Database['public']['Enums']['offer_status'] | null;
          offer_title: string | null;
          original_value_hnl: number | null;
          paid_at: string | null;
          payment_provider: string | null;
          payment_ref: string | null;
          payout_id: string | null;
          picked_up_at: string | null;
          pickup_code: string | null;
          pickup_end: string | null;
          pickup_start: string | null;
          quantity: number | null;
          reservation_expires_at: string | null;
          saved_hnl: number | null;
          status: Database['public']['Enums']['order_status'] | null;
          total_hnl: number | null;
          unit_price_hnl: number | null;
          updated_at: string | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: 'orders_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_merchant_id_fkey';
            columns: ['merchant_id'];
            isOneToOne: false;
            referencedRelation: 'merchants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_offer_id_fkey';
            columns: ['offer_id'];
            isOneToOne: false;
            referencedRelation: 'offer_feed';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_offer_id_fkey';
            columns: ['offer_id'];
            isOneToOne: false;
            referencedRelation: 'offers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_payout_fk';
            columns: ['payout_id'];
            isOneToOne: false;
            referencedRelation: 'payouts';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Functions: {
      _release_inventory: {
        Args: {
          p_order: Omit<
            Database['public']['Tables']['orders']['Row'],
            Database['public']['Tables']['orders']['ComputedFields']
          >;
        };
        Returns: undefined;
      };
      admin_generate_offers_from_templates: { Args: { p_date?: string }; Returns: number };
      admin_generate_payouts: { Args: { p_end: string; p_start: string }; Returns: number };
      cancel_offer_by_merchant: { Args: { p_offer: string; p_reason: string }; Returns: number };
      cancel_order_by_customer: {
        Args: { p_order: string };
        Returns: {
          cancel_reason: string | null;
          cancelled_at: string | null;
          commission_hnl: number;
          commission_rate: number;
          created_at: string;
          customer_id: string;
          id: string;
          merchant_id: string;
          merchant_net_hnl: number;
          offer_id: string;
          paid_at: string | null;
          payment_provider: string | null;
          payment_ref: string | null;
          payout_id: string | null;
          picked_up_at: string | null;
          pickup_code: string;
          quantity: number;
          reservation_expires_at: string | null;
          status: Database['public']['Enums']['order_status'];
          total_hnl: number;
          unit_price_hnl: number;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'orders';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      close_expired_offers: { Args: Record<PropertyKey, never>; Returns: number };
      confirm_payment: {
        Args: { p_order: string; p_provider: string; p_ref: string };
        Returns: {
          cancel_reason: string | null;
          cancelled_at: string | null;
          commission_hnl: number;
          commission_rate: number;
          created_at: string;
          customer_id: string;
          id: string;
          merchant_id: string;
          merchant_net_hnl: number;
          offer_id: string;
          paid_at: string | null;
          payment_provider: string | null;
          payment_ref: string | null;
          payout_id: string | null;
          picked_up_at: string | null;
          pickup_code: string;
          quantity: number;
          reservation_expires_at: string | null;
          status: Database['public']['Enums']['order_status'];
          total_hnl: number;
          unit_price_hnl: number;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'orders';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      expire_pending_orders: { Args: Record<PropertyKey, never>; Returns: number };
      generate_offers_from_templates: { Args: { p_date?: string }; Returns: number };
      generate_payouts: { Args: { p_end: string; p_start: string }; Returns: number };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_merchant_member: { Args: { p_merchant: string }; Returns: boolean };
      redeem_pickup_code: {
        Args: { p_code: string; p_offer: string };
        Returns: {
          cancel_reason: string | null;
          cancelled_at: string | null;
          commission_hnl: number;
          commission_rate: number;
          created_at: string;
          customer_id: string;
          id: string;
          merchant_id: string;
          merchant_net_hnl: number;
          offer_id: string;
          paid_at: string | null;
          payment_provider: string | null;
          payment_ref: string | null;
          payout_id: string | null;
          picked_up_at: string | null;
          pickup_code: string;
          quantity: number;
          reservation_expires_at: string | null;
          status: Database['public']['Enums']['order_status'];
          total_hnl: number;
          unit_price_hnl: number;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'orders';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      reserve_order: {
        Args: { p_offer: string; p_quantity?: number };
        Returns: {
          cancel_reason: string | null;
          cancelled_at: string | null;
          commission_hnl: number;
          commission_rate: number;
          created_at: string;
          customer_id: string;
          id: string;
          merchant_id: string;
          merchant_net_hnl: number;
          offer_id: string;
          paid_at: string | null;
          payment_provider: string | null;
          payment_ref: string | null;
          payout_id: string | null;
          picked_up_at: string | null;
          pickup_code: string;
          quantity: number;
          reservation_expires_at: string | null;
          status: Database['public']['Enums']['order_status'];
          total_hnl: number;
          unit_price_hnl: number;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'orders';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      set_leftover_disposition: {
        Args: {
          p_disposition: Database['public']['Enums']['leftover_disposition'];
          p_offer: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      food_category:
        | 'panaderia'
        | 'reposteria'
        | 'comida_rapida'
        | 'restaurante'
        | 'cafeteria'
        | 'supermercado'
        | 'frutas_verduras'
        | 'hotel_bufe'
        | 'conveniencia'
        | 'otro';
      leftover_disposition: 'unknown' | 'kept_by_merchant' | 'discarded' | 'donated';
      merchant_member_role: 'owner' | 'staff';
      merchant_status: 'pending' | 'active' | 'suspended';
      offer_status: 'draft' | 'published' | 'closed' | 'cancelled';
      order_status:
        | 'pending_payment'
        | 'paid'
        | 'picked_up'
        | 'no_show'
        | 'cancelled_by_customer'
        | 'cancelled_by_merchant'
        | 'expired'
        | 'refunded';
      payout_status: 'pending' | 'paid' | 'failed';
      user_role: 'customer' | 'merchant' | 'admin';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      food_category: [
        'panaderia',
        'reposteria',
        'comida_rapida',
        'restaurante',
        'cafeteria',
        'supermercado',
        'frutas_verduras',
        'hotel_bufe',
        'conveniencia',
        'otro',
      ],
      leftover_disposition: ['unknown', 'kept_by_merchant', 'discarded', 'donated'],
      merchant_member_role: ['owner', 'staff'],
      merchant_status: ['pending', 'active', 'suspended'],
      offer_status: ['draft', 'published', 'closed', 'cancelled'],
      order_status: [
        'pending_payment',
        'paid',
        'picked_up',
        'no_show',
        'cancelled_by_customer',
        'cancelled_by_merchant',
        'expired',
        'refunded',
      ],
      payout_status: ['pending', 'paid', 'failed'],
      user_role: ['customer', 'merchant', 'admin'],
    },
  },
} as const;
