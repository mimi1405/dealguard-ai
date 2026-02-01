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
    name: '',
    deal_type: '' as DealType,
    industry: '',
    jurisdiction: '',
    confidentiality_level: 'medium' as ConfidentialityLevel,
    transaction_volume_range: '' as TransactionVolumeRange | '',
    stage: '' as DealStage | '',
    notes: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        deal_type: initialData.deal_type,
        industry: initialData.industry || '',
        jurisdiction: initialData.jurisdiction || '',
        confidentiality_level: initialData.confidentiality_level,
        transaction_volume_range: initialData.transaction_volume_range || '',
        stage: initialData.stage || '',
        notes: initialData.notes || '',
      });
    }
  }, [initialData]);

  const handleSave = async () => {
    setError('');
    setSuccess(false);
    setSaving(true);

    try {
      const updateData = {
        name: formData.name,
        deal_type: formData.deal_type,
        industry: formData.industry || null,
        jurisdiction: formData.jurisdiction || null,
        confidentiality_level: formData.confidentiality_level,
        transaction_volume_range: formData.transaction_volume_range || null,
        stage: formData.stage || null,
        notes: formData.notes || null,
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
              <Label htmlFor="name">Deal Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
              <Label htmlFor="stage">Company Stage</Label>
              <Select
                value={formData.stage}
                onValueChange={(value) => setFormData({ ...formData, stage: value as DealStage })}
              >
                <SelectTrigger id="stage">
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
              <Label htmlFor="confidentiality_level">Confidentiality Level *</Label>
              <Select
                value={formData.confidentiality_level}
                onValueChange={(value) => setFormData({ ...formData, confidentiality_level: value as ConfidentialityLevel })}
              >
                <SelectTrigger id="confidentiality_level">
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
