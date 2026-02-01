'use client';

import { useEffect, useState } from 'react';
import { FileText, Trash2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { Document, DOCUMENT_TYPE_LABELS, DOCUMENT_STATUS_LABELS } from '@/lib/types/database';

interface DocumentListProps {
  dealId: string;
  refresh: number;
}

export function DocumentList({ dealId, refresh }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchDocuments();
  }, [dealId, refresh]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (documentId: string, storagePath: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await supabase.storage
        .from('dealguard-docs')
        .remove([storagePath])
        .catch((err) => console.error('Failed to delete file from storage:', err));

      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'extracted':
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            {DOCUMENT_STATUS_LABELS[status as keyof typeof DOCUMENT_STATUS_LABELS] || status}
          </Badge>
        );
      case 'extracting':
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
            <Clock className="h-3 w-3 mr-1 animate-pulse" />
            {DOCUMENT_STATUS_LABELS[status as keyof typeof DOCUMENT_STATUS_LABELS] || status}
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
            <AlertCircle className="h-3 w-3 mr-1" />
            {DOCUMENT_STATUS_LABELS[status as keyof typeof DOCUMENT_STATUS_LABELS] || status}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {DOCUMENT_STATUS_LABELS[status as keyof typeof DOCUMENT_STATUS_LABELS] || status}
          </Badge>
        );
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading documents...</div>;
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
        <p>No documents uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center justify-between p-4 border border-border rounded-lg hover:border-primary/50 transition-colors"
        >
          <div className="flex items-center gap-4 flex-1">
            <FileText className="h-10 w-10 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {doc.title || doc.original_filename}
              </p>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="text-sm text-muted-foreground">
                  {DOCUMENT_TYPE_LABELS[doc.doc_type]}
                </span>
                <span className="text-sm text-muted-foreground">
                  {(doc.size_bytes / 1024 / 1024).toFixed(2)} MB
                </span>
                {getStatusBadge(doc.status)}
                {doc.extracted_text_id && (
                  <Badge variant="outline" className="text-xs">
                    Text Extracted
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(doc.id, doc.storage_path)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
