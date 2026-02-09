'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DealScore, SCORE_GRADE_LABELS } from '@/lib/types/database';

interface CategoryScoreRow {
  deal_id: string;
  category_id: number;
  score: number;
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

  if (!latestScore && categoryScoreRows.length === 0) {
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
    <div className="space-y-6 h-screen">
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
                        <span className="text-lg font-bold">{Math.round(row.score)}/100</span>
                      </div>
                      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${row.score}%` }} />
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
    </div>
  );
}
