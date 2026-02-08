import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Body = {
  dealId: string;
  documentId: string;
  status: "extracted" | "failed";
  error_message?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Body>;

    const dealId = body.dealId?.trim();
    const documentId = body.documentId?.trim();
    const status = body.status;

    if (!dealId || !documentId || !status) {
      return NextResponse.json(
        { error: "dealId, documentId and status are required" },
        { status: 400 }
      );
    }

    if (status !== "extracted" && status !== "failed") {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Optional sanity check
    const { data: doc } = await supabase
      .from("documents")
      .select("id, deal_id")
      .eq("id", documentId)
      .maybeSingle();

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (doc.deal_id !== dealId) {
      return NextResponse.json({ error: "Deal mismatch" }, { status: 403 });
    }

    await supabase
      .from("documents")
      .update({ status })
      .eq("id", documentId);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}