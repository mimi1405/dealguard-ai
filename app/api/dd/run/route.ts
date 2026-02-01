import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { dealId, runId } = await request.json();

    if (!dealId || !runId) {
      return NextResponse.json(
        { error: 'dealId and runId are required' },
        { status: 400 }
      );
    }

    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('*')
      .eq('id', dealId)
      .maybeSingle();

    if (dealError || !deal) {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      );
    }

    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .eq('deal_id', dealId);

    if (docsError) {
      throw docsError;
    }

    if (!documents || documents.length === 0) {
      return NextResponse.json(
        { error: 'No documents found for this deal. Please upload documents first.' },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from('dd_runs')
      .update({ status: 'running' })
      .eq('id', runId);

    if (updateError) {
      console.error('Failed to update run status:', updateError);
    }

    const { error: dealUpdateError } = await supabase
      .from('deals')
      .update({ status: 'running', last_run_id: runId })
      .eq('id', dealId);

    if (dealUpdateError) {
      console.error('Failed to update deal status:', dealUpdateError);
    }

    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;

    if (n8nWebhookUrl) {
      const payload = {
        dealId,
        runId,
        deal: {
          name: deal.name,
          deal_type: deal.deal_type,
          industry: deal.industry,
          jurisdiction: deal.jurisdiction,
          stage: deal.stage,
          transaction_volume_range: deal.transaction_volume_range,
        },
        documents: documents.map(doc => ({
          id: doc.id,
          doc_type: doc.doc_type,
          original_filename: doc.original_filename,
          storage_bucket: doc.storage_bucket,
          storage_path: doc.storage_path,
          size_bytes: doc.size_bytes,
        })),
      };

      fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch((err) => {
        console.error('Failed to trigger n8n webhook:', err);
      });
    } else {
      console.warn('N8N_WEBHOOK_URL not configured. Skipping n8n trigger.');
    }

    return NextResponse.json({
      success: true,
      message: 'Due diligence run triggered successfully',
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
