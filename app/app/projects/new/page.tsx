'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const PROJECT_TYPES = [
  'Startup Equity',
  'M&A',
  'Real Estate',
  'Debt Financing',
  'Vendor DD',
  'Internal Investment Review',
];

const CONFIDENTIALITY_LEVELS = ['Low', 'Medium', 'High'];

const TRANSACTION_VOLUMES = ['<1m', '1–5m', '5–20m', '20–100m', '>100m'];

const COMPANY_STAGES = ['Pre-Seed', 'Seed', 'Series A', 'Series B+', 'Mature'];

export default function NewProjectPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    project_name: '',
    client_name: '',
    project_type: '',
    industry: '',
    jurisdiction: '',
    confidentiality_level: '',
    analysis_goal: '',
    transaction_volume_range: '',
    target_company_stage: '',
    notes_internal: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const projectData: any = {
        owner_id: user.id,
        project_name: formData.project_name,
        client_name: formData.client_name,
        project_type: formData.project_type,
        industry: formData.industry,
        jurisdiction: formData.jurisdiction,
        confidentiality_level: formData.confidentiality_level,
        analysis_goal: formData.analysis_goal,
        transaction_volume_range: formData.transaction_volume_range || null,
        target_company_stage: formData.target_company_stage || null,
        notes_internal: formData.notes_internal || null,
      };

      const { data, error } = await supabase.from('projects').insert(projectData).select().single();

      if (error) throw error;

      if (data) {
        router.push(`/app/projects/${(data as any).id}`);
      }

    } catch (err: any) {
      setError(err.message || 'Failed to create project');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/app/projects">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Create New Project</h1>
        <p className="text-muted-foreground mt-2">Set up your due diligence project</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>Basic information about the project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="project_name">
                  Project Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="project_name"
                  required
                  value={formData.project_name}
                  onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                  placeholder="e.g., TechCo Investment Analysis"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client_name">
                  Client Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="client_name"
                  required
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  placeholder="e.g., Acme Corp"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project_type">
                  Project Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.project_type}
                  onValueChange={(value) => setFormData({ ...formData, project_type: value })}
                  required
                >
                  <SelectTrigger id="project_type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confidentiality_level">
                  Confidentiality Level <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.confidentiality_level}
                  onValueChange={(value) => setFormData({ ...formData, confidentiality_level: value })}
                  required
                >
                  <SelectTrigger id="confidentiality_level">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONFIDENTIALITY_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">
                  Industry <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="industry"
                  required
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  placeholder="e.g., Software, Healthcare, Fintech"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jurisdiction">
                  Jurisdiction <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="jurisdiction"
                  required
                  value={formData.jurisdiction}
                  onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })}
                  placeholder="e.g., Delaware, UK, Germany"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="transaction_volume_range">Transaction Volume Range</Label>
                <Select
                  value={formData.transaction_volume_range}
                  onValueChange={(value) => setFormData({ ...formData, transaction_volume_range: value })}
                >
                  <SelectTrigger id="transaction_volume_range">
                    <SelectValue placeholder="Select range (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSACTION_VOLUMES.map((volume) => (
                      <SelectItem key={volume} value={volume}>
                        {volume}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="target_company_stage">Target Company Stage</Label>
                <Select
                  value={formData.target_company_stage}
                  onValueChange={(value) => setFormData({ ...formData, target_company_stage: value })}
                >
                  <SelectTrigger id="target_company_stage">
                    <SelectValue placeholder="Select stage (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANY_STAGES.map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {stage}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="analysis_goal">
                Analysis Goal <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="analysis_goal"
                required
                value={formData.analysis_goal}
                onChange={(e) => setFormData({ ...formData, analysis_goal: e.target.value })}
                placeholder="Describe the main goal of this analysis..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes_internal">Internal Notes</Label>
              <Textarea
                id="notes_internal"
                value={formData.notes_internal}
                onChange={(e) => setFormData({ ...formData, notes_internal: e.target.value })}
                placeholder="Any internal notes or comments..."
                rows={3}
              />
            </div>

            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>
            )}

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Project'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
