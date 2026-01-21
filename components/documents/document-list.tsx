'use client';

import { useEffect, useState } from 'react';
import { FileText, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';

interface Document {
  id: string;
  original_file_name: string;
  document_category: string;
  text_extract_status: string;
  text_size_bytes: number;
  original_size_bytes: number;
  created_at: string;
}

interface DocumentListProps {
  projectId: string;
  refresh: number;
}

export function DocumentList({ projectId, refresh }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchDocuments();
  }, [projectId, refresh]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
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
    const variants: Record<string, string> = {
      pending: 'bg-yellow-500',
      extracting: 'bg-blue-500',
      done: 'bg-green-500',
      error: 'bg-destructive',
      ready: 'bg-green-500',
    };

    return (
      <Badge className={variants[status] || 'bg-muted'}>
        {status}
      </Badge>
    );
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
              <p className="font-medium truncate">{doc.original_file_name}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-muted-foreground">{doc.document_category}</span>
                <span className="text-sm text-muted-foreground">
                  Text: {(doc.text_size_bytes / 1024).toFixed(0)} KB
                </span>
                {getStatusBadge(doc.text_extract_status)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(doc.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
