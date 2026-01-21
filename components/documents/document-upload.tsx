"use client";

import { useState, useCallback } from "react";
import { Upload, X, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import * as pdfjsLib from "pdfjs-dist";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";




const DOCUMENT_CATEGORIES = [
  'Pitch Deck',
  'Financials',
  'Legal',
  'Cap Table',
  'Contracts',
  'Other',
];

const MAX_TEXT_SIZE = 10 * 1024 * 1024;
const CHUNK_SIZE = 9 * 1024 * 1024;

interface DocumentUploadProps {
  projectId: string;
  onUploadComplete: () => void;
}

export function DocumentUpload({ projectId, onUploadComplete }: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const supabase = createClient();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      validateAndSetFile(files[0]);
    }
  }, []);

  const validateAndSetFile = (selectedFile: File) => {
    setError(null);

    if (selectedFile.type !== 'application/pdf') {
      setError('Only PDF files are allowed');
      return;
    }

    setFile(selectedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      validateAndSetFile(files[0]);
    }
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    setExtracting(true);
    setProgress(10);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;
      let fullText = '';

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n\n';

        setProgress(10 + (i / numPages) * 40);
      }

      const cleaned = fullText.replace(/\s+/g, " ").trim();

      // Wenn quasi gar nichts da ist: echte "kein Text" Situation
      if (cleaned.length < 10) {
        throw new Error("Kein Text-Layer gefunden. PDF wirkt gescannt/als Bilder. Bitte OCR-PDF hochladen.");
      }
      
      // Wenn wenig Text da ist: trotzdem erlauben, aber warnen (kein harter Stop)
      if (cleaned.length < 100) {
        // Optional: nur Warning anzeigen statt throw
        console.warn("Low extracted text length:", cleaned.length);
      }


      return fullText;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to extract text from PDF');
    } finally {
      setExtracting(false);
    }
  };

  const chunkText = (text: string): string[] => {
    const textSize = new Blob([text]).size;

    if (textSize <= MAX_TEXT_SIZE) {
      return [text];
    }

    const chunks: string[] = [];
    const encoder = new TextEncoder();
    const lines = text.split('\n');
    let currentChunk = '';

    for (const line of lines) {
      const testChunk = currentChunk + line + '\n';
      const size = encoder.encode(testChunk).length;

      if (size > CHUNK_SIZE) {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        currentChunk = line + '\n';
      } else {
        currentChunk = testChunk;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  };

  const uploadToStorage = async (userId: string, documentId: string, textChunks: string[]) => {
    setProgress(60);
    const textFilePaths: string[] = [];

    for (let i = 0; i < textChunks.length; i++) {
      const fileName = textChunks.length === 1
        ? 'extracted.txt'
        : `extracted_part_${i + 1}.txt`;

      const filePath = `${userId}/${projectId}/${documentId}/${fileName}`;
      const textBlob = new Blob([textChunks[i]], { type: 'text/plain' });

      const { error: uploadError } = await supabase.storage
        .from('dealguard-docs')
        .upload(filePath, textBlob, {
          contentType: 'text/plain',
          upsert: false,
        });

      if (uploadError) throw uploadError;
      textFilePaths.push(filePath);

      setProgress(60 + ((i + 1) / textChunks.length) * 30);
    }

    return textFilePaths;
  };

  const handleUpload = async () => {
    if (!file || !category) {
      setError('Please select a file and category');
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const extractedText = await extractTextFromPDF(file);

      const textChunks = chunkText(extractedText);
      const textSize = textChunks.reduce((sum, chunk) => sum + new Blob([chunk]).size, 0);

      const documentId = crypto.randomUUID();

      const textFilePaths = await uploadToStorage(user.id, documentId, textChunks);

      setProgress(95);

      const documentData: any = {
        id: documentId,
        project_id: projectId,
        owner_id: user.id,
        original_file_name: file.name,
        original_pdf_path: '',
        original_size_bytes: file.size,
        text_file_paths: textFilePaths,
        text_size_bytes: textSize,
        text_extract_status: 'done',
        document_category: category,
        status: 'ready',
      };

      const { error: dbError } = await supabase
        .from('documents')
        .insert(documentData);

      if (dbError) throw dbError;

      setProgress(100);
      setFile(null);
      setCategory('');
      onUploadComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-primary bg-primary/10'
              : 'border-border hover:border-primary/50'
          } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <div className="space-y-2">
            <p className="text-lg font-medium">
              {file ? file.name : 'Drop PDF here or click to browse'}
            </p>
            <p className="text-sm text-muted-foreground">
              Only PDF files are supported
            </p>
          </div>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
            disabled={uploading}
          />
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => document.getElementById('file-upload')?.click()}
            disabled={uploading}
          >
            <FileText className="mr-2 h-4 w-4" />
            Browse Files
          </Button>
        </div>

        {file && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFile(null)}
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Document Category</Label>
              <Select value={category} onValueChange={setCategory} disabled={uploading}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>
                    {extracting
                      ? 'Extracting text...'
                      : progress < 60
                      ? 'Processing...'
                      : progress < 95
                      ? 'Uploading...'
                      : 'Saving...'}
                  </span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={uploading || !category}
              className="w-full"
            >
              {uploading ? 'Uploading...' : 'Upload Document'}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
