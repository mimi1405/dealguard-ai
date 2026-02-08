// app/api/dd/run/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { dealId, runId } = await request.json();

    if (!dealId || !runId) {
      return NextResponse.json({ error: "dealId and runId are required" }, { status: 400 });
    }

    // 1) Ensure deal exists
    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .select("id")
      .eq("id", dealId)
      .maybeSingle();

    if (dealError || !deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    // 2) Ensure at least one chunked document exists (hard guard)
    const { data: readyDoc, error: readyErr } = await supabase
      .from("documents")
      .select("id")
      .eq("deal_id", dealId)
      .eq("status", "chunked")
      .limit(1)
      .maybeSingle();

    if (readyErr) throw readyErr;

    if (!readyDoc) {
      return NextResponse.json(
        { error: "No chunked documents found. Please upload and chunk at least one document first." },
        { status: 400 }
      );
    }

    // 3) Mark deal as running
    const { error: updErr } = await supabase
      .from("deals")
      .update({ analysis_status: "running" })
      .eq("id", dealId);

    if (updErr) throw updErr;

    // 4) Trigger n8n (minimal contract: only deal_id)
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!n8nWebhookUrl) {
      return NextResponse.json({ error: "N8N_WEBHOOK_URL is not configured" }, { status: 500 });
    }

    const r = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deal_id: dealId }),
    });

    if (!r.ok) {
      const detail = (await r.text().catch(() => "")).slice(0, 500);
      return NextResponse.json(
        { error: "Failed to trigger n8n", status: r.status, detail },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, runId, dealId }, { status: 200 });
  } catch (error: any) {
    console.error("Error triggering DD run:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}