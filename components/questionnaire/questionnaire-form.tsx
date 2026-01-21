'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const FOCUS_AREAS = [
  'Financials',
  'Legal',
  'Market',
  'Team',
  'Technology',
  'Operations',
];

interface Risk {
  title: string;
  description: string;
  severity: 'Low' | 'Medium' | 'High';
}

interface QuestionnaireFormProps {
  projectId: string;
}

export function QuestionnaireForm({ projectId }: QuestionnaireFormProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [investmentThesis, setInvestmentThesis] = useState('');
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [keyRisks, setKeyRisks] = useState<Risk[]>([]);
  const [redFlagsKnown, setRedFlagsKnown] = useState(false);
  const [redFlagsDescription, setRedFlagsDescription] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [questionnaireId, setQuestionnaireId] = useState<string | null>(null);

  useEffect(() => {
    loadQuestionnaire();
  }, [projectId]);

  const loadQuestionnaire = async () => {
    try {
      const { data, error } = await supabase
        .from('questionnaires')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const questionnaire = data as any;
        setQuestionnaireId(questionnaire.id);
        setInvestmentThesis(questionnaire.investment_thesis || '');
        setFocusAreas(questionnaire.focus_areas || []);
        setKeyRisks(questionnaire.key_risks || []);
        setRedFlagsKnown(questionnaire.red_flags_known || false);
        setRedFlagsDescription(questionnaire.red_flags_description || '');
        setSpecialInstructions(questionnaire.special_instructions_for_ai || '');
      }
    } catch (err: any) {
      console.error('Error loading questionnaire:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFocusArea = (area: string) => {
    setFocusAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  const addRisk = () => {
    setKeyRisks([...keyRisks, { title: '', description: '', severity: 'Medium' }]);
  };

  const updateRisk = (index: number, field: keyof Risk, value: string) => {
    const updated = [...keyRisks];
    updated[index] = { ...updated[index], [field]: value };
    setKeyRisks(updated);
  };

  const removeRisk = (index: number) => {
    setKeyRisks(keyRisks.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setError('');
    setSuccess(false);
    setSaving(true);

    try {
      if (!investmentThesis.trim()) {
        throw new Error('Investment thesis is required');
      }

      if (redFlagsKnown && !redFlagsDescription.trim()) {
        throw new Error('Please describe the red flags');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const questionnaireData: any = {
        project_id: projectId,
        owner_id: user.id,
        investment_thesis: investmentThesis,
        focus_areas: focusAreas,
        key_risks: keyRisks.filter(r => r.title.trim()),
        red_flags_known: redFlagsKnown,
        red_flags_description: redFlagsKnown ? redFlagsDescription : null,
        special_instructions_for_ai: specialInstructions || null,
      };

      if (questionnaireId) {
        const { error } = await (supabase as any)
          .from('questionnaires')
          .update(questionnaireData)
          .eq('id', questionnaireId);

        if (error) throw error;
      } else {
        const { data, error } = await (supabase as any)
          .from('questionnaires')
          .insert(questionnaireData)
          .select()
          .single();

        if (error) throw error;
        if (data) setQuestionnaireId((data as any).id);
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save questionnaire');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Investment Thesis</CardTitle>
          <CardDescription>Describe your investment rationale</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={investmentThesis}
            onChange={(e) => setInvestmentThesis(e.target.value)}
            placeholder="Why is this an attractive investment opportunity?"
            rows={4}
            required
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Focus Areas</CardTitle>
          <CardDescription>Select the areas you want AI to analyze in depth</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {FOCUS_AREAS.map((area) => (
              <div key={area} className="flex items-center space-x-2">
                <Checkbox
                  id={area}
                  checked={focusAreas.includes(area)}
                  onCheckedChange={() => toggleFocusArea(area)}
                />
                <Label htmlFor={area} className="cursor-pointer">
                  {area}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Key Risks</CardTitle>
          <CardDescription>Identify specific risks to investigate</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {keyRisks.map((risk, index) => (
            <div key={index} className="border border-border p-4 rounded-lg space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  <Input
                    placeholder="Risk title"
                    value={risk.title}
                    onChange={(e) => updateRisk(index, 'title', e.target.value)}
                  />
                  <Textarea
                    placeholder="Risk description"
                    value={risk.description}
                    onChange={(e) => updateRisk(index, 'description', e.target.value)}
                    rows={2}
                  />
                  <Select
                    value={risk.severity}
                    onValueChange={(value) => updateRisk(index, 'severity', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRisk(index)}
                  className="ml-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button variant="outline" onClick={addRisk} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Risk
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Red Flags</CardTitle>
          <CardDescription>Any known concerns or red flags?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="redFlags"
              checked={redFlagsKnown}
              onCheckedChange={(checked) => setRedFlagsKnown(checked as boolean)}
            />
            <Label htmlFor="redFlags" className="cursor-pointer">
              Yes, I am aware of specific red flags
            </Label>
          </div>
          {redFlagsKnown && (
            <Textarea
              value={redFlagsDescription}
              onChange={(e) => setRedFlagsDescription(e.target.value)}
              placeholder="Describe the red flags..."
              rows={3}
              required
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Special Instructions for AI</CardTitle>
          <CardDescription>Optional: Any specific instructions for the analysis?</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            placeholder="e.g., Focus more on regulatory compliance..."
            rows={3}
          />
        </CardContent>
      </Card>

      {error && (
        <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-500/10 text-green-500 rounded-md text-sm">
          Questionnaire saved successfully!
        </div>
      )}

      <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
        <Save className="mr-2 h-4 w-4" />
        {saving ? 'Saving...' : 'Save Questionnaire'}
      </Button>
    </div>
  );
}
