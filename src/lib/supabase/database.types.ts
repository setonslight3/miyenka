// Generated from supabase/migrations by scripts/gen-database-types.sh.
// Do not edit by hand: change a migration and regenerate.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      admin_users: {
        Row: {
          id: string;
          user_id: string | null;
          email: string;
          role: Database["public"]["Enums"]["admin_role"];
          is_active: boolean;
          invited_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          email: string;
          role?: Database["public"]["Enums"]["admin_role"];
          is_active?: boolean;
          invited_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          email?: string;
          role?: Database["public"]["Enums"]["admin_role"];
          is_active?: boolean;
          invited_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "admin_users_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_users_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          actor_email: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          summary: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          actor_email?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          summary?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          actor_email?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          summary?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          id: string;
          slug: string;
          name: string;
          code: Database["public"]["Enums"]["dress_category"];
          description: string | null;
          position: number;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          code: Database["public"]["Enums"]["dress_category"];
          description?: string | null;
          position?: number;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          code?: Database["public"]["Enums"]["dress_category"];
          description?: string | null;
          position?: number;
        };
        Relationships: [];
      };
      collections: {
        Row: {
          id: string;
          slug: string;
          name: string;
          tagline: string | null;
          description: string | null;
          hero_image_url: string | null;
          position: number;
          is_published: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          tagline?: string | null;
          description?: string | null;
          hero_image_url?: string | null;
          position?: number;
          is_published?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          tagline?: string | null;
          description?: string | null;
          hero_image_url?: string | null;
          position?: number;
          is_published?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      custom_quotes: {
        Row: {
          id: string;
          request_id: string;
          quote_number: string;
          access_token: string;
          amount_minor: number;
          currency: string;
          shipping_minor: number;
          total_minor: number;
          summary: string | null;
          production_days: number | null;
          status: string;
          expires_at: string | null;
          paid_at: string | null;
          order_id: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          quote_number: string;
          access_token?: string;
          amount_minor: number;
          currency?: string;
          shipping_minor?: number;
          total_minor: number;
          summary?: string | null;
          production_days?: number | null;
          status?: string;
          expires_at?: string | null;
          paid_at?: string | null;
          order_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          request_id?: string;
          quote_number?: string;
          access_token?: string;
          amount_minor?: number;
          currency?: string;
          shipping_minor?: number;
          total_minor?: number;
          summary?: string | null;
          production_days?: number | null;
          status?: string;
          expires_at?: string | null;
          paid_at?: string | null;
          order_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "custom_quotes_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "custom_quotes_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "custom_quotes_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "custom_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      custom_request_media: {
        Row: {
          id: string;
          request_id: string;
          storage_path: string;
          content_type: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          storage_path: string;
          content_type?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          request_id?: string;
          storage_path?: string;
          content_type?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "custom_request_media_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "custom_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      custom_requests: {
        Row: {
          id: string;
          reference: string;
          user_id: string | null;
          product_id: string | null;
          contact_email: string;
          contact_name: string | null;
          contact_phone: string | null;
          bust_cm: number | null;
          waist_cm: number | null;
          hips_cm: number | null;
          shoulder_to_hem_cm: number | null;
          height_cm: number | null;
          preferred_fabric: string | null;
          preferred_color: string | null;
          modification_notes: string | null;
          event_date: string | null;
          status: Database["public"]["Enums"]["custom_request_status"];
          admin_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reference: string;
          user_id?: string | null;
          product_id?: string | null;
          contact_email: string;
          contact_name?: string | null;
          contact_phone?: string | null;
          bust_cm?: number | null;
          waist_cm?: number | null;
          hips_cm?: number | null;
          shoulder_to_hem_cm?: number | null;
          height_cm?: number | null;
          preferred_fabric?: string | null;
          preferred_color?: string | null;
          modification_notes?: string | null;
          event_date?: string | null;
          status?: Database["public"]["Enums"]["custom_request_status"];
          admin_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          reference?: string;
          user_id?: string | null;
          product_id?: string | null;
          contact_email?: string;
          contact_name?: string | null;
          contact_phone?: string | null;
          bust_cm?: number | null;
          waist_cm?: number | null;
          hips_cm?: number | null;
          shoulder_to_hem_cm?: number | null;
          height_cm?: number | null;
          preferred_fabric?: string | null;
          preferred_color?: string | null;
          modification_notes?: string | null;
          event_date?: string | null;
          status?: Database["public"]["Enums"]["custom_request_status"];
          admin_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "custom_requests_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "custom_requests_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      email_events: {
        Row: {
          id: string;
          recipient: string;
          template: string;
          subject: string | null;
          order_id: string | null;
          provider_message_id: string | null;
          status: string;
          error: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipient: string;
          template: string;
          subject?: string | null;
          order_id?: string | null;
          provider_message_id?: string | null;
          status?: string;
          error?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          recipient?: string;
          template?: string;
          subject?: string | null;
          order_id?: string | null;
          provider_message_id?: string | null;
          status?: string;
          error?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "email_events_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      exchange_rates: {
        Row: {
          id: string;
          base_currency: string;
          quote_currency: string;
          rate: number;
          markup_percent: number;
          source: string;
          fetched_at: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          base_currency?: string;
          quote_currency: string;
          rate: number;
          markup_percent?: number;
          source?: string;
          fetched_at?: string;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          base_currency?: string;
          quote_currency?: string;
          rate?: number;
          markup_percent?: number;
          source?: string;
          fetched_at?: string;
          is_active?: boolean;
        };
        Relationships: [];
      };
      newsletter_subscribers: {
        Row: {
          id: string;
          email: string;
          source: string | null;
          is_subscribed: boolean;
          unsubscribed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          source?: string | null;
          is_subscribed?: boolean;
          unsubscribed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          source?: string | null;
          is_subscribed?: boolean;
          unsubscribed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          variant_id: string | null;
          product_size_id: string | null;
          product_name: string;
          product_slug: string | null;
          variant_color: string | null;
          size: Database["public"]["Enums"]["size_code"] | null;
          image_url: string | null;
          sku: string | null;
          unit_price_minor: number;
          quantity: number;
          line_total_minor: number;
          currency: string;
          is_bespoke: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          variant_id?: string | null;
          product_size_id?: string | null;
          product_name: string;
          product_slug?: string | null;
          variant_color?: string | null;
          size?: Database["public"]["Enums"]["size_code"] | null;
          image_url?: string | null;
          sku?: string | null;
          unit_price_minor: number;
          quantity: number;
          line_total_minor: number;
          currency?: string;
          is_bespoke?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string | null;
          variant_id?: string | null;
          product_size_id?: string | null;
          product_name?: string;
          product_slug?: string | null;
          variant_color?: string | null;
          size?: Database["public"]["Enums"]["size_code"] | null;
          image_url?: string | null;
          sku?: string | null;
          unit_price_minor?: number;
          quantity?: number;
          line_total_minor?: number;
          currency?: string;
          is_bespoke?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_size_id_fkey";
            columns: ["product_size_id"];
            isOneToOne: false;
            referencedRelation: "product_sizes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      order_status_history: {
        Row: {
          id: string;
          order_id: string;
          from_status: Database["public"]["Enums"]["order_status"] | null;
          to_status: Database["public"]["Enums"]["order_status"];
          note: string | null;
          changed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          from_status?: Database["public"]["Enums"]["order_status"] | null;
          to_status: Database["public"]["Enums"]["order_status"];
          note?: string | null;
          changed_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          from_status?: Database["public"]["Enums"]["order_status"] | null;
          to_status?: Database["public"]["Enums"]["order_status"];
          note?: string | null;
          changed_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_status_history_changed_by_fkey";
            columns: ["changed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          user_id: string | null;
          guest_email: string | null;
          contact_phone: string | null;
          status: Database["public"]["Enums"]["order_status"];
          order_type: Database["public"]["Enums"]["order_type"];
          subtotal_minor: number;
          discount_minor: number;
          shipping_minor: number;
          tax_minor: number;
          total_minor: number;
          currency: string;
          display_currency: string;
          fx_rate: number;
          fx_captured_at: string | null;
          shipping_zone_id: string | null;
          shipping_rate_id: string | null;
          shipping_address: Json | null;
          billing_address: Json | null;
          promotion_id: string | null;
          promo_code: string | null;
          customer_note: string | null;
          admin_note: string | null;
          tracking_number: string | null;
          tracking_url: string | null;
          carrier: string | null;
          inventory_committed: boolean;
          cancellation_deadline: string | null;
          cancelled_at: string | null;
          confirmed_at: string | null;
          shipped_at: string | null;
          delivered_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number: string;
          user_id?: string | null;
          guest_email?: string | null;
          contact_phone?: string | null;
          status?: Database["public"]["Enums"]["order_status"];
          order_type?: Database["public"]["Enums"]["order_type"];
          subtotal_minor?: number;
          discount_minor?: number;
          shipping_minor?: number;
          tax_minor?: number;
          total_minor?: number;
          currency?: string;
          display_currency?: string;
          fx_rate?: number;
          fx_captured_at?: string | null;
          shipping_zone_id?: string | null;
          shipping_rate_id?: string | null;
          shipping_address?: Json | null;
          billing_address?: Json | null;
          promotion_id?: string | null;
          promo_code?: string | null;
          customer_note?: string | null;
          admin_note?: string | null;
          tracking_number?: string | null;
          tracking_url?: string | null;
          carrier?: string | null;
          inventory_committed?: boolean;
          cancellation_deadline?: string | null;
          cancelled_at?: string | null;
          confirmed_at?: string | null;
          shipped_at?: string | null;
          delivered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_number?: string;
          user_id?: string | null;
          guest_email?: string | null;
          contact_phone?: string | null;
          status?: Database["public"]["Enums"]["order_status"];
          order_type?: Database["public"]["Enums"]["order_type"];
          subtotal_minor?: number;
          discount_minor?: number;
          shipping_minor?: number;
          tax_minor?: number;
          total_minor?: number;
          currency?: string;
          display_currency?: string;
          fx_rate?: number;
          fx_captured_at?: string | null;
          shipping_zone_id?: string | null;
          shipping_rate_id?: string | null;
          shipping_address?: Json | null;
          billing_address?: Json | null;
          promotion_id?: string | null;
          promo_code?: string | null;
          customer_note?: string | null;
          admin_note?: string | null;
          tracking_number?: string | null;
          tracking_url?: string | null;
          carrier?: string | null;
          inventory_committed?: boolean;
          cancellation_deadline?: string | null;
          cancelled_at?: string | null;
          confirmed_at?: string | null;
          shipped_at?: string | null;
          delivered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_promotion_fk";
            columns: ["promotion_id"];
            isOneToOne: false;
            referencedRelation: "promotions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_shipping_rate_id_fkey";
            columns: ["shipping_rate_id"];
            isOneToOne: false;
            referencedRelation: "shipping_rates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_shipping_zone_id_fkey";
            columns: ["shipping_zone_id"];
            isOneToOne: false;
            referencedRelation: "shipping_zones";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_events: {
        Row: {
          id: string;
          payment_id: string | null;
          provider: Database["public"]["Enums"]["payment_provider"];
          event_type: string;
          event_signature: string | null;
          provider_reference: string | null;
          payload: Json;
          processed_at: string | null;
          processing_error: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          payment_id?: string | null;
          provider: Database["public"]["Enums"]["payment_provider"];
          event_type: string;
          event_signature?: string | null;
          provider_reference?: string | null;
          payload: Json;
          processed_at?: string | null;
          processing_error?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          payment_id?: string | null;
          provider?: Database["public"]["Enums"]["payment_provider"];
          event_type?: string;
          event_signature?: string | null;
          provider_reference?: string | null;
          payload?: Json;
          processed_at?: string | null;
          processing_error?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_events_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          order_id: string | null;
          custom_quote_id: string | null;
          provider: Database["public"]["Enums"]["payment_provider"];
          provider_reference: string;
          provider_transaction_id: string | null;
          status: Database["public"]["Enums"]["payment_status"];
          amount_minor: number;
          currency: string;
          authorization_url: string | null;
          channel: string | null;
          paid_at: string | null;
          verified_at: string | null;
          raw_response: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id?: string | null;
          custom_quote_id?: string | null;
          provider: Database["public"]["Enums"]["payment_provider"];
          provider_reference: string;
          provider_transaction_id?: string | null;
          status?: Database["public"]["Enums"]["payment_status"];
          amount_minor: number;
          currency?: string;
          authorization_url?: string | null;
          channel?: string | null;
          paid_at?: string | null;
          verified_at?: string | null;
          raw_response?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string | null;
          custom_quote_id?: string | null;
          provider?: Database["public"]["Enums"]["payment_provider"];
          provider_reference?: string;
          provider_transaction_id?: string | null;
          status?: Database["public"]["Enums"]["payment_status"];
          amount_minor?: number;
          currency?: string;
          authorization_url?: string | null;
          channel?: string | null;
          paid_at?: string | null;
          verified_at?: string | null;
          raw_response?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_custom_quote_fk";
            columns: ["custom_quote_id"];
            isOneToOne: false;
            referencedRelation: "custom_quotes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          variant_id: string | null;
          url: string;
          alt_text: string | null;
          position: number;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          variant_id?: string | null;
          url: string;
          alt_text?: string | null;
          position?: number;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          variant_id?: string | null;
          url?: string;
          alt_text?: string | null;
          position?: number;
          is_primary?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_images_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      product_sizes: {
        Row: {
          id: string;
          variant_id: string;
          size: Database["public"]["Enums"]["size_code"];
          sku: string | null;
          quantity: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          variant_id: string;
          size: Database["public"]["Enums"]["size_code"];
          sku?: string | null;
          quantity?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          variant_id?: string;
          size?: Database["public"]["Enums"]["size_code"];
          sku?: string | null;
          quantity?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_sizes_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          color_name: string;
          color_hex: string | null;
          sku_prefix: string | null;
          price_override_minor: number | null;
          position: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          color_name: string;
          color_hex?: string | null;
          sku_prefix?: string | null;
          price_override_minor?: number | null;
          position?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          color_name?: string;
          color_hex?: string | null;
          sku_prefix?: string | null;
          price_override_minor?: number | null;
          position?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          id: string;
          slug: string;
          name: string;
          subtitle: string | null;
          description: string | null;
          story: string | null;
          care_instructions: string | null;
          fabric: string | null;
          category_id: string | null;
          collection_id: string | null;
          base_price_minor: number;
          compare_at_price_minor: number | null;
          currency: string;
          supports_bespoke: boolean;
          supports_ready_to_wear: boolean;
          is_published: boolean;
          is_featured: boolean;
          position: number;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          subtitle?: string | null;
          description?: string | null;
          story?: string | null;
          care_instructions?: string | null;
          fabric?: string | null;
          category_id?: string | null;
          collection_id?: string | null;
          base_price_minor: number;
          compare_at_price_minor?: number | null;
          currency?: string;
          supports_bespoke?: boolean;
          supports_ready_to_wear?: boolean;
          is_published?: boolean;
          is_featured?: boolean;
          position?: number;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          subtitle?: string | null;
          description?: string | null;
          story?: string | null;
          care_instructions?: string | null;
          fabric?: string | null;
          category_id?: string | null;
          collection_id?: string | null;
          base_price_minor?: number;
          compare_at_price_minor?: number | null;
          currency?: string;
          supports_bespoke?: boolean;
          supports_ready_to_wear?: boolean;
          is_published?: boolean;
          is_featured?: boolean;
          position?: number;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_collection_id_fkey";
            columns: ["collection_id"];
            isOneToOne: false;
            referencedRelation: "collections";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          marketing_opt_in: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          phone?: string | null;
          marketing_opt_in?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          phone?: string | null;
          marketing_opt_in?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      promotion_redemptions: {
        Row: {
          id: string;
          promotion_id: string;
          order_id: string;
          user_id: string | null;
          email: string | null;
          discount_minor: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          promotion_id: string;
          order_id: string;
          user_id?: string | null;
          email?: string | null;
          discount_minor: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          promotion_id?: string;
          order_id?: string;
          user_id?: string | null;
          email?: string | null;
          discount_minor?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "promotion_redemptions_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "promotion_redemptions_promotion_id_fkey";
            columns: ["promotion_id"];
            isOneToOne: false;
            referencedRelation: "promotions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "promotion_redemptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      promotions: {
        Row: {
          id: string;
          code: string;
          description: string | null;
          type: Database["public"]["Enums"]["promotion_type"];
          value: number;
          min_order_minor: number;
          max_discount_minor: number | null;
          usage_limit: number | null;
          usage_count: number;
          per_customer_limit: number | null;
          starts_at: string | null;
          ends_at: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          description?: string | null;
          type: Database["public"]["Enums"]["promotion_type"];
          value?: number;
          min_order_minor?: number;
          max_discount_minor?: number | null;
          usage_limit?: number | null;
          usage_count?: number;
          per_customer_limit?: number | null;
          starts_at?: string | null;
          ends_at?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          description?: string | null;
          type?: Database["public"]["Enums"]["promotion_type"];
          value?: number;
          min_order_minor?: number;
          max_discount_minor?: number | null;
          usage_limit?: number | null;
          usage_count?: number;
          per_customer_limit?: number | null;
          starts_at?: string | null;
          ends_at?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      review_media: {
        Row: {
          id: string;
          review_id: string;
          url: string;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          review_id: string;
          url: string;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          review_id?: string;
          url?: string;
          position?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "review_media_review_id_fkey";
            columns: ["review_id"];
            isOneToOne: false;
            referencedRelation: "reviews";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          id: string;
          product_id: string;
          user_id: string;
          order_item_id: string;
          rating: number;
          title: string | null;
          body: string | null;
          status: Database["public"]["Enums"]["review_status"];
          admin_response: string | null;
          published_at: string | null;
          published_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          user_id: string;
          order_item_id: string;
          rating: number;
          title?: string | null;
          body?: string | null;
          status?: Database["public"]["Enums"]["review_status"];
          admin_response?: string | null;
          published_at?: string | null;
          published_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          user_id?: string;
          order_item_id?: string;
          rating?: number;
          title?: string | null;
          body?: string | null;
          status?: Database["public"]["Enums"]["review_status"];
          admin_response?: string | null;
          published_at?: string | null;
          published_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_order_item_id_fkey";
            columns: ["order_item_id"];
            isOneToOne: true;
            referencedRelation: "order_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_published_by_fkey";
            columns: ["published_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      shipping_rates: {
        Row: {
          id: string;
          zone_id: string;
          name: string;
          price_minor: number;
          currency: string;
          min_delivery_days: number | null;
          max_delivery_days: number | null;
          free_over_minor: number | null;
          is_active: boolean;
          position: number;
        };
        Insert: {
          id?: string;
          zone_id: string;
          name: string;
          price_minor: number;
          currency?: string;
          min_delivery_days?: number | null;
          max_delivery_days?: number | null;
          free_over_minor?: number | null;
          is_active?: boolean;
          position?: number;
        };
        Update: {
          id?: string;
          zone_id?: string;
          name?: string;
          price_minor?: number;
          currency?: string;
          min_delivery_days?: number | null;
          max_delivery_days?: number | null;
          free_over_minor?: number | null;
          is_active?: boolean;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: "shipping_rates_zone_id_fkey";
            columns: ["zone_id"];
            isOneToOne: false;
            referencedRelation: "shipping_zones";
            referencedColumns: ["id"];
          },
        ];
      };
      shipping_zones: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          country_codes: string[];
          states: string[];
          is_international: boolean;
          is_active: boolean;
          position: number;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string | null;
          country_codes?: string[];
          states?: string[];
          is_international?: boolean;
          is_active?: boolean;
          position?: number;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          description?: string | null;
          country_codes?: string[];
          states?: string[];
          is_international?: boolean;
          is_active?: boolean;
          position?: number;
        };
        Relationships: [];
      };
      site_settings: {
        Row: {
          key: string;
          value: Json;
          description: string | null;
          is_public: boolean;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Json;
          description?: string | null;
          is_public?: boolean;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Json;
          description?: string | null;
          is_public?: boolean;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "site_settings_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      whatsapp_contacts: {
        Row: {
          id: string;
          label: string;
          phone_e164: string;
          greeting: string | null;
          is_active: boolean;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          label: string;
          phone_e164: string;
          greeting?: string | null;
          is_active?: boolean;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          label?: string;
          phone_e164?: string;
          greeting?: string | null;
          is_active?: boolean;
          position?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      wishlists: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wishlists_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      active_fx_rate: { Args: { p_quote_currency: string; p_base?: string }; Returns: number | null };
      available_quantity: { Args: { p_product_size_id: string }; Returns: number };
      can_cancel_order: { Args: { p_order_id: string }; Returns: boolean };
      can_review_order_item: { Args: { p_order_item_id: string; p_user_id?: string }; Returns: boolean };
      decrement_inventory: { Args: { p_order_id: string }; Returns: { committed: boolean; reason: string; shortfalls?: Json } };
      get_setting: { Args: { setting_key: string; fallback?: Json }; Returns: Json };
      handle_new_user: { Args: Record<string, unknown>; Returns: Json };
      increment_promotion_usage: { Args: { p_promotion_id: string }; Returns: number };
      is_active_admin: { Args: { check_user_id?: string }; Returns: boolean };
      is_owner: { Args: { check_user_id?: string }; Returns: boolean };
      next_order_number: { Args: Record<string, never>; Returns: string };
      next_quote_number: { Args: Record<string, never>; Returns: string };
      product_rating: { Args: { p_product_id: string }; Returns: { average: number | null; total: number }[] };
      resolve_shipping_zone: { Args: { p_country: string; p_state?: string }; Returns: string | null };
      restore_inventory: { Args: { p_order_id: string }; Returns: { restored: boolean; reason?: string } };
      reviewable_items: { Args: { p_user_id?: string }; Returns: { order_item_id: string; order_id: string; order_number: string; product_id: string; product_name: string; product_slug: string | null; image_url: string | null; delivered_at: string | null }[] };
      touch_updated_at: { Args: Record<string, unknown>; Returns: Json };
    };
    Enums: {
      admin_role: 'owner' | 'admin';
      custom_request_status: 'awaiting_quote' | 'quote_sent' | 'awaiting_payment' | 'paid_in_production' | 'shipped' | 'delivered' | 'declined' | 'cancelled';
      dress_category: 'mini' | 'midi' | 'maxi' | 'statement_gown';
      order_status: 'pending_payment' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
      order_type: 'ready_to_wear' | 'bespoke';
      payment_provider: 'paystack' | 'flutterwave';
      payment_status: 'pending' | 'successful' | 'failed' | 'abandoned' | 'refunded';
      promotion_type: 'percentage' | 'fixed_amount' | 'free_shipping';
      review_status: 'pending' | 'published' | 'rejected';
      size_code: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';
    };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];
