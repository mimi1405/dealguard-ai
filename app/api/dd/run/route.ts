import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { dealId, runId } = await request.json();

    if (!dealId || !runId) {
      return NextResponse.json(
        { error: 'dealId and runId are required' },
        { status: 400 }
      );
    }

    // 1) Ensure deal exists
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('id')
      .eq('id', dealId)
      .maybeSingle();

    if (dealError || !deal) {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      );
    }

    // 2) Ensure documents exist
    const { count, error: docsError } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('deal_id', dealId);

    if (docsError) throw docsError;

    if (!count || count === 0) {
      return NextResponse.json(
        { error: 'No documents found for this deal. Please upload documents first.' },
        { status: 400 }
      );
    }

    // 3) Mark deal as running
    await supabase
      .from('deals')
      .update({ analysis_status: 'running' })
      .eq('id', dealId);

    // 4) Trigger n8n (minimal contract)
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!n8nWebhookUrl) {
      console.warn('N8N_WEBHOOK_URL not configured');
    } else {
      fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId, runId }),
      }).catch(err => {
        console.error('Failed to trigger n8n webhook:', err);
      });
    }

    return NextResponse.json({
      success: true,
      runId,
      dealId,
    });
  } catch (error: any) {
    console.error('Error triggering DD run:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}