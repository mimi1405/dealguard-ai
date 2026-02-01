/*
  # Dealguard AI - Complete Schema Refactor

  ## Overview
  This migration creates the complete Dealguard data model for AI-powered due diligence.
  The schema is designed for single-user initially but prepared for multi-tenant expansion.

  ## Tables Created

  1. **deals** - Core deal/project entity
     - Tracks deal metadata, type, industry, stage, status
     - Links to all analysis artifacts

  2. **documents** - Document metadata store
     - Tracks uploaded files and extraction status
     - Links to Supabase Storage paths

  3. **extracted_texts** - Full extracted text from documents
     - One-to-one with documents
     - Stores raw extraction output

  4. **chunks** - Document chunks for processing
     - Breaks documents into processable segments
     - Tracks page ranges and token estimates

  5. **facts** - Atomic facts extracted by AI
     - Individual insights with evidence
     - Links to source chunks and documents

  6. **canonical_facts** - Merged truth layer
     - Consolidated facts per topic
     - Tracks multiple sources and confidence

  7. **dd_runs** - Workflow execution tracking
     - Tracks n8n workflow executions
     - Captures input snapshots and results

  8. **deal_scores** - Final analysis scores
     - Overall grade and score
     - Category-level breakdowns

  ## Security
  - RLS enabled on all tables
  - Single-user policies (authenticated users have full access)
  - Ready for workspace_id column addition later

  ## Indexes
  - Optimized for deal-centric queries
  - Fast lookups for documents, facts, and scores
*/

-- =====================================================
-- DROP EXISTING SCHEMA (clean slate)
-- =====================================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS deal_scores CASCADE;
DROP TABLE IF EXISTS dd_runs CASCADE;
DROP TABLE IF EXISTS canonical_facts CASCADE;
DROP TABLE IF EXISTS facts CASCADE;
DROP TABLE IF EXISTS chunks CASCADE;
DROP TABLE IF EXISTS extracted_texts CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS deals CASCADE;

-- Drop existing types
DROP TYPE IF EXISTS deal_type CASCADE;
DROP TYPE IF EXISTS transaction_volume_range CASCADE;
DROP TYPE IF EXISTS deal_stage CASCADE;
DROP TYPE IF EXISTS confidentiality_level CASCADE;
DROP TYPE IF EXISTS deal_status CASCADE;
DROP TYPE IF EXISTS document_type CASCADE;
DROP TYPE IF EXISTS document_status CASCADE;
DROP TYPE IF EXISTS extraction_method CASCADE;
DROP TYPE IF EXISTS fact_type CASCADE;
DROP TYPE IF EXISTS run_status CASCADE;
DROP TYPE IF EXISTS score_grade CASCADE;

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE deal_type AS ENUM (
  'startup_equity',
  'm_a',
  'real_estate',
  'debt_financing',
  'vendor_dd',
  'international_investment_review'
);

CREATE TYPE transaction_volume_range AS ENUM (
  'lt_1m',
  'm1_5',
  'm5_20',
  'm20_100',
  'gt_100'
);

CREATE TYPE deal_stage AS ENUM (
  'pre_seed',
  'seed',
  'series_a',
  'series_b_plus',
  'major'
);

CREATE TYPE confidentiality_level AS ENUM (
  'low',
  'medium',
  'high'
);

CREATE TYPE deal_status AS ENUM (
  'pending',
  'running',
  'completed',
  'failed'
);

CREATE TYPE document_type AS ENUM (
  'pitchdeck',
  'financials',
  'legal',
  'cap_table',
  'contracts',
  'other'
);

CREATE TYPE document_status AS ENUM (
  'uploaded',
  'extracting',
  'extracted',
  'failed'
);

CREATE TYPE extraction_method AS ENUM (
  'pdf_text',
  'ocr',
  'hybrid'
);

CREATE TYPE fact_type AS ENUM (
  'company',
  'founder',
  'key_point',
  'risk',
  'financial_metric',
  'legal_issue',
  'market',
  'traction',
  'cap_table_item'
);

CREATE TYPE run_status AS ENUM (
  'queued',
  'running',
  'completed',
  'failed'
);

CREATE TYPE score_grade AS ENUM (
  'a',
  'b',
  'c',
  'd',
  'e'
);

-- =====================================================
-- TABLES
-- =====================================================

