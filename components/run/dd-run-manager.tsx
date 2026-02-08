// components/run/dd-run-manager.tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Play, Clock, CheckCircle, AlertCircle, RefreshCw, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Deal } from "@/lib/types/database";
import { formatDistanceToNow } from "date-fns";
import { AnalysisOverlay } from "../analysis/analysis-overlay";

interface DDRunManagerProps {
  dealId: string;
  deal: Deal;
  onRunComplete: () => void;
}

interface DealRun {
  id: string;
  deal_id: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  n8n_execution_id: string | null;
}

export function DDRunManager({ dealId, deal, onRunComplete }: DDRunManagerProps) {
  const supabase = createClient();
  const [runs, setRuns] = useState<DealRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [hasChunkedDoc, setHasChunkedDoc] = useState(false);
  const [checkingDocs, setCheckingDocs] = useState(true);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId]);

  const fetchState = async () => {
    try {
      // Deal status is the single source of truth for run state
      const { data, error } = await supabase
        .from("deals")
        .select("id, analysis_status, created_at, updated_at")
        .eq("id", dealId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const run: DealRun = {
          id: data.id,
          deal_id: dealId,
          status: data.analysis_status,
          started_at: data.updated_at,
          finished_at: data.analysis_status === "completed" ? data.updated_at : null,
          n8n_execution_id: null,
        };
        setRuns([run]);
      }

      setCheckingDocs(true);
      const { data: chunkedDoc, error: docErr } = await supabase
        .from("documents")
        .select("id")
        .eq("deal_id", dealId)
        .eq("status", "chunked")
        .limit(1)
        .maybeSingle();

      if (docErr) {
        console.error("Error checking chunked docs:", docErr);
        setHasChunkedDoc(false);
      } else {
        setHasChunkedDoc(!!chunkedDoc);
      }
    } catch (err: any) {
      console.error("Error fetching run state:", err);
    } finally {
      setCheckingDocs(false);
    }
  };

  const handleTriggerRun = async () => {
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/dd/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to trigger run");
      }

      await fetchState();
      onRunComplete();
    } catch (err: any) {
      setError(err?.message || "Failed to trigger due diligence run");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "processing":
        return "bg-white/10 text-white/70 border-white/10";
      case "failed":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const currentRun = runs.find((r) => r.status === "processing");
  const canTrigger = !loading && !currentRun && hasChunkedDoc && !checkingDocs;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Trigger Due Diligence Analysis</CardTitle>
          <CardDescription>
            Start an AI-powered analysis workflow via n8n. n8n is the source of truth for run status.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!hasChunkedDoc && !checkingDocs && (
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                Upload at least one document and wait until its status is <b>chunked</b> before running analysis.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-4">
            <Button onClick={handleTriggerRun} disabled={!canTrigger} size="lg">
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
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <div className="text-sm space-y-2">
                <div>
                  <span className="text-muted-foreground">Started:</span>{" "}
                  <span className="font-medium">
                    {formatDistanceToNow(new Date(currentRun.started_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
              <AnalysisOverlay loading=(true) />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}