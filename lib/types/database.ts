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
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          owner_id: string;
          project_name: string;
          client_name: string;
          project_type: string;
          industry: string;
          jurisdiction: string;
          confidentiality_level: string;
          analysis_goal: string;
          transaction_volume_range: string | null;
          target_company_stage: string | null;
          notes_internal: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          project_name: string;
          client_name: string;
          project_type: string;
          industry: string;
          jurisdiction: string;
          confidentiality_level: string;
          analysis_goal: string;
          transaction_volume_range?: string | null;
          target_company_stage?: string | null;
          notes_internal?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          project_name?: string;
          client_name?: string;
          project_type?: string;
          industry?: string;
          jurisdiction?: string;
          confidentiality_level?: string;
          analysis_goal?: string;
          transaction_volume_range?: string | null;
          target_company_stage?: string | null;
          notes_internal?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      documents: {
        Row: {
          id: string;
          project_id: string;
          owner_id: string;
          original_file_name: string;
          original_pdf_path: string;
          original_size_bytes: number;
          text_file_paths: Json;
          text_size_bytes: number;
          text_extract_status: string;
          text_extract_error: string | null;
          document_category: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          owner_id: string;
          original_file_name: string;
          original_pdf_path: string;
          original_size_bytes: number;
          text_file_paths?: Json;
          text_size_bytes?: number;
          text_extract_status?: string;
          text_extract_error?: string | null;
          document_category: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          owner_id?: string;
          original_file_name?: string;
          original_pdf_path?: string;
          original_size_bytes?: number;
          text_file_paths?: Json;
          text_size_bytes?: number;
          text_extract_status?: string;
          text_extract_error?: string | null;
          document_category?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      questionnaires: {
        Row: {
          id: string;
          project_id: string;
          owner_id: string;
          investment_thesis: string;
          focus_areas: Json;
          key_risks: Json;
          red_flags_known: boolean;
          red_flags_description: string | null;
          special_instructions_for_ai: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          owner_id: string;
          investment_thesis: string;
          focus_areas?: Json;
          key_risks?: Json;
          red_flags_known?: boolean;
          red_flags_description?: string | null;
          special_instructions_for_ai?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          owner_id?: string;
          investment_thesis?: string;
          focus_areas?: Json;
          key_risks?: Json;
          red_flags_known?: boolean;
          red_flags_description?: string | null;
          special_instructions_for_ai?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      analyses: {
        Row: {
          id: string;
          project_id: string;
          owner_id: string;
          analysis_status: string;
          mindstudio_run_id: string | null;
          result_json: Json | null;
          error_message: string | null;
          created_at: string;
          completed_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          owner_id: string;
          analysis_status?: string;
          mindstudio_run_id?: string | null;
          result_json?: Json | null;
          error_message?: string | null;
          created_at?: string;
          completed_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          owner_id?: string;
          analysis_status?: string;
          mindstudio_run_id?: string | null;
          result_json?: Json | null;
          error_message?: string | null;
          created_at?: string;
          completed_at?: string | null;
          updated_at?: string;
        };
      };
    };
  };
}