-- 1) DEALS TABLE
CREATE TABLE deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  name text NOT NULL,
  deal_type deal_type NOT NULL,
  industry text,
  jurisdiction text,
  transaction_volume_range transaction_volume_range,
  stage deal_stage,
  confidentiality_level confidentiality_level DEFAULT 'medium',
  status deal_status DEFAULT 'pending' NOT NULL,
  last_run_id uuid,
  notes text,
  workspace_id uuid
);

-- 2) DOCUMENTS TABLE
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  doc_type document_type NOT NULL,
  title text,
  original_filename text NOT NULL,
  storage_bucket text NOT NULL DEFAULT 'dealguard-docs',
  storage_path text NOT NULL,
  mime_type text,
  size_bytes bigint NOT NULL DEFAULT 0,
  sha256 text,
  status document_status DEFAULT 'uploaded' NOT NULL,
  extracted_text_id uuid,
  workspace_id uuid
);

-- 3) EXTRACTED_TEXTS TABLE
CREATE TABLE extracted_texts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  document_id uuid UNIQUE NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  text text NOT NULL,
  language text,
  extraction_method extraction_method DEFAULT 'pdf_text',
  extraction_warnings jsonb DEFAULT '[]'::jsonb
);

-- 4) CHUNKS TABLE
CREATE TABLE chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  extracted_text_id uuid NOT NULL REFERENCES extracted_texts(id) ON DELETE CASCADE,
  chunk_index int NOT NULL,
  page_start int,
  page_end int,
  text text NOT NULL,
  token_estimate int,
  UNIQUE(document_id, chunk_index)
);

-- 5) FACTS TABLE
CREATE TABLE facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  fact_type fact_type NOT NULL,
  topic text NOT NULL,
  value_json jsonb NOT NULL,
  confidence numeric NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  evidence_chunk_ids uuid[] NOT NULL DEFAULT '{}',
  source_document_ids uuid[] NOT NULL DEFAULT '{}',
  created_by_run_id uuid
);

-- 6) CANONICAL_FACTS TABLE
CREATE TABLE canonical_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  topic text NOT NULL,
  merged_value jsonb NOT NULL,
  confidence numeric NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  UNIQUE(deal_id, topic)
);

-- 7) DD_RUNS TABLE
CREATE TABLE dd_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  started_at timestamptz DEFAULT now() NOT NULL,
  finished_at timestamptz,
  status run_status DEFAULT 'queued' NOT NULL,
  error_message text,
  n8n_execution_id text,
  triggered_by text,
  input_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- 8) DEAL_SCORES TABLE
