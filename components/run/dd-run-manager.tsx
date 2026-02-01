'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Play, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Deal, DDRun } from '@/lib/types/database';
import { formatDistanceToNow } from 'date-fns';

interface DDRunManagerProps {
  dealId: string;
  deal: Deal;
  onRunComplete: () => void;
}

export function DDRunManager({ dealId, deal, onRunComplete }: DDRunManagerProps) {
  const supabase = createClient();
  const [runs, setRuns] = useState<DDRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRuns();
    const interval = setInterval(fetchRuns, 5000);
    return () => clearInterval(interval);
  }, [dealId]);

  const fetchRuns = async () => {
    try {
      const { data, error } = await supabase
        .from('dd_runs')
        .select('*')
        .eq('deal_id', dealId)
        .order('started_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRuns(data || []);
    } catch (err: any) {
      console.error('Error fetching runs:', err);
    }
  };

  const handleTriggerRun = async () => {
    setError('');
    setLoading(true);

    try {
      const runId = crypto.randomUUID();
      const inputSnapshot = {
        name: deal.name,
        deal_type: deal.deal_type,
        industry: deal.industry,
        jurisdiction: deal.jurisdiction,
        stage: deal.stage,
        transaction_volume_range: deal.transaction_volume_range,
      };

      const { error: insertError } = await supabase.from('dd_runs').insert({
        id: runId,
        deal_id: dealId,
        status: 'queued',
        triggered_by: 'ui',
        input_snapshot: inputSnapshot,
      });

      if (insertError) throw insertError;

      const response = await fetch('/api/dd/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId, runId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to trigger run');
      }

      await fetchRuns();
      onRunComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to trigger due diligence run');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'running':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'failed':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const currentRun = runs.find(r => r.status === 'running');
  const queuedRun = runs.find(r => r.status === 'queued');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Trigger Due Diligence Analysis</CardTitle>
          <CardDescription>
            Start an AI-powered analysis workflow via n8n. The system will extract facts, analyze documents, and generate scores.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-4">
            <Button
              onClick={handleTriggerRun}
              disabled={loading || !!currentRun}
              size="lg"
            >
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Triggering...
                </>
              ) : currentRun ? (
                <>
                  <Clock className="mr-2 h-4 w-4" />
                  Run in Progress
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Run Due Diligence
                </>
              )}
            </Button>
            {currentRun && (
              <Badge variant="outline" className={getStatusColor(currentRun.status)}>
                {currentRun.status.toUpperCase()}
              </Badge>
            )}
          </div>

          {currentRun && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="text-sm space-y-2">
                <div>
                  <span className="text-muted-foreground">Started:</span>{' '}
                  <span className="font-medium">
                    {formatDistanceToNow(new Date(currentRun.started_at), { addSuffix: true })}
                  </span>
                </div>
                {currentRun.n8n_execution_id && (
                  <div>
                    <span className="text-muted-foreground">Execution ID:</span>{' '}
                    <span className="font-mono text-xs">{currentRun.n8n_execution_id}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Run History</CardTitle>
          <CardDescription>Previous due diligence runs for this deal</CardDescription>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No runs yet. Trigger your first analysis above.
            </div>
          ) : (
            <div className="space-y-3">
              {runs.map((run) => (
                <div key={run.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    {getStatusIcon(run.status)}
                    <div>
                      <div className="font-medium">
                        {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {run.finished_at
                          ? `Completed in ${Math.round(
                              (new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) / 1000
                            )}s`
                          : 'In progress...'}
                      </div>
                      {run.error_message && (
                        <div className="text-sm text-red-500 mt-1">{run.error_message}</div>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className={getStatusColor(run.status)}>
                    {run.status.toUpperCase()}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
