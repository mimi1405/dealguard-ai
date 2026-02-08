import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Body = {
  // allow both styles from client
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
    const document_id =
      typeof documentIdRaw === "string" ? documentIdRaw.trim() : "";

    if (!deal_id || !document_id) {
      return NextResponse.json(
        { error: "deal_id and document_id are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1) Validate document belongs to deal
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
      return NextResponse.json(
        { error: "Document does not belong to this deal" },
        { status: 403 }
      );
    }

    // 2) Set status -> extracting (only this step is done here)
    // idempotent: if already extracting/extracted, we can skip updating
    if (doc.status !== "extracting" && doc.status !== "chunked") {
      const { error: updErr } = await supabase
        .from("documents")
        .update({ status: "extracting" })
        .eq("id", document_id);

      if (updErr) {
        return NextResponse.json(
          { error: "Failed to set status extracting", details: updErr.message },
          { status: 500 }
        );
      }
    }

    // 3) Trigger n8n (expects deal_id + document_id)
    const n8nUrl = process.env.N8N_CHUNK_WEBHOOK_URL;
    if (!n8nUrl) {
      return NextResponse.json(
        { error: "N8N_CHUNK_WEBHOOK_URL is not configured" },
        { status: 500 }
      );
    }

    const payload = { deal_id, document_id };
    console.log(payload)
    console.log(n8nUrl)
    
    const r = await fetch(n8nUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Optional hardening:
        // "X-Dealguard-Secret": process.env.N8N_WEBHOOK_SECRET ?? "",
      },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      // Let n8n set failed status (your rule), but we can still return error
      return NextResponse.json(
        { error: "Failed to trigger n8n", status: r.status },
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