import { NextResponse } from "next/server";

export async function GET() {
  const n8nChunkUrl = process.env.N8N_CHUNK_WEBHOOK_URL;
  const n8nRunUrl = process.env.N8N_WEBHOOK_URL;

  const results = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    urls: {
      chunk: n8nChunkUrl ? "configured" : "missing",
      run: n8nRunUrl ? "configured" : "missing",
    },
    checks: [] as Array<{
      name: string;
      url: string;
      status: string;
      statusCode?: number;
      responseTime?: number;
      error?: string;
    }>,
  };

  if (n8nChunkUrl) {
    try {
      const start = Date.now();
      const response = await fetch(n8nChunkUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deal_id: "test", document_id: "test" }),
        signal: AbortSignal.timeout(5000),
      });
      const responseTime = Date.now() - start;

      results.checks.push({
        name: "N8N Chunk Webhook",
        url: n8nChunkUrl,
        status: response.ok ? "healthy" : "unhealthy",
        statusCode: response.status,
        responseTime,
      });
    } catch (error: any) {
      results.checks.push({
        name: "N8N Chunk Webhook",
        url: n8nChunkUrl,
        status: "error",
        error: error?.message || "Unknown error",
      });
    }
  }

  if (n8nRunUrl) {
    try {
      const start = Date.now();
      const response = await fetch(n8nRunUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId: "test", runId: "test" }),
        signal: AbortSignal.timeout(5000),
      });
      const responseTime = Date.now() - start;

      results.checks.push({
        name: "N8N Run Webhook",
        url: n8nRunUrl,
        status: response.ok ? "healthy" : "unhealthy",
        statusCode: response.status,
        responseTime,
      });
    } catch (error: any) {
      results.checks.push({
        name: "N8N Run Webhook",
        url: n8nRunUrl,
        status: "error",
        error: error?.message || "Unknown error",
      });
    }
  }

  const allHealthy = results.checks.every((c) => c.status === "healthy");

  return NextResponse.json(results, {
    status: allHealthy ? 200 : 503,
  });
}
