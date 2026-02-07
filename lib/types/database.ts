export type DealType =
  | 'startup_equity'
  | 'm_a'
  | 'real_estate'
  | 'debt_financing'
  | 'vendor_dd'
  | 'international_investment_review';

export type TransactionVolumeRange =
  | 'lt_1m'
  | 'm1_5'
  | 'm5_20'
  | 'm20_100'
  | 'gt_100';

export type DealStage =
  | 'pre_seed'
  | 'seed'
  | 'series_a'
  | 'series_b_plus'
  | 'major';

export type ConfidentialityLevel = 'low' | 'medium' | 'high';

export type DealStatus = 'pending' | 'running' | 'completed' | 'failed';

export type DocumentType =
  | 'pitchdeck'
  | 'financials'
  | 'legal'
  | 'cap_table'
  | 'contracts'
  | 'other';

export type DocumentStatus =
  | 'uploaded'
  | 'extracting'
  | 'extracted'
  | 'failed';

export type ExtractionMethod = 'pdf_text' | 'ocr' | 'hybrid';

export type FactType =
  | 'company'
  | 'founder'
  | 'key_point'
  | 'risk'
  | 'financial_metric'
  | 'legal_issue'
  | 'market'
  | 'traction'
  | 'cap_table_item';

export type RunStatus = 'queued' | 'running' | 'completed' | 'failed';

export type ScoreGrade = 'a' | 'b' | 'c' | 'd' | 'e';

export interface Deal {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  deal_type: DealType;
  industry: string | null;
  jurisdiction: string | null;
  transaction_volume_range: TransactionVolumeRange | null;
  stage: DealStage | null;
  confidentiality_level: ConfidentialityLevel;
  status: DealStatus;
  last_run_id: string | null;
  notes: string | null;
  workspace_id: string | null;
}

export interface Document {
  id: string;
  created_at: string;
  deal_id: string;
  doc_type: DocumentType;
  original_filename: string;
  storage_bucket: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number;
  sha256: string | null;
  status: DocumentStatus;
}

export interface ExtractedText {
  id: string;
  created_at: string;
  document_id: string;
  text: string;
  language: string | null;
  extraction_method: ExtractionMethod;
  extraction_warnings: any[];
}

export interface Chunk {
  id: string;
  created_at: string;
  document_id: string;
  extracted_text_id: string;
  chunk_index: number;
  page_start: number | null;
  page_end: number | null;
  text: string;
  token_estimate: number | null;
}

export interface Fact {
  id: string;
  created_at: string;
  deal_id: string;
  fact_type: FactType;
  topic: string;
  value_json: any;
  confidence: number;
  evidence_chunk_ids: string[];
  source_document_ids: string[];
  created_by_run_id: string | null;
}

export interface CanonicalFact {
  id: string;
  created_at: string;
  updated_at: string;
  deal_id: string;
  topic: string;
  merged_value: any;
  confidence: number;
  sources: Array<{
    document_id: string;
    chunk_ids: string[];
    weight: number;
  }>;
}

export interface DDRun {
  id: string;
  deal_id: string;
  started_at: string;
  finished_at: string | null;
  status: RunStatus;
  error_message: string | null;
  n8n_execution_id: string | null;
  triggered_by: string | null;
  input_snapshot: any;
}

export interface DealScore {
  id: string;
  created_at: string;
  run_id: string;
  deal_id: string;
  overall_score: number;
  grade: ScoreGrade;
  category_scores: Array<{
    category: string;
    score: number;
    summary: string;
    key_risks: string[];
    key_strengths: string[];
  }>;
}

export const DEAL_TYPE_LABELS: Record<DealType, string> = {
  startup_equity: 'Startup Equity',
  m_a: 'M&A',
  real_estate: 'Real Estate',
  debt_financing: 'Debt Financing',
  vendor_dd: 'Vendor Due Diligence',
  international_investment_review: 'International Investment Review',
};

export const TRANSACTION_VOLUME_LABELS: Record<TransactionVolumeRange, string> = {
  lt_1m: '< €1M',
  m1_5: '€1M - €5M',
  m5_20: '€5M - €20M',
  m20_100: '€20M - €100M',
  gt_100: '> €100M',
};

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  pre_seed: 'Pre-Seed',
  seed: 'Seed',
  series_a: 'Series A',
  series_b_plus: 'Series B+',
  major: 'Major',
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  pitchdeck: 'Pitch Deck',
  financials: 'Financials',
  legal: 'Legal',
  cap_table: 'Cap Table',
  contracts: 'Contracts',
  other: 'Other',
};

export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  pending: 'Pending',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  uploaded: 'Uploaded',
  extracting: 'Extracting',
  extracted: 'Extracted',
  failed: 'Failed',
};

export const SCORE_GRADE_LABELS: Record<ScoreGrade, string> = {
  a: 'A - Excellent',
  b: 'B - Good',
  c: 'C - Average',
  d: 'D - Below Average',
  e: 'E - Poor',
};
