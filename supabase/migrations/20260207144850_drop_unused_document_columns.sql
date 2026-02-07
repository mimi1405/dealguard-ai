/*
  # Drop unused columns from documents table

  These columns are no longer needed since the application uses chunking
  instead of extracted text references.

  ## Removed columns
  - `title` (text, nullable) - not used
  - `extracted_text_id` (uuid, nullable) - replaced by chunking workflow
  - `workspace_id` (uuid, nullable) - not used

  ## Notes
  - No data loss risk: these columns were recently added and contain only NULLs
*/

ALTER TABLE documents DROP COLUMN IF EXISTS title;
ALTER TABLE documents DROP COLUMN IF EXISTS extracted_text_id;
ALTER TABLE documents DROP COLUMN IF EXISTS workspace_id;
