import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Body = {
  dealId?: string;
  documentId?: string;
  deal_id?: string;
  document_id?: string;
};

const FETCH_TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function triggerN8nWithRetry(
  n8nUrl: string,
  payload: Record<string, string>,
  attempt: number = 1
): Promise<Response> {
  try {
    console.log(`[n8n] Attempt ${attempt}/${MAX_RETRIES} to trigger: ${n8nUrl}`);

    const response = await fetchWithTimeout(
      n8nUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "DealGuard/1.0",
        },
        body: JSON.stringify(payload),
      },
      FETCH_TIMEOUT_MS
    );

    if (response.ok || attempt >= MAX_RETRIES) {
      return response;
    }

    if (response.status >= 500) {
      console.warn(`[n8n] Server error (${response.status}), retrying...`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
      return triggerN8nWithRetry(n8nUrl, payload, attempt + 1);
    }

    return response;
  } catch (error: any) {
    if (attempt < MAX_RETRIES && error.name === "AbortError") {
      console.warn(`[n8n] Timeout, retrying... (${attempt}/${MAX_RETRIES})`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
      return triggerN8nWithRetry(n8nUrl, payload, attempt + 1);
    }
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Body>;

    const dealIdRaw = body.deal_id ?? body.dealId;
    const documentIdRaw = body.document_id ?? body.documentId;

    const deal_id = typeof dealIdRaw === "string" ? dealIdRaw.trim() : "";
    const document_id =
      typeof documentIdRaw === "string" ? documentIdRaw.trim() : "";

    if (!deal_id || !document_id) {
      return NextResponse.json(
        { error: "deal_id and document_id are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select("id, deal_id, status")
      .eq("id", document_id)
      .maybeSingle();

    if (docErr) {
      return NextResponse.json(
        { error: "Failed to load document", details: docErr.message },
        { status: 500 }
      );
    }

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (doc.deal_id !== deal_id) {
      return NextResponse.json({ error: "Deal mismatch" }, { status: 403 });
    }

    const n8nUrl = process.env.N8N_CHUNK_WEBHOOK_URL_TEST;
    if (!n8nUrl) {
      return NextResponse.json(
        { error: "N8N_CHUNK_WEBHOOK_URL is not configured" },
        { status: 500 }
      );
    }

    const payload = { deal_id, document_id };

    console.log("[process] Triggering n8n chunking:", { url: n8nUrl, payload });

    const response = await triggerN8nWithRetry(n8nUrl, payload);

    if (!response.ok) {
      const responseText = await response.text().catch(() => "");
      const errorDetail = responseText.slice(0, 200);

      console.error("[n8n] Failed response:", {
        status: response.status,
        statusText: response.statusText,
        detail: errorDetail,
      });

      const errorMessages: Record<number, string> = {
        400: "Invalid request to n8n (check payload format)",
        401: "N8n authentication failed (check webhook key)",
        403: "N8n access forbidden",
        404: "N8n webhook endpoint not found (check URL)",
        408: "Request timeout - n8n took too long to respond",
        429: "Rate limited by n8n",
        500: "N8n internal server error",
        503: "N8n service unavailable",
      };

      const userMessage = errorMessages[response.status] ||
        `N8n service error (${response.status})`;

      return NextResponse.json(
        {
          error: userMessage,
          code: "N8N_TRIGGER_FAILED",
          status: response.status,
          ...(process.env.NODE_ENV === "development" && { detail: errorDetail }),
        },
        { status: 503 }
      );
    }

    console.log("[process] N8n triggered successfully");

    return NextResponse.json(
      { ok: true, message: "Document processing initiated" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[process] Error:", error);

    if (error.name === "AbortError") {
      return NextResponse.json(
        {
          error: "Document processing request timed out. Please try again.",
          code: "TIMEOUT",
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      {
        error: error?.message ?? "Failed to initiate document processing",
        code: "UNKNOWN_ERROR",
      },
      { status: 500 }
    );
  }
}
