import { useMemo, useState } from 'react';
import { Lead, Platform, LeadStatus } from '@/types/lead';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BarChart3, Users, Phone, MessageSquare, Calendar, CheckCircle, TrendingUp } from 'lucide-react';

interface AnalyticsPanelProps {
  leads: Lead[];
}

interface StatItem {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  percentage?: number;
}

export function AnalyticsPanel({ leads }: AnalyticsPanelProps) {
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');

  const filteredLeads = useMemo(() => {
    if (platformFilter === 'all') return leads;
    return leads.filter((lead) => lead.platform === platformFilter);
  }, [leads, platformFilter]);

  const stats = useMemo((): StatItem[] => {
    const total = filteredLeads.length;
    const contacted = filteredLeads.filter((l) => 
      l.status === 'contacted' || l.status === 'demo_booked' || l.status === 'onboarded'
    ).length;
    const demosBooked = filteredLeads.filter((l) => 
      l.status === 'demo_booked' || l.status === 'onboarded'
    ).length;
    const onboarded = filteredLeads.filter((l) => l.status === 'onboarded').length;

    // Calculate replies as leads that progressed past "contacted" status
    const replies = filteredLeads.filter((l) => 
      l.status === 'demo_booked' || l.status === 'onboarded'
    ).length;

    return [
      {
        label: 'Total Leads',
        value: total,
        icon: Users,
        color: 'text-primary bg-primary/10',
      },
      {
        label: 'Contacted',
        value: contacted,
        icon: Phone,
        color: 'text-status-contacted bg-status-contacted/10',
        percentage: total > 0 ? Math.round((contacted / total) * 100) : 0,
      },
      {
        label: 'Replies Received',
        value: replies,
        icon: MessageSquare,
        color: 'text-accent bg-accent/10',
        percentage: contacted > 0 ? Math.round((replies / contacted) * 100) : 0,
      },
      {
        label: 'Demos Booked',
        value: demosBooked,
        icon: Calendar,
        color: 'text-status-demo bg-status-demo/10',
        percentage: contacted > 0 ? Math.round((demosBooked / contacted) * 100) : 0,
      },
      {
        label: 'Onboarded',
        value: onboarded,
        icon: CheckCircle,
        color: 'text-status-onboarded bg-status-onboarded/10',
        percentage: demosBooked > 0 ? Math.round((onboarded / demosBooked) * 100) : 0,
      },
    ];
  }, [filteredLeads]);

  const conversionRate = useMemo(() => {
    const total = filteredLeads.length;
    const onboarded = filteredLeads.filter((l) => l.status === 'onboarded').length;
    return total > 0 ? Math.round((onboarded / total) * 100) : 0;
  }, [filteredLeads]);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-primary" />
            Analytics
          </CardTitle>
          <Select
            value={platformFilter}
            onValueChange={(value) => setPlatformFilter(value as Platform | 'all')}
          >
            <SelectTrigger className="w-32 h-8 text-sm bg-secondary border-border">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="eros">Eros</SelectItem>
              <SelectItem value="noms">Noms</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {/* Conversion Rate Highlight */}
        <div className="mb-6 p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Overall Conversion Rate</p>
              <p className="text-3xl font-bold text-foreground">{conversionRate}%</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="p-3 rounded-lg bg-secondary/50 border border-border/50"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              {stat.percentage !== undefined && (
                <p className="text-xs text-primary mt-1">{stat.percentage}% rate</p>
              )}
            </div>
          ))}
        </div>

        {/* Platform Breakdown */}
        {platformFilter === 'all' && leads.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border">
            <h4 className="text-sm font-medium text-foreground mb-3">Platform Breakdown</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-platform-eros/10 border border-platform-eros/20">
                <p className="text-sm font-medium text-platform-eros">Eros</p>
                <p className="text-xl font-bold text-foreground">
                  {leads.filter((l) => l.platform === 'eros').length}
                </p>
                <p className="text-xs text-muted-foreground">leads</p>
              </div>
              <div className="p-3 rounded-lg bg-platform-noms/10 border border-platform-noms/20">
                <p className="text-sm font-medium text-platform-noms">Noms</p>
                <p className="text-xl font-bold text-foreground">
                  {leads.filter((l) => l.platform === 'noms').length}
                </p>
                <p className="text-xs text-muted-foreground">leads</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
