// Exact Supabase Database Row Types generated from live PostgREST schema introspection

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      ws_chatbot_channels: {
        Row: {
          id: string;
          organization_id: string;
          provider: string | null;
          bot_enabled: boolean | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          provider?: string | null;
          bot_enabled?: boolean | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          provider?: string | null;
          bot_enabled?: boolean | null;
          created_at?: string;
          updated_at?: string | null;
        };
      };
      ws_chatbot_customers: {
        Row: {
          id: string;
          organization_id: string;
          notes: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          notes?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          notes?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string | null;
        };
      };
      ws_chatbot_conversations: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string | null;
          channel_id: string | null;
          mode: 'bot' | 'human' | string;
          status: 'open' | 'closed' | 'waiting_handoff' | string;
          state: string | null;
          language: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id?: string | null;
          channel_id?: string | null;
          mode?: string;
          status?: string;
          state?: string | null;
          language?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          customer_id?: string | null;
          channel_id?: string | null;
          mode?: string;
          status?: string;
          state?: string | null;
          language?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
      };
      ws_chatbot_messages: {
        Row: {
          id: string;
          organization_id: string;
          conversation_id: string;
          sender_type: 'customer' | 'bot' | 'human' | string;
          message_type: 'text' | 'image' | 'video' | 'audio' | 'document' | string;
          media_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          conversation_id: string;
          sender_type: string;
          message_type: string;
          media_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          conversation_id?: string;
          sender_type?: string;
          message_type?: string;
          media_url?: string | null;
          created_at?: string;
        };
      };
      ws_chatbot_message_buffers: {
        Row: {
          organization_id: string;
          conversation_id: string;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          organization_id: string;
          conversation_id: string;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          organization_id?: string;
          conversation_id?: string;
          status?: string | null;
          updated_at?: string | null;
        };
      };
      ws_chatbot_products: {
        Row: {
          id: string;
          organization_id: string;
          sku: string | null;
          name_ar: string | null;
          name_he: string | null;
          name_en: string | null;
          description_ar: string | null;
          description_he: string | null;
          description_en: string | null;
          category: string | null;
          material: string | null;
          source_system: string | null;
          source_id: string | null;
          active: boolean | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          sku?: string | null;
          name_ar?: string | null;
          name_he?: string | null;
          name_en?: string | null;
          description_ar?: string | null;
          description_he?: string | null;
          description_en?: string | null;
          category?: string | null;
          material?: string | null;
          source_system?: string | null;
          source_id?: string | null;
          active?: boolean | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          sku?: string | null;
          name_ar?: string | null;
          name_he?: string | null;
          name_en?: string | null;
          description_ar?: string | null;
          description_he?: string | null;
          description_en?: string | null;
          category?: string | null;
          material?: string | null;
          source_system?: string | null;
          source_id?: string | null;
          active?: boolean | null;
          created_at?: string;
          updated_at?: string | null;
        };
      };
      ws_chatbot_product_variants: {
        Row: {
          id: string;
          organization_id: string;
          product_id: string;
          sku: string | null;
          color_code: string | null;
          color_ar: string | null;
          color_he: string | null;
          color_en: string | null;
          price: number | null;
          compare_at_price: number | null;
          unit_cost: number | null;
          stock_quantity: number | null;
          active: boolean | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          product_id: string;
          sku?: string | null;
          color_code?: string | null;
          color_ar?: string | null;
          color_he?: string | null;
          color_en?: string | null;
          price?: number | null;
          compare_at_price?: number | null;
          unit_cost?: number | null;
          stock_quantity?: number | null;
          active?: boolean | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          product_id?: string;
          sku?: string | null;
          color_code?: string | null;
          color_ar?: string | null;
          color_he?: string | null;
          color_en?: string | null;
          price?: number | null;
          compare_at_price?: number | null;
          unit_cost?: number | null;
          stock_quantity?: number | null;
          active?: boolean | null;
          created_at?: string;
          updated_at?: string | null;
        };
      };
      ws_chatbot_product_media: {
        Row: {
          id: string;
          organization_id: string;
          product_id: string;
          variant_id: string | null;
          media_url: string | null;
          storage_path: string | null;
          media_type: string | null;
          option_number: number | null;
          sort_order: number | null;
          alt_ar: string | null;
          alt_he: string | null;
          alt_en: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          product_id: string;
          variant_id?: string | null;
          media_url?: string | null;
          storage_path?: string | null;
          media_type?: string | null;
          option_number?: number | null;
          sort_order?: number | null;
          alt_ar?: string | null;
          alt_he?: string | null;
          alt_en?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          product_id?: string;
          variant_id?: string | null;
          media_url?: string | null;
          storage_path?: string | null;
          media_type?: string | null;
          option_number?: number | null;
          sort_order?: number | null;
          alt_ar?: string | null;
          alt_he?: string | null;
          alt_en?: string | null;
          created_at?: string;
        };
      };
      ws_chatbot_product_aliases: {
        Row: {
          id: string;
          organization_id: string;
          product_id: string;
          alias: string;
          language: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          product_id: string;
          alias: string;
          language?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          product_id?: string;
          alias?: string;
          language?: string | null;
          created_at?: string;
        };
      };
      ws_chatbot_shipping_zones: {
        Row: {
          id: string;
          organization_id: string;
          name_ar: string;
          active: boolean | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name_ar: string;
          active?: boolean | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name_ar?: string;
          active?: boolean | null;
          created_at?: string;
          updated_at?: string | null;
        };
      };
      ws_chatbot_shipping_zone_aliases: {
        Row: {
          id: string;
          organization_id: string;
          shipping_zone_id: string;
          alias: string;
          language: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          shipping_zone_id: string;
          alias: string;
          language?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          shipping_zone_id?: string;
          alias?: string;
          language?: string | null;
          created_at?: string;
        };
      };
      ws_chatbot_discount_rules: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          discount_type: 'fixed' | 'percentage' | 'fixed_unit_price' | string;
          discount_value: number;
          min_quantity: number | null;
          product_id: string | null;
          priority: number | null;
          requires_customer_request: boolean | null;
          active: boolean | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          discount_type: string;
          discount_value: number;
          min_quantity?: number | null;
          product_id?: string | null;
          priority?: number | null;
          requires_customer_request?: boolean | null;
          active?: boolean | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          discount_type?: string;
          discount_value?: number;
          min_quantity?: number | null;
          product_id?: string | null;
          priority?: number | null;
          requires_customer_request?: boolean | null;
          active?: boolean | null;
          created_at?: string;
          updated_at?: string | null;
        };
      };
      ws_chatbot_ad_product_mappings: {
        Row: {
          id: string;
          organization_id: string;
          ad_id: string;
          product_id: string;
          mapping_source: string | null;
          priority: number | null;
          active: boolean | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          ad_id: string;
          product_id: string;
          mapping_source?: string | null;
          priority?: number | null;
          active?: boolean | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          ad_id?: string;
          product_id?: string;
          mapping_source?: string | null;
          priority?: number | null;
          active?: boolean | null;
          created_at?: string;
          updated_at?: string | null;
        };
      };
      ws_chatbot_conversation_attributions: {
        Row: {
          id: string;
          organization_id: string;
          conversation_id: string;
          ad_id: string | null;
          meta_ad_id: string | null;
          ctwa_clid: string | null;
          source_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          conversation_id: string;
          ad_id?: string | null;
          meta_ad_id?: string | null;
          ctwa_clid?: string | null;
          source_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          conversation_id?: string;
          ad_id?: string | null;
          meta_ad_id?: string | null;
          ctwa_clid?: string | null;
          source_id?: string | null;
          created_at?: string;
        };
      };
      ws_chatbot_orders: {
        Row: {
          id: string;
          organization_id: string;
          conversation_id: string | null;
          customer_id: string | null;
          status: 'draft' | 'collecting' | 'awaiting_confirmation' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'returned' | string;
          shipping_zone_id: string | null;
          subtotal: number | null;
          shipping_fee: number | null;
          actual_shipping_cost: number | null;
          cogs: number | null;
          total: number | null;
          gross_profit: number | null;
          ad_id: string | null;
          idempotency_key: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          conversation_id?: string | null;
          customer_id?: string | null;
          status?: string;
          shipping_zone_id?: string | null;
          subtotal?: number | null;
          shipping_fee?: number | null;
          actual_shipping_cost?: number | null;
          cogs?: number | null;
          total?: number | null;
          gross_profit?: number | null;
          ad_id?: string | null;
          idempotency_key?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          conversation_id?: string | null;
          customer_id?: string | null;
          status?: string;
          shipping_zone_id?: string | null;
          subtotal?: number | null;
          shipping_fee?: number | null;
          actual_shipping_cost?: number | null;
          cogs?: number | null;
          total?: number | null;
          gross_profit?: number | null;
          ad_id?: string | null;
          idempotency_key?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
      };
      ws_chatbot_order_items: {
        Row: {
          id: string;
          organization_id: string;
          order_id: string;
          product_id: string | null;
          variant_id: string | null;
          product_name_snapshot: string | null;
          sku_snapshot: string | null;
          quantity: number;
          unit_price: number | null;
          unit_cost: number | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          order_id: string;
          product_id?: string | null;
          variant_id?: string | null;
          product_name_snapshot?: string | null;
          sku_snapshot?: string | null;
          quantity: number;
          unit_price?: number | null;
          unit_cost?: number | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          order_id?: string;
          product_id?: string | null;
          variant_id?: string | null;
          product_name_snapshot?: string | null;
          sku_snapshot?: string | null;
          quantity?: number;
          unit_price?: number | null;
          unit_cost?: number | null;
          created_at?: string;
          updated_at?: string | null;
        };
      };
      ws_chatbot_order_events: {
        Row: {
          id: string;
          organization_id: string;
          order_id: string;
          event_type: string;
          from_status: string | null;
          to_status: string | null;
          actor_type: string | null;
          actor_id: string | null;
          payload: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          order_id: string;
          event_type: string;
          from_status?: string | null;
          to_status?: string | null;
          actor_type?: string | null;
          actor_id?: string | null;
          payload?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          order_id?: string;
          event_type?: string;
          from_status?: string | null;
          to_status?: string | null;
          actor_type?: string | null;
          actor_id?: string | null;
          payload?: Json | null;
          created_at?: string;
        };
      };
      ws_chatbot_handoffs: {
        Row: {
          id: string;
          organization_id: string;
          conversation_id: string;
          status: string;
          reason: string | null;
          created_at: string;
          resolved_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          conversation_id: string;
          status: string;
          reason?: string | null;
          created_at?: string;
          resolved_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          conversation_id?: string;
          status?: string;
          reason?: string | null;
          created_at?: string;
          resolved_at?: string | null;
          updated_at?: string | null;
        };
      };
      ws_chatbot_conversion_outbox: {
        Row: {
          id: string;
          organization_id: string;
          order_id: string;
          status: string;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          order_id: string;
          status: string;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          order_id?: string;
          status?: string;
          created_at?: string;
          updated_at?: string | null;
        };
      };
    };
    Views: {
      ws_chatbot_order_profitability: {
        Row: {
          organization_id: string | null;
          ad_id: string | null;
          ad_set_id: string | null;
          campaign_id: string | null;
          ad_account_id: string | null;
          status: string | null;
          cogs: number | null;
          actual_shipping_cost: number | null;
          gross_profit: number | null;
        };
      };
    };
    Functions: {
      ws_chatbot_set_order_status: {
        Args: {
          p_order_id: string;
          p_status: string;
          p_idempotency_key?: string;
          p_actual_shipping_cost?: number;
        };
        Returns: Json;
      };
    };
  };
}
