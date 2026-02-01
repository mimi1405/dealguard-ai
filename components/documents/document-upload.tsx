"use client";

import { useState, useCallback } from "react";
import { Upload, X, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const DOCUMENT_CATEGORIES = [
  "Pitch Deck",
  "Financials",
  "Legal",
  "Cap Table",
  "Contracts",
  "Other",
];

interface DocumentUploadProps {
  projectId: string;
  onUploadComplete: () => void;
}

export function DocumentUpload({ projectId, onUploadComplete }: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const supabase = createClient();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const validateAndSetFile = (selectedFile: File) => {
    setError(null);

    if (selectedFile.type !== "application/pdf") {
      setError("Only PDF files are allowed");
      return;
    }

    setFile(selectedFile);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const files = e.dataTransfer.files;
      if (files && files[0]) {
        validateAndSetFile(files[0]);
      }
    },
    []
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      validateAndSetFile(files[0]);
    }
  };

  const uploadOriginalPdf = async (userId: string, documentId: string, file: File) => {
    // Path-Pattern frei wählbar – wichtig ist: konsistent & wiederauffindbar für n8n
    const pdfPath = `${userId}/${projectId}/${documentId}/original.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("dealguard-docs")
      .upload(pdfPath, file, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) throw uploadError;
    return pdfPath;
  };

  const handleUpload = async () => {
    if (!file || !category) {
      setError("Please select a file and category");
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Not authenticated");

      const documentId = crypto.randomUUID();

      // 1) Upload PDF to Storage (source of truth)
      setProgress(15);
      const pdfPath = await uploadOriginalPdf(user.id, documentId, file);
      setProgress(65);

      // 2) Insert DB row (processing later by n8n)
      // Wichtig: wir behalten deine alten Felder bei, füllen sie aber sauber.
      const documentData: any = {
        id: documentId,
        project_id: projectId,
        owner_id: user.id,

        original_file_name: file.name,
        original_pdf_path: pdfPath,
        original_size_bytes: file.size,

        // ALT: bisher hast du extracted text in storage geschrieben – jetzt nicht mehr.
        text_file_paths: [],
        text_size_bytes: 0,

        // Statusfelder: jetzt ist der Doc "uploaded" und wartet auf n8n processing.
        text_extract_status: "uploaded", // oder "queued"
        status: "uploaded",

        document_category: category,
      };

      setProgress(85);

      const { error: dbError } = await supabase.from("documents").insert(documentData);
      if (dbError) throw dbError;

      setProgress(100);

      // Reset
      setFile(null);
      setCategory("");
      onUploadComplete();
    } catch (err: any) {
      setError(err?.message ?? "Failed to upload document");
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 800);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
          } ${uploading ? "opacity-50 pointer-events-none" : ""}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <div className="space-y-2">
            <p className="text-lg font-medium">
              {file ? file.name : "Drop PDF here or click to browse"}
            </p>
            <p className="text-sm text-muted-foreground">Only PDF files are supported</p>
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
            onClick={() => document.getElementById("file-upload")?.click()}
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
                    {progress < 20
                      ? "Preparing..."
                      : progress < 70
                      ? "Uploading PDF..."
                      : progress < 90
                      ? "Saving metadata..."
                      : "Finalizing..."}
                  </span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            <Button onClick={handleUpload} disabled={uploading || !category} className="w-full">
              {uploading ? "Uploading..." : "Upload Document"}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}