/*
  # Align documents table with frontend schema

  The live `documents` table is out of sync with the application code.
  This migration adds missing columns and renames mismatched ones so
  the frontend insert/select queries work correctly.

  ## Changes

  1. Rename `file_name` -> `original_filename`
  2. Rename `file_sha256` -> `sha256`
  3. Add `storage_bucket` (text, default 'dealguard-docs')
  4. Add `size_bytes` (bigint, default 0)
  5. Add `title` (text, nullable)
  6. Add `extracted_text_id` (uuid, nullable)
  7. Add `workspace_id` (uuid, nullable)

  ## Notes
  - Existing columns `page_count` and `error_message` are preserved (no data loss)
  - No rows are deleted or modified
*/

-- 1) Rename file_name -> original_filename
ALTER TABLE documents RENAME COLUMN file_name TO original_filename;

-- 2) Rename file_sha256 -> sha256
ALTER TABLE documents RENAME COLUMN file_sha256 TO sha256;

-- 3) Add storage_bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'storage_bucket'
  ) THEN
    ALTER TABLE documents ADD COLUMN storage_bucket text NOT NULL DEFAULT 'dealguard-docs';
  END IF;
END $$;

-- 4) Add size_bytes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'size_bytes'
  ) THEN
    ALTER TABLE documents ADD COLUMN size_bytes bigint NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 5) Add title
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'title'
  ) THEN
    ALTER TABLE documents ADD COLUMN title text;
  END IF;
END $$;

-- 6) Add extracted_text_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'extracted_text_id'
  ) THEN
    ALTER TABLE documents ADD COLUMN extracted_text_id uuid;
  END IF;
END $$;

-- 7) Add workspace_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE documents ADD COLUMN workspace_id uuid;
  END IF;
END $$;
