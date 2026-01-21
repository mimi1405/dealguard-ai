'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

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

interface MetaEditorProps {
  projectId: string;
  initialData: any;
  onUpdate: () => void;
}

export function MetaEditor({ projectId, initialData, onUpdate }: MetaEditorProps) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

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

  useEffect(() => {
    if (initialData) {
      setFormData({
        project_name: initialData.project_name || '',
        client_name: initialData.client_name || '',
        project_type: initialData.project_type || '',
        industry: initialData.industry || '',
        jurisdiction: initialData.jurisdiction || '',
        confidentiality_level: initialData.confidentiality_level || '',
        analysis_goal: initialData.analysis_goal || '',
        transaction_volume_range: initialData.transaction_volume_range || '',
        target_company_stage: initialData.target_company_stage || '',
        notes_internal: initialData.notes_internal || '',
      });
    }
  }, [initialData]);

  const handleSave = async () => {
    setError('');
    setSuccess(false);
    setSaving(true);

    try {
      const updateData = {
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
        updated_at: new Date().toISOString(),
      };

      const { error } = await (supabase as any)
        .from('projects')
        .update(updateData)
        .eq('id', projectId);

      if (error) throw error;

      setSuccess(true);
      onUpdate();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="project_name">Project Name *</Label>
              <Input
                id="project_name"
                value={formData.project_name}
                onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_name">Client Name *</Label>
              <Input
                id="client_name"
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project_type">Project Type *</Label>
              <Select
                value={formData.project_type}
                onValueChange={(value) => setFormData({ ...formData, project_type: value })}
              >
                <SelectTrigger id="project_type">
                  <SelectValue />
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
              <Label htmlFor="confidentiality_level">Confidentiality Level *</Label>
              <Select
                value={formData.confidentiality_level}
                onValueChange={(value) => setFormData({ ...formData, confidentiality_level: value })}
              >
                <SelectTrigger id="confidentiality_level">
                  <SelectValue />
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
              <Label htmlFor="industry">Industry *</Label>
              <Input
                id="industry"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="jurisdiction">Jurisdiction *</Label>
              <Input
                id="jurisdiction"
                value={formData.jurisdiction}
                onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="transaction_volume_range">Transaction Volume Range</Label>
              <Select
                value={formData.transaction_volume_range}
                onValueChange={(value) => setFormData({ ...formData, transaction_volume_range: value })}
              >
                <SelectTrigger id="transaction_volume_range">
                  <SelectValue placeholder="Select range" />
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
                  <SelectValue placeholder="Select stage" />
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
            <Label htmlFor="analysis_goal">Analysis Goal *</Label>
            <Textarea
              id="analysis_goal"
              value={formData.analysis_goal}
              onChange={(e) => setFormData({ ...formData, analysis_goal: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes_internal">Internal Notes</Label>
            <Textarea
              id="notes_internal"
              value={formData.notes_internal}
              onChange={(e) => setFormData({ ...formData, notes_internal: e.target.value })}
              rows={3}
            />
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-500/10 text-green-500 rounded-md text-sm">
              Project updated successfully!
            </div>
          )}

          <Button onClick={handleSave} disabled={saving} size="lg">
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
