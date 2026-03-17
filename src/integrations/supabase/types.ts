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
      influencers: {
        Row: {
          avg_comments: number | null
          avg_likes: number | null
          bio: string | null
          city: string | null
          contact_method: string | null
          content_type: string | null
          created_at: string
          email: string | null
          engagement_rate: number | null
          followers_count: number | null
          following_count: number | null
          full_name: string | null
          id: string
          niche: string | null
          notes: string | null
          platform: string
          posts_count: number | null
          profile_image_url: string | null
          profile_url: string | null
          status: string
          updated_at: string
          user_id: string
          username: string
          website: string | null
        }
        Insert: {
          avg_comments?: number | null
          avg_likes?: number | null
          bio?: string | null
          city?: string | null
          contact_method?: string | null
          content_type?: string | null
          created_at?: string
          email?: string | null
          engagement_rate?: number | null
          followers_count?: number | null
          following_count?: number | null
          full_name?: string | null
          id?: string
          niche?: string | null
          notes?: string | null
          platform?: string
          posts_count?: number | null
          profile_image_url?: string | null
          profile_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
          username: string
          website?: string | null
        }
        Update: {
          avg_comments?: number | null
          avg_likes?: number | null
          bio?: string | null
          city?: string | null
          contact_method?: string | null
          content_type?: string | null
          created_at?: string
          email?: string | null
          engagement_rate?: number | null
          followers_count?: number | null
          following_count?: number | null
          full_name?: string | null
          id?: string
          niche?: string | null
          notes?: string | null
          platform?: string
          posts_count?: number | null
          profile_image_url?: string | null
          profile_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          username?: string
          website?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          address: string | null
          assigned_user_id: string | null
          business_name: string
          category: string | null
          city: string | null
          created_at: string
          email: string | null
          id: string
          instagram_handle: string | null
          last_outreach_date: string | null
          next_outreach_date: string | null
          notes: string | null
          owner_name: string | null
          platform: Database["public"]["Enums"]["platform_type"]
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          assigned_user_id?: string | null
          business_name?: string
          category?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          instagram_handle?: string | null
          last_outreach_date?: string | null
          next_outreach_date?: string | null
          notes?: string | null
          owner_name?: string | null
          platform?: Database["public"]["Enums"]["platform_type"]
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          assigned_user_id?: string | null
          business_name?: string
          category?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          instagram_handle?: string | null
          last_outreach_date?: string | null
          next_outreach_date?: string | null
          notes?: string | null
          owner_name?: string | null
          platform?: Database["public"]["Enums"]["platform_type"]
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      sequence_steps: {
        Row: {
          created_at: string
          delay_days: number
          id: string
          sequence_id: string
          step_number: number
          template_id: string
        }
        Insert: {
          created_at?: string
          delay_days?: number
          id?: string
          sequence_id: string
          step_number?: number
          template_id: string
        }
        Update: {
          created_at?: string
          delay_days?: number
          id?: string
          sequence_id?: string
          step_number?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequence_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_steps_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      sequences: {
        Row: {
          created_at: string
          current_step: number
          id: string
          interval_days: number
          lead_id: string
          max_followups: number
          name: string | null
          next_send_at: string | null
          status: string
          template_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_step?: number
          id?: string
          interval_days?: number
          lead_id: string
          max_followups?: number
          name?: string | null
          next_send_at?: string | null
          status?: string
          template_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_step?: number
          id?: string
          interval_days?: number
          lead_id?: string
          max_followups?: number
          name?: string | null
          next_send_at?: string | null
          status?: string
          template_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequences_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequences_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          channel: Database["public"]["Enums"]["channel_type"]
          created_at: string
          id: string
          message_body: string
          name: string
          platform: Database["public"]["Enums"]["platform_type"]
          subject: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          channel?: Database["public"]["Enums"]["channel_type"]
          created_at?: string
          id?: string
          message_body: string
          name: string
          platform?: Database["public"]["Enums"]["platform_type"]
          subject?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["channel_type"]
          created_at?: string
          id?: string
          message_body?: string
          name?: string
          platform?: Database["public"]["Enums"]["platform_type"]
          subject?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_invites: {
        Row: {
          created_at: string
          email: string
          id: string
          invited_by: string
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invited_by: string
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invited_by?: string
          status?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
    }
    Enums: {
      app_role: "admin" | "user"
      channel_type: "email" | "instagram"
      lead_status: "new" | "contacted" | "demo_booked" | "onboarded"
      platform_type: "eros" | "noms"
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
      app_role: ["admin", "user"],
      channel_type: ["email", "instagram"],
      lead_status: ["new", "contacted", "demo_booked", "onboarded"],
      platform_type: ["eros", "noms"],
    },
  },
} as const
