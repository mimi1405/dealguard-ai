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

export type AnalysisStatus = 'draft' | 'running' | 'completed' | 'failed';

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

export type RunStatus = 'queued' | 'running' | 'completed' | 'failed';

export type ScoreGrade = 'a' | 'b' | 'c' | 'd' | 'e';

export type CheckpointStatus = 'pending' | 'passed' | 'failed' | 'warning';

export interface Deal {
  id: string;
  title: string;
  client_name: string | null;
  deal_type: DealType;
  industry: string | null;
  jurisdiction: string | null;
  confidentiality: ConfidentialityLevel | null;
  transaction_volume_range: TransactionVolumeRange | null;
  target_stage: DealStage | null;
  thesis: string | null;
  analysis_status: AnalysisStatus;
  analysis_error: string | null;
  created_at: string;
  updated_at: string;
  website_url: string | null;
}

export interface Category {
  id: number;
  key: string;
  title: string;
  weight: number;
  sort_order: number;
}

export interface Checkpoint {
  id: string;
  category_id: number;
  code: string;
  text: string;
  sort_order: number;
}

export interface Document {
  id: string;
  deal_id: string;
  doc_type: DocumentType;
  original_filename: string;
  storage_path: string;
  mime_type: string | null;
  created_at: string;
  storage_bucket: string;
  size_bytes: number;
  status: DocumentStatus;
}

export interface Extraction {
  document_id: string;
  extractor: string;
  extractor_version: string | null;
  language: string | null;
  raw_text: string;
  meta: Record<string, any>;
  created_at: string;
}

export interface Chunk {
  id: string;
  deal_id: string;
  document_id: string;
  chunk_index: number;
  page_start: number | null;
  page_end: number | null;
  text: string;
  token_estimate: number | null;
  created_at: string;
}

export interface CategoryScore {
  deal_id: string;
  category_id: number;
  score: number;
  rationale: string;
  strengths: string[];
  risks: string[];
  created_at: string;
}

export interface CheckpointResult {
  id: string;
  deal_id: string;
  checkpoint_id: string;
  status: CheckpointStatus;
  confidence: number;
  rationale: string | null;
  value: Record<string, any>;
  created_at: string;
}

export interface CheckpointEvidence {
  id: string;
  deal_id: string;
  checkpoint_id: string;
  chunk_id: string;
  quote: string;
}

export interface DealScore {
  id: string;
  created_at: string;
  deal_id: string;
  overall_score: number;
  grade: ScoreGrade;
  category_scores: Record<string, any>;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
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

export const ANALYSIS_STATUS_LABELS: Record<AnalysisStatus, string> = {
  draft: 'Draft',
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
