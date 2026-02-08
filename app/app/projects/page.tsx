'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { Deal, DEAL_TYPE_LABELS } from '@/lib/types/database';

export default function DealsPage() {
  const supabase = createClient();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const { data, error } = await supabase
          .from('deals')
          .select('*')
          .order('updated_at', { ascending: false });

        if (error) throw error;
        setDeals(data || []);
      } catch (error) {
        console.error('Error fetching deals:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDeals();
  }, [supabase]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'running':
        return <Clock className="h-4 w-4 text-white/70 animate-pulse" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'running':
        return 'bg-white/10 text-white/70 border-white/10';
      case 'failed':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getConfidentialityColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'low':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      default:
        return 'bg-muted';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Deals</h1>
          <p className="text-muted-foreground mt-2">
            AI-powered due diligence for investment opportunities
          </p>
        </div>
        <Button asChild>
          <Link href="/app/projects/new">
            <Plus className="mr-2 h-4 w-4" />
            New Deal
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading deals...</div>
      ) : deals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No deals yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first deal to get started with AI-powered due diligence
            </p>
            <Button asChild>
              <Link href="/app/projects/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Deal
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {deals.map((deal) => (
            <Link key={deal.id} href={`/app/projects/${deal.id}`}>
              <Card className="hover:border-white/20 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-lg">{deal.title}</CardTitle>
                    <div className="flex gap-2">
                      <Badge variant="outline" className={getStatusColor(deal.analysis_status)}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(deal.analysis_status)}
                          {deal.analysis_status.charAt(0).toUpperCase() + deal.analysis_status.slice(1)}
                        </span>
                      </Badge>
                    </div>
                  </div>
                  <CardDescription>
                    {DEAL_TYPE_LABELS[deal.deal_type]}
                    {deal.industry && ` • ${deal.industry}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {deal.target_stage && (
                      <div>
                        <span className="text-muted-foreground">Stage: </span>
                        <span className="font-medium capitalize">{deal.target_stage.replace('_', ' ')}</span>
                      </div>
                    )}
                    {deal.jurisdiction && (
                      <div>
                        <span className="text-muted-foreground">Jurisdiction: </span>
                        <span className="font-medium">{deal.jurisdiction}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2">
                      {/* <Badge variant="outline" className={getConfidentialityColor(deal.confidentiality_level)}>
                        {/* {deal.confidentiality_level.toUpperCase()} 
                      </Badge>
                      */}
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span className="text-xs">
                          {formatDistanceToNow(new Date(deal.updated_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
