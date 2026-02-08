// app/api/documents/process/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Body = {
  documentId: string;
  dealId: string;
};

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

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

    // Use service role on server-side only (never in client)
    const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // 1) Validate document belongs to deal + current status
    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select("id, deal_id, status")
      .eq("id", documentId)
      .single();

    if (docErr || !doc) {
      return NextResponse.json(
        { error: "Document not found", details: docErr?.message },
        { status: 404 }
      );
    }

    if (doc.deal_id !== dealId) {
      return NextResponse.json(
        { error: "Document does not belong to deal" },
        { status: 403 }
      );
    }

    // Optional: If already processing/extracted, don't re-trigger
    if (doc.status === "extracting" || doc.status === "extracted") {
      return NextResponse.json(
        { ok: true, skipped: true, status: doc.status },
        { status: 200 }
      );
    }

    // 2) Set status → extracting (single source of truth for UI)
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

    // 3) Trigger n8n (placeholder – you will wire request details)
    const n8nUrl = process.env.N8N_CHUNK_WEBHOOK_URL;
    if (!n8nUrl) {
      // Revert status if desired
      await supabase
        .from("documents")
        .update({ status: "failed" })
        .eq("id", documentId);

      return NextResponse.json(
        { error: "N8N_CHUNK_WEBHOOK_URL missing" },
        { status: 500 }
      );
    }

    // IMPORTANT: keep payload minimal and schema-driven
    const payload = {
      dealId,
      documentId,
      // TODO: add signed URL creation or storage path lookup if your n8n needs it.
      // storageBucket/path are in documents table per schema, but keep it server-side.
    };

    // TODO: Decide auth method (header token, basic auth, etc.)
    const res = await fetch(n8nUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // "Authorization": `Bearer ${process.env.N8N_WEBHOOK_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      // If n8n trigger failed, mark failed
      await supabase
        .from("documents")
        .update({ status: "failed" })
        .eq("id", documentId);

      return NextResponse.json(
        { error: "n8n trigger failed", status: res.status },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}