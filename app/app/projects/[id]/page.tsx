'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { MetaEditor } from '@/components/meta/meta-editor';
import { DocumentUpload } from '@/components/documents/document-upload';
import { DocumentList } from '@/components/documents/document-list';
import { QuestionnaireForm } from '@/components/questionnaire/questionnaire-form';
import { AnalysisViewer } from '@/components/analysis/analysis-viewer';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const projectId = params.id as string;

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [documentsRefresh, setDocumentsRefresh] = useState(0);

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('owner_id', user.id)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (error) {
      console.error('Error fetching project:', error);
      router.push('/app/projects');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentUploadComplete = () => {
    setDocumentsRefresh(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/app/projects">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">{project.project_name}</h1>
        <p className="text-muted-foreground mt-2">{project.client_name}</p>
      </div>

      <Tabs defaultValue="meta" className="space-y-6">
        <TabsList>
          <TabsTrigger value="meta">Meta</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="questionnaire">Questionnaire</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="meta">
          <MetaEditor
            projectId={projectId}
            initialData={project}
            onUpdate={fetchProject}
          />
        </TabsContent>

        <TabsContent value="documents">
          <div className="space-y-6">
            <DocumentUpload
              projectId={projectId}
              onUploadComplete={handleDocumentUploadComplete}
            />
            <DocumentList
              projectId={projectId}
              refresh={documentsRefresh}
            />
          </div>
        </TabsContent>

        <TabsContent value="questionnaire">
          <QuestionnaireForm projectId={projectId} />
        </TabsContent>

        <TabsContent value="analysis">
          <AnalysisViewer projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
