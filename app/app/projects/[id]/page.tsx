'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { MetaEditor } from '@/components/meta/meta-editor';
import { DocumentUpload } from '@/components/documents/document-upload';
import { DocumentList } from '@/components/documents/document-list';
import { DDRunManager } from '@/components/run/dd-run-manager';
import { ResultsViewer } from '@/components/results/results-viewer';
import { Deal, DEAL_TYPE_LABELS, DEAL_STATUS_LABELS } from '@/lib/types/database';

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const dealId = params.id as string;

  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [documentsRefresh, setDocumentsRefresh] = useState(0);

  useEffect(() => {
    fetchDeal();
  }, [dealId]);

  const fetchDeal = async () => {
    try {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('id', dealId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        router.push('/app/projects');
        return;
      }
      setDeal(data);
    } catch (error) {
      console.error('Error fetching deal:', error);
      router.push('/app/projects');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentUploadComplete = () => {
    setDocumentsRefresh(prev => prev + 1);
  };

  const handleRunComplete = () => {
    fetchDeal();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading deal...</div>
      </div>
    );
  }

  if (!deal) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-500';
      case 'running':
        return 'bg-blue-500/10 text-blue-500';
      case 'failed':
        return 'bg-red-500/10 text-red-500';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/app/projects">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Deals
          </Link>
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{deal.name}</h1>
            <p className="text-muted-foreground mt-2">
              {DEAL_TYPE_LABELS[deal.deal_type]}
              {deal.industry && ` • ${deal.industry}`}
            </p>
          </div>
          <Badge variant="outline" className={getStatusColor(deal.status)}>
            {DEAL_STATUS_LABELS[deal.status]}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="meta" className="space-y-6">
        <TabsList>
          <TabsTrigger value="meta">Meta</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="run">Run</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="meta">
          <MetaEditor
            dealId={dealId}
            initialData={deal}
            onUpdate={fetchDeal}
          />
        </TabsContent>

        <TabsContent value="documents">
          <div className="space-y-6">
            <DocumentUpload
              dealId={dealId}
              onUploadComplete={handleDocumentUploadComplete}
            />
            <DocumentList
              dealId={dealId}
              refresh={documentsRefresh}
            />
          </div>
        </TabsContent>

        <TabsContent value="run">
          <DDRunManager
            dealId={dealId}
            deal={deal}
            onRunComplete={handleRunComplete}
          />
        </TabsContent>

        <TabsContent value="results">
          <ResultsViewer dealId={dealId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
