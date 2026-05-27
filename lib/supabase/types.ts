// Authoritative DB types — generated from the live schema via the Supabase MCP
// (`generate_typescript_types`). Regenerate after every migration. Domain
// aliases for FairBills are appended at the bottom.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      bill_submissions: {
        Row: {
          created_at: string;
          email: string | null;
          expires_at: string;
          fuel_type: string | null;
          id: string;
          lpg_data: Json | null;
          parsed_data: Json;
          recommended_plans: Json | null;
          session_id: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          expires_at?: string;
          fuel_type?: string | null;
          id?: string;
          lpg_data?: Json | null;
          parsed_data: Json;
          recommended_plans?: Json | null;
          session_id: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          expires_at?: string;
          fuel_type?: string | null;
          id?: string;
          lpg_data?: Json | null;
          parsed_data?: Json;
          recommended_plans?: Json | null;
          session_id?: string;
        };
        Relationships: [];
      };
      email_followups: {
        Row: {
          bill_submission_id: string | null;
          created_at: string;
          current_retailer: string | null;
          email: string;
          id: string;
          postcode: string | null;
          saving_estimate_cents: number | null;
          scheduled_for: string;
          sent_at: string | null;
          unsubscribed_at: string | null;
        };
        Insert: {
          bill_submission_id?: string | null;
          created_at?: string;
          current_retailer?: string | null;
          email: string;
          id?: string;
          postcode?: string | null;
          saving_estimate_cents?: number | null;
          scheduled_for: string;
          sent_at?: string | null;
          unsubscribed_at?: string | null;
        };
        Update: {
          bill_submission_id?: string | null;
          created_at?: string;
          current_retailer?: string | null;
          email?: string;
          id?: string;
          postcode?: string | null;
          saving_estimate_cents?: number | null;
          scheduled_for?: string;
          sent_at?: string | null;
          unsubscribed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "email_followups_bill_submission_id_fkey";
            columns: ["bill_submission_id"];
            isOneToOne: false;
            referencedRelation: "bill_submissions";
            referencedColumns: ["id"];
          },
        ];
      };
      fairbills_stats: {
        Row: {
          id: number;
          last_updated: string;
          total_savings_estimated_cents: number;
          total_switches_reported: number;
          total_users: number;
        };
        Insert: {
          id?: number;
          last_updated?: string;
          total_savings_estimated_cents?: number;
          total_switches_reported?: number;
          total_users?: number;
        };
        Update: {
          id?: number;
          last_updated?: string;
          total_savings_estimated_cents?: number;
          total_switches_reported?: number;
          total_users?: number;
        };
        Relationships: [];
      };
      lpg_prices: {
        Row: {
          bottle_size_kg: number;
          confidence: string | null;
          delivery_fee_cents: number | null;
          id: string;
          is_promotional: boolean | null;
          postcode: string;
          price_per_bottle_cents: number;
          promo_conditions: string | null;
          rental_fee_per_year_cents: number | null;
          scraped_at: string | null;
          source_url: string | null;
          supplier: string;
        };
        Insert: {
          bottle_size_kg: number;
          confidence?: string | null;
          delivery_fee_cents?: number | null;
          id?: string;
          is_promotional?: boolean | null;
          postcode: string;
          price_per_bottle_cents: number;
          promo_conditions?: string | null;
          rental_fee_per_year_cents?: number | null;
          scraped_at?: string | null;
          source_url?: string | null;
          supplier: string;
        };
        Update: {
          bottle_size_kg?: number;
          confidence?: string | null;
          delivery_fee_cents?: number | null;
          id?: string;
          is_promotional?: boolean | null;
          postcode?: string;
          price_per_bottle_cents?: number;
          promo_conditions?: string | null;
          rental_fee_per_year_cents?: number | null;
          scraped_at?: string | null;
          source_url?: string | null;
          supplier?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lpg_prices_supplier_fkey";
            columns: ["supplier"];
            isOneToOne: false;
            referencedRelation: "lpg_suppliers";
            referencedColumns: ["name"];
          },
        ];
      };
      lpg_suppliers: {
        Row: {
          contact_page_url: string | null;
          created_at: string | null;
          display_name: string;
          email_retentions: string | null;
          has_online_pricing: boolean;
          id: string;
          is_active: boolean | null;
          name: string;
          notes: string | null;
          phone_retentions: string | null;
          service_area: string | null;
          type: string;
        };
        Insert: {
          contact_page_url?: string | null;
          created_at?: string | null;
          display_name: string;
          email_retentions?: string | null;
          has_online_pricing?: boolean;
          id?: string;
          is_active?: boolean | null;
          name: string;
          notes?: string | null;
          phone_retentions?: string | null;
          service_area?: string | null;
          type: string;
        };
        Update: {
          contact_page_url?: string | null;
          created_at?: string | null;
          display_name?: string;
          email_retentions?: string | null;
          has_online_pricing?: boolean;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          notes?: string | null;
          phone_retentions?: string | null;
          service_area?: string | null;
          type?: string;
        };
        Relationships: [];
      };
      plans: {
        Row: {
          controlled_load_cents: number | null;
          customer_type: string;
          distributor: string;
          effective_from: string;
          effective_to: string | null;
          features: Json | null;
          fuel_type: string;
          id: string;
          included_postcodes: string[] | null;
          is_market_offer: boolean;
          last_synced_at: string;
          plan_id: string;
          plan_name: string;
          raw_data: Json | null;
          retailer_id: string;
          retailer_name: string;
          solar_fit_cents: number | null;
          state: string;
          supply_charge_per_day_cents: number;
          tariff_type: string;
          usage_rate_cents_flat: number | null;
          usage_rate_cents_offpeak: number | null;
          usage_rate_cents_peak: number | null;
          usage_rate_cents_shoulder: number | null;
        };
        Insert: {
          controlled_load_cents?: number | null;
          customer_type?: string;
          distributor: string;
          effective_from: string;
          effective_to?: string | null;
          features?: Json | null;
          fuel_type?: string;
          id: string;
          included_postcodes?: string[] | null;
          is_market_offer?: boolean;
          last_synced_at?: string;
          plan_id: string;
          plan_name: string;
          raw_data?: Json | null;
          retailer_id: string;
          retailer_name: string;
          solar_fit_cents?: number | null;
          state?: string;
          supply_charge_per_day_cents: number;
          tariff_type: string;
          usage_rate_cents_flat?: number | null;
          usage_rate_cents_offpeak?: number | null;
          usage_rate_cents_peak?: number | null;
          usage_rate_cents_shoulder?: number | null;
        };
        Update: {
          controlled_load_cents?: number | null;
          customer_type?: string;
          distributor?: string;
          effective_from?: string;
          effective_to?: string | null;
          features?: Json | null;
          fuel_type?: string;
          id?: string;
          included_postcodes?: string[] | null;
          is_market_offer?: boolean;
          last_synced_at?: string;
          plan_id?: string;
          plan_name?: string;
          raw_data?: Json | null;
          retailer_id?: string;
          retailer_name?: string;
          solar_fit_cents?: number | null;
          state?: string;
          supply_charge_per_day_cents?: number;
          tariff_type?: string;
          usage_rate_cents_flat?: number | null;
          usage_rate_cents_offpeak?: number | null;
          usage_rate_cents_peak?: number | null;
          usage_rate_cents_shoulder?: number | null;
        };
        Relationships: [];
      };
      scrape_runs: {
        Row: {
          duration_ms: number | null;
          errors_count: number | null;
          id: string;
          postcodes_processed: number | null;
          prices_updated: number | null;
          results: Json | null;
          run_at: string;
          scraper_name: string | null;
        };
        Insert: {
          duration_ms?: number | null;
          errors_count?: number | null;
          id?: string;
          postcodes_processed?: number | null;
          prices_updated?: number | null;
          results?: Json | null;
          run_at?: string;
          scraper_name?: string | null;
        };
        Update: {
          duration_ms?: number | null;
          errors_count?: number | null;
          id?: string;
          postcodes_processed?: number | null;
          prices_updated?: number | null;
          results?: Json | null;
          run_at?: string;
          scraper_name?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      increment_fairbills_stats: {
        Args: { saving_cents: number };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

// --- FairBills domain aliases ---------------------------------------------
export type TariffType = "flat" | "time_of_use" | "controlled_load";
export type Distributor = "Ausgrid" | "Endeavour Energy" | "Essential Energy";
export type PlanRow = Tables<"plans">;
export type PlanInsert = TablesInsert<"plans">;
export type BillSubmissionRow = Tables<"bill_submissions">;
export type EmailFollowupRow = Tables<"email_followups">;
export type FairbillsStatsRow = Tables<"fairbills_stats">;
export type LpgSupplierRow = Tables<"lpg_suppliers">;
export type LpgPriceRow = Tables<"lpg_prices">;
export type LpgBottleSize = 9 | 45;