CREATE TABLE deal_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  run_id uuid NOT NULL REFERENCES dd_runs(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  overall_score int NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  grade score_grade NOT NULL,
  category_scores jsonb NOT NULL DEFAULT '[]'::jsonb,
  UNIQUE(run_id)
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_deals_status ON deals(status);
CREATE INDEX idx_deals_updated_at ON deals(updated_at DESC);
CREATE INDEX idx_deals_workspace ON deals(workspace_id) WHERE workspace_id IS NOT NULL;

CREATE INDEX idx_documents_deal_id ON documents(deal_id);
CREATE INDEX idx_documents_deal_type ON documents(deal_id, doc_type);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_sha256 ON documents(sha256) WHERE sha256 IS NOT NULL;

CREATE INDEX idx_extracted_texts_document_id ON extracted_texts(document_id);

CREATE INDEX idx_chunks_document_id ON chunks(document_id);
CREATE INDEX idx_chunks_extracted_text_id ON chunks(extracted_text_id);
CREATE INDEX idx_chunks_document_chunk ON chunks(document_id, chunk_index);

CREATE INDEX idx_facts_deal_id ON facts(deal_id);
CREATE INDEX idx_facts_deal_topic ON facts(deal_id, topic);
CREATE INDEX idx_facts_type ON facts(fact_type);
CREATE INDEX idx_facts_run_id ON facts(created_by_run_id) WHERE created_by_run_id IS NOT NULL;

CREATE INDEX idx_canonical_facts_deal_id ON canonical_facts(deal_id);
CREATE INDEX idx_canonical_facts_deal_topic ON canonical_facts(deal_id, topic);

CREATE INDEX idx_dd_runs_deal_id ON dd_runs(deal_id);
CREATE INDEX idx_dd_runs_deal_started ON dd_runs(deal_id, started_at DESC);
CREATE INDEX idx_dd_runs_status ON dd_runs(status);

CREATE INDEX idx_deal_scores_deal_id ON deal_scores(deal_id);
CREATE INDEX idx_deal_scores_deal_created ON deal_scores(deal_id, created_at DESC);
CREATE INDEX idx_deal_scores_run_id ON deal_scores(run_id);

-- =====================================================
-- FOREIGN KEY CONSTRAINTS (add after tables created)
-- =====================================================

-- Add FK from documents.extracted_text_id to extracted_texts
ALTER TABLE documents ADD CONSTRAINT fk_documents_extracted_text
  FOREIGN KEY (extracted_text_id) REFERENCES extracted_texts(id) ON DELETE SET NULL;

-- Add FK from deals.last_run_id to dd_runs
ALTER TABLE deals ADD CONSTRAINT fk_deals_last_run
  FOREIGN KEY (last_run_id) REFERENCES dd_runs(id) ON DELETE SET NULL;

-- Add FK from facts.created_by_run_id to dd_runs
ALTER TABLE facts ADD CONSTRAINT fk_facts_run
  FOREIGN KEY (created_by_run_id) REFERENCES dd_runs(id) ON DELETE SET NULL;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_texts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE dd_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_scores ENABLE ROW LEVEL SECURITY;

-- Single-user policies (authenticated users have full access)

-- DEALS policies
CREATE POLICY "Authenticated users can view all deals"
  ON deals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert deals"
  ON deals FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update deals"
  ON deals FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete deals"
  ON deals FOR DELETE
  TO authenticated
  USING (true);

-- DOCUMENTS policies
CREATE POLICY "Authenticated users can view all documents"
  ON documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete documents"
  ON documents FOR DELETE
  TO authenticated
  USING (true);

-- EXTRACTED_TEXTS policies
CREATE POLICY "Authenticated users can view all extracted texts"
  ON extracted_texts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert extracted texts"
  ON extracted_texts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update extracted texts"
  ON extracted_texts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete extracted texts"
  ON extracted_texts FOR DELETE
  TO authenticated
  USING (true);

-- CHUNKS policies
CREATE POLICY "Authenticated users can view all chunks"
  ON chunks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert chunks"
  ON chunks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update chunks"
  ON chunks FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete chunks"
  ON chunks FOR DELETE
  TO authenticated
  USING (true);

-- FACTS policies
CREATE POLICY "Authenticated users can view all facts"
  ON facts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert facts"
  ON facts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update facts"
  ON facts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete facts"
  ON facts FOR DELETE
  TO authenticated
  USING (true);

-- CANONICAL_FACTS policies
CREATE POLICY "Authenticated users can view all canonical facts"
  ON canonical_facts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert canonical facts"
  ON canonical_facts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update canonical facts"
  ON canonical_facts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete canonical facts"
  ON canonical_facts FOR DELETE
  TO authenticated
  USING (true);

-- DD_RUNS policies
CREATE POLICY "Authenticated users can view all dd runs"
  ON dd_runs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert dd runs"
  ON dd_runs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update dd runs"
  ON dd_runs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete dd runs"
  ON dd_runs FOR DELETE
  TO authenticated
  USING (true);

-- DEAL_SCORES policies
CREATE POLICY "Authenticated users can view all deal scores"
  ON deal_scores FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert deal scores"
  ON deal_scores FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update deal scores"
  ON deal_scores FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete deal scores"
  ON deal_scores FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- STORAGE BUCKET SETUP
-- =====================================================

-- Create storage bucket for documents (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('dealguard-docs', 'dealguard-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for authenticated users
CREATE POLICY "Authenticated users can upload to dealguard-docs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'dealguard-docs');

CREATE POLICY "Authenticated users can read from dealguard-docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'dealguard-docs');

CREATE POLICY "Authenticated users can update in dealguard-docs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'dealguard-docs')
  WITH CHECK (bucket_id = 'dealguard-docs');

CREATE POLICY "Authenticated users can delete from dealguard-docs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'dealguard-docs');

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to update updated_at on deals
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_canonical_facts_updated_at
  BEFORE UPDATE ON canonical_facts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
