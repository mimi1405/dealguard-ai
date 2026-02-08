import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: analysis, error } = await supabase
      .from('analyses')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!analysis) {
      return NextResponse.json({
        status: 'not_started',
        analysis: null,
      });
    }

    return NextResponse.json({
      status: (analysis as any).analysis_status,
      analysis,
    });
  } catch (error: any) {
    console.error('Analysis status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get analysis status' },
      { status: 500 }
    );
  }
}
