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
import {
  Deal,
  DealType,
  TransactionVolumeRange,
  DealStage,
  ConfidentialityLevel,
  DEAL_TYPE_LABELS,
  TRANSACTION_VOLUME_LABELS,
  DEAL_STAGE_LABELS
} from '@/lib/types/database';

const DEAL_TYPES: DealType[] = [
  'startup_equity',
  'm_a',
  'real_estate',
  'debt_financing',
  'vendor_dd',
  'international_investment_review',
];

const CONFIDENTIALITY_LEVELS: ConfidentialityLevel[] = ['low', 'medium', 'high'];

const TRANSACTION_VOLUMES: TransactionVolumeRange[] = ['lt_1m', 'm1_5', 'm5_20', 'm20_100', 'gt_100'];

const COMPANY_STAGES: DealStage[] = ['pre_seed', 'seed', 'series_a', 'series_b_plus', 'major'];

interface MetaEditorProps {
  dealId: string;
  initialData: Deal;
  onUpdate: () => void;
}

export function MetaEditor({ dealId, initialData, onUpdate }: MetaEditorProps) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    client_name: '',
    deal_type: '' as DealType,
    industry: '',
    jurisdiction: '',
    confidentiality: 'medium' as ConfidentialityLevel,
    transaction_volume_range: '' as TransactionVolumeRange | '',
    target_stage: '' as DealStage | '',
    thesis: '',
    website_url: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        client_name: initialData.client_name || '',
        deal_type: initialData.deal_type,
        industry: initialData.industry || '',
        jurisdiction: initialData.jurisdiction || '',
        confidentiality: initialData.confidentiality || 'medium',
        transaction_volume_range: initialData.transaction_volume_range || '',
        target_stage: initialData.target_stage || '',
        thesis: initialData.thesis || '',
        website_url: initialData.website_url || '',
      });
    }
  }, [initialData]);

  const handleSave = async () => {
    setError('');
    setSuccess(false);
    setSaving(true);

    try {
      const updateData = {
        title: formData.title,
        client_name: formData.client_name || null,
        deal_type: formData.deal_type,
        industry: formData.industry || null,
        jurisdiction: formData.jurisdiction || null,
        confidentiality: formData.confidentiality,
        transaction_volume_range: formData.transaction_volume_range || null,
        target_stage: formData.target_stage || null,
        thesis: formData.thesis || null,
        website_url: formData.website_url || null,
      };

      const { error } = await supabase
        .from('deals')
        .update(updateData)
        .eq('id', dealId);

      if (error) throw error;

      setSuccess(true);
      onUpdate();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update deal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Deal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">Deal Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_name">Client Name</Label>
              <Input
                id="client_name"
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deal_type">Deal Type *</Label>
              <Select
                value={formData.deal_type}
                onValueChange={(value) => setFormData({ ...formData, deal_type: value as DealType })}
              >
                <SelectTrigger id="deal_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEAL_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {DEAL_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_stage">Target Stage</Label>
              <Select
                value={formData.target_stage}
                onValueChange={(value) => setFormData({ ...formData, target_stage: value as DealStage })}
              >
                <SelectTrigger id="target_stage">
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {COMPANY_STAGES.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {DEAL_STAGE_LABELS[stage]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="jurisdiction">Jurisdiction</Label>
              <Input
                id="jurisdiction"
                value={formData.jurisdiction}
                onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="transaction_volume_range">Transaction Volume</Label>
              <Select
                value={formData.transaction_volume_range}
                onValueChange={(value) => setFormData({ ...formData, transaction_volume_range: value as TransactionVolumeRange })}
              >
                <SelectTrigger id="transaction_volume_range">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  {TRANSACTION_VOLUMES.map((volume) => (
                    <SelectItem key={volume} value={volume}>
                      {TRANSACTION_VOLUME_LABELS[volume]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confidentiality">Confidentiality Level *</Label>
              <Select
                value={formData.confidentiality}
                onValueChange={(value) => setFormData({ ...formData, confidentiality: value as ConfidentialityLevel })}
              >
                <SelectTrigger id="confidentiality">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONFIDENTIALITY_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website_url">Website URL</Label>
              <Input
                id="website_url"
                value={formData.website_url}
                onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                type="url"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="thesis">Investment Thesis</Label>
            <Textarea
              id="thesis"
              value={formData.thesis}
              onChange={(e) => setFormData({ ...formData, thesis: e.target.value })}
              rows={4}
            />
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-500/10 text-green-500 rounded-md text-sm">
              Deal updated successfully!
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
