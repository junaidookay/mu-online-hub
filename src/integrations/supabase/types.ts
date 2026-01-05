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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      servers: {
        Row: {
          banner_url: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      vip_level: ["none", "gold", "diamond"],
    },
  },
} as const
