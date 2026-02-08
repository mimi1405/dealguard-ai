'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DealScore, CanonicalFact, Fact, SCORE_GRADE_LABELS } from '@/lib/types/database';
import { BrainAnimation } from '@/components/analysis/brain-animation';

interface CategoryScoreRow {
  deal_id: string;
  category_id: number;
  score: string;
  rationale: string;
  strengths: string[];
  risks: string[];
  created_at: string;
  categories: {
    title: string;
    key: string;
    sort_order: number;
  };
}

interface ResultsViewerProps {
  dealId: string;
}

export function ResultsViewer({ dealId }: ResultsViewerProps) {
  const supabase = createClient();
  const [latestScore, setLatestScore] = useState<DealScore | null>(null);
  const [categoryScoreRows, setCategoryScoreRows] = useState<CategoryScoreRow[]>([]);
  const [canonicalFacts, setCanonicalFacts] = useState<CanonicalFact[]>([]);
  const [rawFacts, setRawFacts] = useState<Fact[]>([]);
  // TODO: For production, replace `true` with actual analysis-running state.
  // Set to `true` now so the brain animation is always visible for inspection.
  const [analysisRunning] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, [dealId]);

  const fetchResults = async () => {
    try {
      const { data: scoreData } = await supabase
        .from('deal_scores')
        .select('*')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setLatestScore(scoreData);

      const { data: catScores } = await supabase
        .from('category_scores')
        .select('*, categories(title, key, sort_order)')
        .eq('deal_id', dealId);

      const sorted = (catScores || []).sort(
        (a: any, b: any) => (a.categories?.sort_order ?? 0) - (b.categories?.sort_order ?? 0)
      );
      setCategoryScoreRows(sorted as CategoryScoreRow[]);

      const { data: canonicalData } = await supabase
        .from('canonical_facts')
        .select('*')
        .eq('deal_id', dealId)
        .order('topic');

      setCanonicalFacts(canonicalData || []);

      const { data: factsData } = await supabase
        .from('facts')
        .select('*')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false });

      setRawFacts(factsData || []);
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'a':
        return 'bg-green-500/10 text-green-500 border-green-500';
      case 'b':
        return 'bg-white/15 text-white/80 border-white/20';
      case 'c':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500';
      case 'd':
        return 'bg-orange-500/10 text-orange-500 border-orange-500';
      case 'e':
        return 'bg-red-500/10 text-red-500 border-red-500';
      default:
        return 'bg-muted';
    }
  };

  if (analysisRunning || loading) {
    return (
      <div className="flex flex-col items-center justify-center">
        <div className="w-64 aspect-square overflow-hidden border border-white/[0.04]">
          <BrainAnimation progress={100} className="rounded-2xl" />
        </div>
        <p className="mt-6 text-xl text-muted-foreground tracking-wide animate-pulse">
          Analyzing documents...
        </p>
      </div>
    );
  }

  if (!latestScore && canonicalFacts.length === 0) {
    return (
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          No analysis results yet. Run a due diligence analysis in the Run tab to generate results.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {latestScore && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Overall Score</CardTitle>
                  <CardDescription>Latest due diligence assessment</CardDescription>
                </div>
                <Badge variant="outline" className={`${getGradeColor(latestScore.grade)} text-2xl px-4 py-2`}>
                  Grade {latestScore.grade.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Overall Score</span>
                    <span className="text-2xl font-bold">{latestScore.overall_score}/100</span>
                  </div>
                  <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${latestScore.overall_score}%` }} />
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {SCORE_GRADE_LABELS[latestScore.grade]}
                </div>
              </div>
            </CardContent>
          </Card>

          {categoryScoreRows.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Category Scores In Detail</CardTitle>
                <CardDescription>Detailed breakdown by assessment category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {categoryScoreRows.map((row) => (
                    <div key={row.category_id} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{row.categories.title}</h4>
                        <span className="text-lg font-bold">{parseFloat(row.score).toFixed(0)}/100</span>
                      </div>
                      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${parseFloat(row.score)}%` }} />
                      </div>
                      {row.rationale && (
                        <p className="text-sm text-muted-foreground">{row.rationale}</p>
                      )}
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        {row.strengths && row.strengths.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-green-600 font-medium">
                              <CheckCircle className="h-4 w-4" />
                              Strengths
                            </div>
                            <ul className="list-disc list-inside space-y-1">
                              {row.strengths.map((strength, i) => (
                                <li key={i} className="text-muted-foreground">{strength}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {row.risks && row.risks.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-red-600 font-medium">
                              <AlertTriangle className="h-4 w-4" />
                              Risks
                            </div>
                            <ul className="list-disc list-inside space-y-1">
                              {row.risks.map((risk, i) => (
                                <li key={i} className="text-muted-foreground">{risk}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Facts & Evidence</CardTitle>
          <CardDescription>Extracted facts from document analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="canonical" className="space-y-4">
            <TabsList>
              <TabsTrigger value="canonical">Canonical Facts ({canonicalFacts.length})</TabsTrigger>
              <TabsTrigger value="raw">Raw Facts ({rawFacts.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="canonical" className="space-y-4">
              {canonicalFacts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No canonical facts available yet.
                </div>
              ) : (
                canonicalFacts.map((fact) => (
                  <Card key={fact.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{fact.topic}</CardTitle>
                        <Badge variant="outline">
                          {Math.round(fact.confidence * 100)}% confidence
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="text-sm">
                          <pre className="whitespace-pre-wrap font-sans">
                            {JSON.stringify(fact.merged_value, null, 2)}
                          </pre>
                        </div>
                        {fact.sources && fact.sources.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            Sources: {fact.sources.length} document(s)
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="raw" className="space-y-4">
              {rawFacts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No raw facts available yet.
                </div>
              ) : (
                rawFacts.map((fact) => (
                  <Card key={fact.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{fact.topic}</CardTitle>
                          <CardDescription>
                            Type: {fact.fact_type.replace('_', ' ')}
                          </CardDescription>
                        </div>
                        <Badge variant="outline">
                          {Math.round(fact.confidence * 100)}% confidence
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="text-sm">
                          <pre className="whitespace-pre-wrap font-sans">
                            {JSON.stringify(fact.value_json, null, 2)}
                          </pre>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {fact.evidence_chunk_ids.length} evidence chunk(s) • {fact.source_document_ids.length} document(s)
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
