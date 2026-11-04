export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      assessments: {
        Row: {
          assessed_on: string;
          created_at: string;
          game_id: string;
          id: string;
          overall: number;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          assessed_on?: string;
          created_at?: string;
          game_id: string;
          id?: string;
          overall: number;
          user_id?: string;
        };
        Update: {
          assessed_on?: string;
          created_at?: string;
          game_id?: string;
          id?: string;
          overall?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assessments_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
        ];
      };
      collection_entries: {
        Row: {
          acquired_on: string | null;
          archived_at: string | null;
          created_at: string;
          currency: string | null;
          edition_id: string | null;
          game_id: string;
          id: string;
          notes: string | null;
          price: number | null;
          sold_on: string | null;
          source: string | null;
          status: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          acquired_on?: string | null;
          archived_at?: string | null;
          created_at?: string;
          currency?: string | null;
          edition_id?: string | null;
          game_id: string;
          id?: string;
          notes?: string | null;
          price?: number | null;
          sold_on?: string | null;
          source?: string | null;
          status: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          acquired_on?: string | null;
          archived_at?: string | null;
          created_at?: string;
          currency?: string | null;
          edition_id?: string | null;
          game_id?: string;
          id?: string;
          notes?: string | null;
          price?: number | null;
          sold_on?: string | null;
          source?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "collection_entries_edition_id_game_id_fkey";
            columns: ["edition_id", "game_id"];
            isOneToOne: false;
            referencedRelation: "game_editions";
            referencedColumns: ["id", "game_id"];
          },
          {
            foreignKeyName: "collection_entries_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
        ];
      };
      collection_status_changes: {
        Row: {
          changed_on: string;
          entry_id: string;
          from_status: string | null;
          id: string;
          recorded_at: string;
          to_status: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          changed_on: string;
          entry_id: string;
          from_status?: string | null;
          id?: string;
          recorded_at?: string;
          to_status: string;
          user_id: string;
        };
        Update: {
          changed_on?: string;
          entry_id?: string;
          from_status?: string | null;
          id?: string;
          recorded_at?: string;
          to_status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "collection_status_changes_entry_id_fkey";
            columns: ["entry_id"];
            isOneToOne: false;
            referencedRelation: "collection_entries";
            referencedColumns: ["id"];
          },
        ];
      };
      game_editions: {
        Row: {
          created_at: string;
          external_id: string | null;
          game_id: string;
          id: string;
          language: string | null;
          name: string;
          publisher: string | null;
          source: string;
          updated_at: string;
          year: number | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          external_id?: string | null;
          game_id: string;
          id?: string;
          language?: string | null;
          name: string;
          publisher?: string | null;
          source?: string;
          updated_at?: string;
          year?: number | null;
        };
        Update: {
          created_at?: string;
          external_id?: string | null;
          game_id?: string;
          id?: string;
          language?: string | null;
          name?: string;
          publisher?: string | null;
          source?: string;
          updated_at?: string;
          year?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "game_editions_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
        ];
      };
      game_images: {
        Row: {
          accent_color: string | null;
          attribution: string | null;
          created_at: string;
          dominant_color: string | null;
          edition_id: string | null;
          game_id: string;
          height: number | null;
          id: string;
          kind: string;
          licence: string | null;
          storage_path: string | null;
          url: string | null;
          width: number | null;
        };
        ComputedFields: never;
        Insert: {
          accent_color?: string | null;
          attribution?: string | null;
          created_at?: string;
          dominant_color?: string | null;
          edition_id?: string | null;
          game_id: string;
          height?: number | null;
          id?: string;
          kind?: string;
          licence?: string | null;
          storage_path?: string | null;
          url?: string | null;
          width?: number | null;
        };
        Update: {
          accent_color?: string | null;
          attribution?: string | null;
          created_at?: string;
          dominant_color?: string | null;
          edition_id?: string | null;
          game_id?: string;
          height?: number | null;
          id?: string;
          kind?: string;
          licence?: string | null;
          storage_path?: string | null;
          url?: string | null;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "game_images_edition_id_game_id_fkey";
            columns: ["edition_id", "game_id"];
            isOneToOne: false;
            referencedRelation: "game_editions";
            referencedColumns: ["id", "game_id"];
          },
          {
            foreignKeyName: "game_images_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
        ];
      };
      games: {
        Row: {
          attribution: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          external_id: string | null;
          fetched_at: string | null;
          id: string;
          kind: string;
          max_players: number | null;
          min_players: number | null;
          name: string;
          play_time_min: number | null;
          sort_name: string | null;
          source: string;
          source_url: string | null;
          updated_at: string;
          visibility: string;
          weight: number | null;
          year: number | null;
        };
        ComputedFields: never;
        Insert: {
          attribution?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          external_id?: string | null;
          fetched_at?: string | null;
          id?: string;
          kind?: string;
          max_players?: number | null;
          min_players?: number | null;
          name: string;
          play_time_min?: number | null;
          sort_name?: string | null;
          source: string;
          source_url?: string | null;
          updated_at?: string;
          visibility?: string;
          weight?: number | null;
          year?: number | null;
        };
        Update: {
          attribution?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          external_id?: string | null;
          fetched_at?: string | null;
          id?: string;
          kind?: string;
          max_players?: number | null;
          min_players?: number | null;
          name?: string;
          play_time_min?: number | null;
          sort_name?: string | null;
          source?: string;
          source_url?: string | null;
          updated_at?: string;
          visibility?: string;
          weight?: number | null;
          year?: number | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          preferences: NonNullable<Json>;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          display_name?: string | null;
          preferences?: NonNullable<Json>;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          preferences?: NonNullable<Json>;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      current_ratings: {
        Row: {
          assessed_on: string;
          assessment_id: string;
          created_at: string;
          game_id: string;
          overall: number;
          user_id: string;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "assessments_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      add_assessment: {
        Args: { p_assessed_on?: string; p_game_id: string; p_overall: number };
        Returns: string;
      };
      add_game_copy: {
        Args: { p_added_on?: string; p_game_id: string; p_status: string };
        Returns: string;
      };
      add_manual_game: {
        Args: { p_added_on?: string; p_status: string; p_title: string };
        Returns: string;
      };
      archive_entry: { Args: { p_entry_id: string }; Returns: boolean };
      change_entry_status: {
        Args: { p_changed_on?: string; p_entry_id: string; p_status: string };
        Returns: string;
      };
      delete_entry: { Args: { p_entry_id: string }; Returns: Json };
      restore_entry: { Args: { p_entry_id: string }; Returns: boolean };
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

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
