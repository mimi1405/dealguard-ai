import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Body = {
  documentId: string;
  dealId: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Body>;
    const documentId = body.documentId?.trim();
    const dealId = body.dealId?.trim();

    if (!documentId || !dealId) {
      return NextResponse.json(
        { error: "documentId and dealId are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1) Validate: document exists + belongs to deal
    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select("id, deal_id, status")
      .eq("id", documentId)
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
    if (doc.deal_id !== dealId) {
      return NextResponse.json(
        { error: "Document does not belong to this deal" },
        { status: 403 }
      );
    }

    // Optional: don't re-trigger if already in progress/done
    if (doc.status === "extracting" || doc.status === "extracted") {
      return NextResponse.json(
        { ok: true, skipped: true, status: doc.status },
        { status: 200 }
      );
    }

    // 2) Set status -> extracting (single source of truth)
    const { error: updErr } = await supabase
      .from("documents")
      .update({ status: "extracting" })
      .eq("id", documentId);

    if (updErr) {
      return NextResponse.json(
        { error: "Failed to set status extracting", details: updErr.message },
        { status: 500 }
      );
    }

    // 3) Trigger n8n (placeholder request)
    const n8nUrl = process.env.N8N_CHUNK_WEBHOOK_URL;
    if (!n8nUrl) {
      await supabase.from("documents").update({ status: "failed" }).eq("id", documentId);
      return NextResponse.json(
        { error: "N8N_CHUNK_WEBHOOK_URL is not set" },
        { status: 500 }
      );
    }

    const payload = { dealId, documentId };

    const r = await fetch(n8nUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      await supabase.from("documents").update({ status: "failed" }).eq("id", documentId);
      return NextResponse.json(
        { error: "n8n trigger failed", status: r.status },
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