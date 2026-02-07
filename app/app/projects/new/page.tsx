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
import {
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

export default function NewDealPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    deal_type: '' as DealType | '',
    industry: '',
    jurisdiction: '',
    confidentiality_level: 'medium' as ConfidentialityLevel,
    transaction_volume_range: '' as TransactionVolumeRange | '',
    stage: '' as DealStage | '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const dealData: any = {
        name: formData.name,
        deal_type: formData.deal_type,
        industry: formData.industry || null,
        jurisdiction: formData.jurisdiction || null,
        confidentiality_level: formData.confidentiality_level,
        transaction_volume_range: formData.transaction_volume_range || null,
        stage: formData.stage || null,
        notes: formData.notes || null,
      };

      const { data, error } = await supabase.from('deals').insert(dealData).select().single();

      if (error) throw error;

      if (data) {
        router.push(`/app/projects/${(data as any).id}`);
      }

    } catch (err: any) {
      setError(err.message || 'Failed to create deal');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/app/projects">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Deals
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Create New Deal</h1>
        <p className="text-muted-foreground mt-2">Set up a new deal for AI-powered due diligence</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Deal Information</CardTitle>
            <CardDescription>Basic details about the investment opportunity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name">
                  Deal Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., TechCo Seed Round Investment"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deal_type">
                  Deal Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.deal_type}
                  onValueChange={(value) => setFormData({ ...formData, deal_type: value as DealType })}
                  required
                >
                  <SelectTrigger id="deal_type">
                    <SelectValue placeholder="Select type" />
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
                    <SelectValue placeholder="Select stage (optional)" />
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
                  placeholder="e.g., SaaS, Healthcare, Fintech"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jurisdiction">Jurisdiction</Label>
                <Input
                  id="jurisdiction"
                  value={formData.jurisdiction}
                  onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })}
                  placeholder="e.g., Delaware, UK, Germany"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="transaction_volume_range">Transaction Volume</Label>
                <Select
                  value={formData.transaction_volume_range}
                  onValueChange={(value) => setFormData({ ...formData, transaction_volume_range: value as TransactionVolumeRange })}
                >
                  <SelectTrigger id="transaction_volume_range">
                    <SelectValue placeholder="Select range (optional)" />
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
                <Label htmlFor="confidentiality_level">
                  Confidentiality Level <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.confidentiality_level}
                  onValueChange={(value) => setFormData({ ...formData, confidentiality_level: value as ConfidentialityLevel })}
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any notes or comments about this deal..."
                rows={4}
              />
            </div>

            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>
            )}

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Deal'}
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
