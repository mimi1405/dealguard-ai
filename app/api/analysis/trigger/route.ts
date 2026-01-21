import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

const MINDSTUDIO_API_KEY = process.env.MINDSTUDIO_API_KEY;
const DEALGUARD_AGENT_ID = process.env.DEALGUARD_AGENT_ID;

export async function POST(request: NextRequest) {
  try {
    if (!MINDSTUDIO_API_KEY || !DEALGUARD_AGENT_ID) {
      throw new Error('MindStudio configuration missing');
    }

    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const { data: questionnaire } = await supabase
      .from('questionnaires')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();

    if (!questionnaire) {
      return NextResponse.json(
        { error: 'Please complete the questionnaire first' },
        { status: 400 }
      );
    }

    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .eq('project_id', projectId)
      .eq('text_extract_status', 'done');

    if (docsError || !documents || documents.length === 0) {
      return NextResponse.json(
        { error: 'No documents available for analysis' },
        { status: 400 }
      );
    }

    const documentData = await Promise.all(
      documents.map(async (doc: any) => {
        const textFilePaths = Array.isArray(doc.text_file_paths)
          ? doc.text_file_paths
          : [doc.text_file_paths];

        const signedUrls = await Promise.all(
          textFilePaths.map(async (path: string) => {
            const { data } = await supabase.storage
              .from('dealguard-docs')
              .createSignedUrl(path, 3600);
            return data?.signedUrl || '';
          })
        );

        return {
          documentId: doc.id,
          fileName: doc.original_file_name,
          category: doc.document_category,
          textFiles: signedUrls.filter(Boolean),
        };
      })
    );

    const mindstudioPayload = {
      agentId: DEALGUARD_AGENT_ID,
      workflow: 'Master',
      variables: {
        projectMeta: {
          projectName: (project as any).project_name,
          clientName: (project as any).client_name,
          industry: (project as any).industry,
          analysisGoal: (project as any).analysis_goal,
        },
        questionnaire: {
          investmentThesis: (questionnaire as any).investment_thesis,
          focusAreas: (questionnaire as any).focus_areas,
          keyRisks: (questionnaire as any).key_risks,
          redFlags: (questionnaire as any).red_flags_known ? (questionnaire as any).red_flags_description : null,
          specialInstructions: (questionnaire as any).special_instructions_for_ai,
        },
        documents: documentData,
      },
    };

    const mindstudioResponse = await fetch(
      'https://v1.mindstudio-api.com/developer/v2/agents/run',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${MINDSTUDIO_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mindstudioPayload),
      }
    );

    if (!mindstudioResponse.ok) {
      const errorText = await mindstudioResponse.text();
      throw new Error(`MindStudio API error: ${errorText}`);
    }

    const mindstudioResult = await mindstudioResponse.json();

    const analysisData: any = {
      project_id: projectId,
      owner_id: (project as any).owner_id,
      analysis_status: 'running',
      mindstudio_run_id: mindstudioResult.runId || null,
      result_json: mindstudioResult.output ? mindstudioResult : null,
    };

    if (mindstudioResult.output) {
      analysisData.analysis_status = 'completed';
      analysisData.completed_at = new Date().toISOString();
    }

    const { data: analysis, error: analysisError } = await supabase
      .from('analyses')
      .insert(analysisData)
      .select()
      .single();

    if (analysisError) throw analysisError;

    return NextResponse.json({
      success: true,
      analysisId: (analysis as any).id,
      status: analysisData.analysis_status,
      runId: mindstudioResult.runId,
    });
  } catch (error: any) {
    console.error('Analysis trigger error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to trigger analysis' },
      { status: 500 }
    );
  }
}
