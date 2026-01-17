export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ad_clicks: {
        Row: {
          ad_id: string
          clicked_at: string
          id: string
        }
        Insert: {
          ad_id: string
          clicked_at?: string
          id?: string
        }
        Update: {
          ad_id?: string
          clicked_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_clicks_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "advertisements"
            referencedColumns: ["id"]
          },
        ]
      }
      advertisements: {
        Row: {
          ad_type: Database["public"]["Enums"]["ad_type"]
          banner_url: string | null
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          rotation_order: number | null
          title: string
          updated_at: string
          user_id: string
          vip_level: Database["public"]["Enums"]["vip_level"] | null
          website: string
        }
        Insert: {
          ad_type: Database["public"]["Enums"]["ad_type"]
          banner_url?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          rotation_order?: number | null
          title: string
          updated_at?: string
          user_id: string
          vip_level?: Database["public"]["Enums"]["vip_level"] | null
          website: string
        }
        Update: {
          ad_type?: Database["public"]["Enums"]["ad_type"]
          banner_url?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          rotation_order?: number | null
          title?: string
          updated_at?: string
          user_id?: string
          vip_level?: Database["public"]["Enums"]["vip_level"] | null
          website?: string
        }
        Relationships: []
      }
      arcana_projects: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          image_url: string | null
          info: string | null
          is_active: boolean | null
          name: string
          updated_at: string
          website: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          image_url?: string | null
          info?: string | null
          is_active?: boolean | null
          name: string
          updated_at?: string
          website: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          image_url?: string | null
          info?: string | null
          is_active?: boolean | null
          name?: string
          updated_at?: string
          website?: string
        }
        Relationships: []
      }
      listing_packages: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          duration_days: number
          features: string[] | null
          id: string
          is_active: boolean | null
          name: string
          price_cents: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          duration_days: number
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          name: string
          price_cents: number
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          duration_days?: number
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_cents?: number
        }
        Relationships: []
      }
      listing_purchases: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          currency: string | null
          duration_days: number
          id: string
          listing_id: string
          package_id: string | null
          seller_id: string | null
          status: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          duration_days: number
          id?: string
          listing_id: string
          package_id?: string | null
          seller_id?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          duration_days?: number
          id?: string
          listing_id?: string
          package_id?: string | null
          seller_id?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_purchases_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_purchases_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "listing_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_views: {
        Row: {
          id: string
          ip_hash: string | null
          listing_id: string
          viewed_at: string
          viewer_id: string | null
        }
        Insert: {
          id?: string
          ip_hash?: string | null
          listing_id: string
          viewed_at?: string
          viewer_id?: string | null
        }
        Update: {
          id?: string
          ip_hash?: string | null
          listing_id?: string
          viewed_at?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_views_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          category: Database["public"]["Enums"]["seller_category"]
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_published: boolean | null
          price_usd: number | null
          published_at: string | null
          title: string
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["seller_category"]
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_published?: boolean | null
          price_usd?: number | null
          published_at?: string | null
          title: string
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["seller_category"]
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_published?: boolean | null
          price_usd?: number | null
          published_at?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean | null
          listing_id: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          listing_id?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          listing_id?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      partners: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          image_url: string | null
          info: string | null
          is_active: boolean | null
          name: string
          updated_at: string
          website: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          image_url?: string | null
          info?: string | null
          is_active?: boolean | null
          name: string
          updated_at?: string
          website: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          image_url?: string | null
          info?: string | null
          is_active?: boolean | null
          name?: string
          updated_at?: string
          website?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          currency: string
          duration_days: number
          id: string
          metadata: Json | null
          product_id: string | null
          product_type: string
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          duration_days: number
          id?: string
          metadata?: Json | null
          product_id?: string | null
          product_type: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          duration_days?: number
          id?: string
          metadata?: Json | null
          product_id?: string | null
          product_type?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      premium_banners: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          image_url: string
          is_active: boolean | null
          title: string
          updated_at: string
          website: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          image_url: string
          is_active?: boolean | null
          title: string
          updated_at?: string
          website: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          title?: string
          updated_at?: string
          website?: string
        }
        Relationships: []
      }
      premium_text_servers: {
        Row: {
          created_at: string
          exp_rate: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          name: string
          open_date: string | null
          rotation_order: number | null
          user_id: string
          version: string
          website: string
        }
        Insert: {
          created_at?: string
          exp_rate: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          open_date?: string | null
          rotation_order?: number | null
          user_id: string
          version: string
          website: string
        }
        Update: {
          created_at?: string
          exp_rate?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          open_date?: string | null
          rotation_order?: number | null
          user_id?: string
          version?: string
          website?: string
        }
        Relationships: []
      }
      pricing_packages: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          duration_days: number
          features: string[] | null
          id: string
          is_active: boolean | null
          name: string
          price_cents: number
          product_type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          duration_days: number
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          name: string
          price_cents: number
          product_type: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          duration_days?: number
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_cents?: number
          product_type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          stripe_account_id: string | null
          stripe_onboarding_complete: boolean | null
          updated_at: string
          user_id: string
          user_type: Database["public"]["Enums"]["user_type"] | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          updated_at?: string
          user_id: string
          user_type?: Database["public"]["Enums"]["user_type"] | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          updated_at?: string
          user_id?: string
          user_type?: Database["public"]["Enums"]["user_type"] | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          content: string | null
          created_at: string
          id: string
          is_verified_purchase: boolean | null
          listing_id: string
          purchase_id: string | null
          rating: number
          reviewer_id: string
          seller_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          is_verified_purchase?: boolean | null
          listing_id: string
          purchase_id?: string | null
          rating: number
          reviewer_id: string
          seller_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          is_verified_purchase?: boolean | null
          listing_id?: string
          purchase_id?: string | null
          rating?: number
          reviewer_id?: string
          seller_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "listing_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      rotating_promos: {
        Row: {
          created_at: string
          expires_at: string | null
          highlight: string
          id: string
          is_active: boolean | null
          link: string | null
          promo_type: string
          text: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          highlight: string
          id?: string
          is_active?: boolean | null
          link?: string | null
          promo_type: string
          text: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          highlight?: string
          id?: string
          is_active?: boolean | null
          link?: string | null
          promo_type?: string
          text?: string
        }
        Relationships: []
      }
      seller_categories: {
        Row: {
          category: Database["public"]["Enums"]["seller_category"]
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["seller_category"]
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["seller_category"]
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      seller_payouts: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          listing_id: string | null
          net_amount_cents: number
          paid_at: string | null
          platform_fee_cents: number | null
          purchase_id: string | null
          status: string | null
          stripe_transfer_id: string | null
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          listing_id?: string | null
          net_amount_cents: number
          paid_at?: string | null
          platform_fee_cents?: number | null
          purchase_id?: string | null
          status?: string | null
          stripe_transfer_id?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          listing_id?: string | null
          net_amount_cents?: number
          paid_at?: string | null
          platform_fee_cents?: number | null
          purchase_id?: string | null
          status?: string | null
          stripe_transfer_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_payouts_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_payouts_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "listing_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      servers: {
        Row: {
          banner_url: string | null
          click_count: number | null
          created_at: string
          exp_rate: string
          expires_at: string | null
          features: string[] | null
          id: string
          is_active: boolean | null
          is_premium: boolean | null
          name: string
          open_date: string | null
          part: string
          rotation_order: number | null
          season: string
          updated_at: string
          user_id: string
          website: string
        }
        Insert: {
          banner_url?: string | null
          click_count?: number | null
          created_at?: string
          exp_rate: string
          expires_at?: string | null
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          is_premium?: boolean | null
          name: string
          open_date?: string | null
          part: string
          rotation_order?: number | null
          season: string
          updated_at?: string
          user_id: string
          website: string
        }
        Update: {
          banner_url?: string | null
          click_count?: number | null
          created_at?: string
          exp_rate?: string
          expires_at?: string | null
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          is_premium?: boolean | null
          name?: string
          open_date?: string | null
          part?: string
          rotation_order?: number | null
          season?: string
          updated_at?: string
          user_id?: string
          website?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          badges: string[] | null
          buyer_level: number | null
          buyer_xp: number | null
          created_at: string
          id: string
          purchases_count: number | null
          sales_count: number | null
          seller_level: number | null
          seller_xp: number | null
          total_earned_cents: number | null
          total_spent_cents: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          badges?: string[] | null
          buyer_level?: number | null
          buyer_xp?: number | null
          created_at?: string
          id?: string
          purchases_count?: number | null
          sales_count?: number | null
          seller_level?: number | null
          seller_xp?: number | null
          total_earned_cents?: number | null
          total_spent_cents?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          badges?: string[] | null
          buyer_level?: number | null
          buyer_xp?: number | null
          created_at?: string
          id?: string
          purchases_count?: number | null
          sales_count?: number | null
          seller_level?: number | null
          seller_xp?: number | null
          total_earned_cents?: number | null
          total_spent_cents?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_conversations: {
        Args: never
        Returns: {
          conversation_id: string
          conversation_partner: string
          has_unread: boolean
          last_message: string
          last_message_at: string
          listing_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      ad_type: "marketplace" | "services"
      app_role: "admin" | "moderator" | "user"
      seller_category:
        | "websites"
        | "server_files"
        | "antihack"
        | "launchers"
        | "custom_scripts"
        | "mu_websites"
        | "mu_server_files"
        | "mu_protection"
        | "mu_app_developer"
        | "mu_launchers"
        | "mu_installers"
        | "mu_hosting"
        | "server_development"
        | "design_branding"
        | "skins_customization"
        | "media"
        | "promotion"
        | "streaming"
        | "content_creators"
        | "event_master"
        | "marketing_growth"
      user_type: "buyer" | "seller"
      vip_level: "none" | "gold" | "diamond"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      ad_type: ["marketplace", "services"],
      app_role: ["admin", "moderator", "user"],
      seller_category: [
        "websites",
        "server_files",
        "antihack",
        "launchers",
        "custom_scripts",
        "mu_websites",
        "mu_server_files",
        "mu_protection",
        "mu_app_developer",
        "mu_launchers",
        "mu_installers",
        "mu_hosting",
        "server_development",
        "design_branding",
        "skins_customization",
        "media",
        "promotion",
        "streaming",
        "content_creators",
        "event_master",
        "marketing_growth",
      ],
      user_type: ["buyer", "seller"],
      vip_level: ["none", "gold", "diamond"],
    },
  },
} as const
