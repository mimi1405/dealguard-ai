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
import { DocumentType } from "@/lib/types/database";

const DOCUMENT_CATEGORIES = [
  "Pitch Deck",
  "Financials",
  "Legal",
  "Cap Table",
  "Contracts",
  "Other",
];

const mapCategoryToDocType = (cat: string): DocumentType => {
  switch (cat) {
    case "Pitch Deck":
      return "pitchdeck";
    case "Financials":
      return "financials";
    case "Legal":
      return "legal";
    case "Cap Table":
      return "cap_table";
    case "Contracts":
      return "contracts";
    default:
      return "other";
  }
};

interface DocumentUploadProps {
  dealId: string;
  onUploadComplete: () => void;
}

export function DocumentUpload({ dealId, onUploadComplete }: DocumentUploadProps) {
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

  const handleUpload = async () => {
    if (!dealId) {
      setError("Error: Deal ID is missing. Cannot upload document.");
      return;
    }

    if (!file || !category) {
      setError("Please select a file and category");
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);

    let uploadedFilePath: string | null = null;

    try {
      const documentId = crypto.randomUUID();
      const storagePath = `deals/${dealId}/documents/${documentId}/original.pdf`;

      setProgress(10);

      const { error: uploadError } = await supabase.storage
        .from("dealguard-docs")
        .upload(storagePath, file, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) throw uploadError;
      uploadedFilePath = storagePath;

      setProgress(60);

      const documentData = {
        id: documentId,
        deal_id: dealId,
        doc_type: mapCategoryToDocType(category),
        original_filename: file.name,
        storage_bucket: "dealguard-docs",
        storage_path: storagePath,
        mime_type: file.type,
        size_bytes: file.size,
        status: "uploaded" as const,
      };

      setProgress(80);

      const { error: dbError } = await supabase.from("documents").insert(documentData);

if (dbError) {
  if (uploadedFilePath) {
    await supabase.storage
      .from("dealguard-docs")
      .remove([uploadedFilePath])
      .catch((cleanupErr) => {
        console.error("Failed to cleanup orphaned file:", cleanupErr);
      });
  }
  throw dbError;
}

      setProgress(90);

      const processRes = await fetch("/api/documents/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deal_id: dealId, document_id: documentId }),
      });

      if (!processRes.ok) {
        let msg = "Failed to start document processing";
        let code = "UNKNOWN";

        try {
          const data = await processRes.json();
          if (data?.error) msg = data.error;
          if (data?.code) code = data.code;
        } catch {
          msg = `Server error (${processRes.status})`;
        }

        console.error("[upload] Processing failed:", { status: processRes.status, code, msg });

        if (code === "TIMEOUT") {
          msg = "Document processing is taking too long. The upload succeeded, but it will be processed in the background.";
        }

        throw new Error(msg);
      }
      
      setProgress(100);
      
      setFile(null);
      setCategory("");
      onUploadComplete();

    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err?.message ?? "Failed to upload document");
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 800);
    }
  };

  if (!dealId) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 p-4 bg-destructive/10 text-destructive rounded-lg">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Cannot upload documents</p>
            <p className="text-sm">Deal ID is missing. Please refresh the page or contact support.</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive ? "border-white/40 bg-white/5" : "border-border hover:border-white/20"
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
                <FileText className="h-5 w-5 text-white/70" />
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