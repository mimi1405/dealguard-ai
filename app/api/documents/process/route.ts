import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Body = {
  dealId?: string;
  documentId?: string;
  deal_id?: string;
  document_id?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Body>;

    const dealIdRaw = body.deal_id ?? body.dealId;
    const documentIdRaw = body.document_id ?? body.documentId;

    const deal_id = typeof dealIdRaw === "string" ? dealIdRaw.trim() : "";
    const document_id = typeof documentIdRaw === "string" ? documentIdRaw.trim() : "";

    if (!deal_id || !document_id) {
      return NextResponse.json(
        { error: "deal_id and document_id are required" },
        { status: 400 }
      );
    }

    // Optional but good: ensure doc belongs to deal (prevents abuse)
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

    // ✅ Do NOT touch status here (stays 'uploaded' until n8n changes it)
    const n8nUrl = process.env.N8N_CHUNK_WEBHOOK_URL;
    if (!n8nUrl) {
      return NextResponse.json(
        { error: "N8N_CHUNK_WEBHOOK_URL is not configured" },
        { status: 500 }
      );
    }

    const payload = { deal_id, document_id };

    // Helpful debug logs (remove later)
    console.log("[process] triggering n8n", n8nUrl);
    console.log(n8nUrl);
    console.log("[process] payload", payload);

    const r = await fetch(n8nUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const text = await r.text().catch(() => "");
      return NextResponse.json(
        { error: "Failed to trigger n8n", status: r.status, details: text.slice(0, 500) },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}