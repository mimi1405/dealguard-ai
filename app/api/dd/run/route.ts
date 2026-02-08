// app/api/dd/run/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Body = { dealId?: string };

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = (await request.json()) as Body;

    const dealId = (body.dealId ?? "").trim();
    if (!dealId) {
      return NextResponse.json({ error: "dealId is required" }, { status: 400 });
    }

    // 1) Ensure deal exists
    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .select("id, analysis_status")
      .eq("id", dealId)
      .maybeSingle();

    if (dealError) {
      return NextResponse.json(
        { error: "Failed to load deal", details: dealError.message },
        { status: 500 }
      );
    }

    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    // Optional: if already running, don't trigger again
    if (deal.analysis_status === "running") {
      return NextResponse.json(
        { ok: true, skipped: true, reason: "already_running" },
        { status: 200 }
      );
    }

    // 2) Ensure at least one chunked document exists (hard guard)
    const { data: readyDoc, error: readyErr } = await supabase
      .from("documents")
      .select("id")
      .eq("deal_id", dealId)
      .eq("status", "chunked")
      .limit(1)
      .maybeSingle();

    if (readyErr) {
      return NextResponse.json(
        { error: "Failed to check documents", details: readyErr.message },
        { status: 500 }
      );
    }

    if (!readyDoc) {
      return NextResponse.json(
        { error: "No chunked documents found. Please upload and chunk at least one document first." },
        { status: 400 }
      );
    }

    // 3) Trigger n8n (ONLY deal_id)
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL_TEST;
    if (!n8nWebhookUrl) {
      return NextResponse.json(
        { error: "N8N_WEBHOOK_URL is not configured" },
        { status: 500 }
      );
    }

    let r: Response;
    try {
      r = await fetch(n8nWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deal_id: dealId }),
      });
    } catch (e: any) {
      return NextResponse.json(
        { error: "Failed to reach n8n webhook", details: e?.message ?? String(e) },
        { status: 502 }
      );
    }

    if (!r.ok) {
      const detail = (await r.text().catch(() => "")).slice(0, 500);
      return NextResponse.json(
        { error: "Failed to trigger n8n", status: r.status, detail },
        { status: 502 }
      );
    }

    // IMPORTANT: DO NOT set analysis_status here. n8n will do it.
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: any) {
    console.error("Error triggering DD run:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}