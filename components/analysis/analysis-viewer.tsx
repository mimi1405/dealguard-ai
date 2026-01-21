'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, RefreshCw, AlertCircle } from 'lucide-react';

interface AnalysisViewerProps {
  projectId: string;
}

export function AnalysisViewer({ projectId }: AnalysisViewerProps) {
  const [status, setStatus] = useState<string>('not_started');
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      if (status === 'running') {
        fetchStatus();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [projectId, status]);

  const fetchStatus = async () => {
    try {
      const response = await fetch(`/api/analysis/status?projectId=${projectId}`);
      const data = await response.json();

      if (response.ok) {
        setStatus(data.status);
        setAnalysis(data.analysis);
      }
    } catch (err) {
      console.error('Error fetching status:', err);
    } finally {
      setLoading(false);
    }
  };

  const triggerAnalysis = async () => {
    setTriggering(true);
    setError(null);

    try {
      const response = await fetch('/api/analysis/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to trigger analysis');
      }

      setStatus(data.status);
      fetchStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTriggering(false);
    }
  };

  const getStatusBadge = () => {
    const variants: Record<string, { className: string; label: string }> = {
      not_started: { className: 'bg-muted', label: 'Not Started' },
      running: { className: 'bg-blue-500', label: 'Running' },
      completed: { className: 'bg-green-500', label: 'Completed' },
      failed: { className: 'bg-destructive', label: 'Failed' },
    };

    const config = variants[status] || variants.not_started;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>AI Analysis</CardTitle>
              <CardDescription>Automated due diligence powered by AI</CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent>
          {status === 'not_started' && (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No analysis has been run yet. Make sure you have uploaded documents and
                completed the questionnaire before starting.
              </p>
              <Button onClick={triggerAnalysis} disabled={triggering} size="lg">
                <Play className="mr-2 h-5 w-5" />
                {triggering ? 'Starting Analysis...' : 'Run AI Analysis'}
              </Button>
            </div>
          )}

          {status === 'running' && (
            <div className="text-center py-8">
              <RefreshCw className="mx-auto h-12 w-12 text-primary animate-spin mb-4" />
              <p className="text-lg font-medium mb-2">Analysis in Progress</p>
              <p className="text-muted-foreground">
                AI is analyzing your documents. This may take a few minutes...
              </p>
            </div>
          )}

          {status === 'completed' && analysis?.result_json && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Analysis Results</h3>
                <Button onClick={triggerAnalysis} disabled={triggering} variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Run Again
                </Button>
              </div>
              <div className="bg-muted p-4 rounded-lg overflow-auto max-h-[600px]">
                <pre className="text-sm whitespace-pre-wrap">
                  {JSON.stringify(analysis.result_json, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {status === 'failed' && (
            <div className="text-center py-8">
              <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
              <p className="text-lg font-medium mb-2">Analysis Failed</p>
              <p className="text-muted-foreground mb-4">
                {analysis?.error_message || 'An error occurred during analysis'}
              </p>
              <Button onClick={triggerAnalysis} disabled={triggering} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md mt-4">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
