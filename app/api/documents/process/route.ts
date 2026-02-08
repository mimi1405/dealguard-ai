import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Body = {
  dealId?: string;
  documentId?: string;
  deal_id?: string;
  document_id?: string;
};

const TIMEOUT_MS = 15_000; // MVP: kurz halten
const RETRY_ONCE = true;

function pickIds(body: Partial<Body>) {
  const deal_id = (body.deal_id ?? body.dealId ?? "").toString().trim();
  const document_id = (body.document_id ?? body.documentId ?? "").toString().trim();
  return { deal_id, document_id };
}

async function postJsonWithTimeout(url: string, payload: any, timeoutMs: number) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(t);
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Body>;
    const { deal_id, document_id } = pickIds(body);

    if (!deal_id || !document_id) {
      return NextResponse.json(
        { error: "deal_id and document_id are required" },
        { status: 400 }
      );
    }

    // Validate doc belongs to deal + dedupe
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
    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });
    if (doc.deal_id !== deal_id) return NextResponse.json({ error: "Deal mismatch" }, { status: 403 });

    // If your n8n is already processing/done, avoid double-trigger.
    if (["extracting", "chunked", "extracted"].includes(doc.status)) {
      return NextResponse.json(
        { ok: true, skipped: true, status: doc.status },
        { status: 200 }
      );
    }

    // Pick the correct webhook URL (prefer PROD)
    const n8nUrl = process.env.N8N_CHUNK_WEBHOOK_URL_TEST;

    if (!n8nUrl) {
      return NextResponse.json(
        { error: "N8N_CHUNK_WEBHOOK_URL is not configured" },
        { status: 500 }
      );
    }

    const payload = { deal_id, document_id };

    // 1st attempt
    let r: Response;
    try {
      r = await postJsonWithTimeout(n8nUrl, payload, TIMEOUT_MS);
    } catch (e: any) {
      // optional single retry on timeout/network
      if (RETRY_ONCE) {
        r = await postJsonWithTimeout(n8nUrl, payload, TIMEOUT_MS);
      } else {
        throw e;
      }
    }

    if (!r.ok) {
      const detail = (await r.text().catch(() => "")).slice(0, 500);
      return NextResponse.json(
        { error: "Failed to trigger n8n", status: r.status, detail },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    if (e?.name === "AbortError") {
      return NextResponse.json({ error: "n8n request timed out" }, { status: 504 });
    }
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}