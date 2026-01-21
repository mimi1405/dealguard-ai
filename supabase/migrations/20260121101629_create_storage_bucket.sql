/*
  # Create Storage Bucket for Documents
  
  1. New Storage Bucket
    - `dealguard-docs` (private bucket)
    
  2. Security
    - RLS policies for bucket access
    - Users can only access their own documents
    
  3. Structure
    - userId/projectId/documentId/extracted.txt
    - userId/projectId/documentId/original.pdf (optional)
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('dealguard-docs', 'dealguard-docs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload their own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'dealguard-docs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read their own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'dealguard-docs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'dealguard-docs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);