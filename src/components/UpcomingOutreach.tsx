import { Lead } from '@/types/lead';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from './StatusBadge';
import { PlatformBadge } from './PlatformBadge';
import { Button } from '@/components/ui/button';
import { Bell, Calendar, ChevronRight, AlertTriangle } from 'lucide-react';
import { format, parseISO, isToday, isPast, isTomorrow, differenceInDays } from 'date-fns';

interface UpcomingOutreachProps {
  leads: Lead[];
  onEdit: (lead: Lead) => void;
}

export function UpcomingOutreach({ leads, onEdit }: UpcomingOutreachProps) {
  const upcomingLeads = leads
    .filter((lead) => lead.next_outreach_date)
    .map((lead) => ({
      ...lead,
      outreachDate: parseISO(lead.next_outreach_date!),
    }))
    .filter((lead) => {
      const daysDiff = differenceInDays(lead.outreachDate, new Date());
      return daysDiff <= 7; // Show leads due within the next 7 days or overdue
    })
    .sort((a, b) => a.outreachDate.getTime() - b.outreachDate.getTime());

  const getDateLabel = (date: Date) => {
    if (isPast(date) && !isToday(date)) {
      return { label: 'Overdue', className: 'text-destructive' };
    }
    if (isToday(date)) {
      return { label: 'Today', className: 'text-status-contacted' };
    }
    if (isTomorrow(date)) {
      return { label: 'Tomorrow', className: 'text-primary' };
    }
    return { label: format(date, 'EEE, MMM d'), className: 'text-muted-foreground' };
  };

  if (upcomingLeads.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-primary" />
            Upcoming Outreach
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Calendar className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No upcoming outreach scheduled
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const overdueCount = upcomingLeads.filter(
    (lead) => isPast(lead.outreachDate) && !isToday(lead.outreachDate)
  ).length;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-primary" />
            Upcoming Outreach
          </CardTitle>
          {overdueCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 px-2 py-1 rounded-full">
              <AlertTriangle className="h-3 w-3" />
              {overdueCount} overdue
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {upcomingLeads.slice(0, 5).map((lead) => {
          const dateInfo = getDateLabel(lead.outreachDate);
          return (
            <div
              key={lead.id}
              className="flex items-center justify-between gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-foreground truncate text-sm">
                    {lead.business_name}
                  </h4>
                  <PlatformBadge platform={lead.platform} />
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={lead.status} />
                  <span className={`text-xs font-medium ${dateInfo.className}`}>
                    {dateInfo.label}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0"
                onClick={() => onEdit(lead)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
        {upcomingLeads.length > 5 && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            +{upcomingLeads.length - 5} more scheduled
          </p>
        )}
      </CardContent>
    </Card>
  );
}
