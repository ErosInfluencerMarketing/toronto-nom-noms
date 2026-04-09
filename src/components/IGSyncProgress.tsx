import { useState, useEffect, useRef } from 'react';
import { Instagram, X, CheckCircle, XCircle, Loader2, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface IGSyncResult {
  leadId: string;
  businessName: string;
  status: 'pending' | 'searching' | 'found' | 'not_found' | 'error';
  handle?: string;
}

interface IGSyncProgressProps {
  isOpen: boolean;
  onClose: () => void;
  results: IGSyncResult[];
  totalLeads: number;
  processedCount: number;
  foundCount: number;
  startTime: number | null;
  isRunning: boolean;
}

export function IGSyncProgress({
  isOpen,
  onClose,
  results,
  totalLeads,
  processedCount,
  foundCount,
  startTime,
  isRunning,
}: IGSyncProgressProps) {
  const [elapsed, setElapsed] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!startTime || !isRunning) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, isRunning]);

  useEffect(() => {
    if (!isRunning && startTime) {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }
  }, [isRunning, startTime]);

  if (!isOpen) return null;

  const progressPct = totalLeads > 0 ? (processedCount / totalLeads) * 100 : 0;
  const avgTimePerLead = processedCount > 0 ? elapsed / processedCount : 0;
  const remaining = totalLeads - processedCount;
  const etaSeconds = Math.ceil(remaining * avgTimePerLead);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const statusIcon = (status: IGSyncResult['status']) => {
    switch (status) {
      case 'searching':
        return <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />;
      case 'found':
        return <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />;
      case 'not_found':
        return <XCircle className="h-3.5 w-3.5 text-muted-foreground" />;
      case 'error':
        return <XCircle className="h-3.5 w-3.5 text-destructive" />;
      default:
        return <Clock className="h-3.5 w-3.5 text-muted-foreground/50" />;
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 rounded-xl border border-border bg-card shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary/5 border-b border-border">
        <div className="flex items-center gap-2">
          <Instagram className={cn("h-4 w-4 text-pink-500", isRunning && "animate-pulse")} />
          <span className="text-sm font-semibold text-foreground">
            {isRunning ? 'Finding Instagram Handles...' : 'IG Sync Complete'}
          </span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Stats bar */}
      <div className="px-4 pt-3 pb-2 space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{processedCount} / {totalLeads} leads processed</span>
          <span className="font-medium text-emerald-500">{foundCount} found</span>
        </div>
        <Progress value={progressPct} className="h-2" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTime(elapsed)} elapsed
          </span>
          {isRunning && remaining > 0 && (
            <span>~{formatTime(etaSeconds)} remaining</span>
          )}
        </div>
      </div>

      {/* Results list */}
      <ScrollArea className="max-h-48 px-4 pb-3">
        <div className="space-y-1" ref={scrollRef}>
          {results.map((r) => (
            <div
              key={r.leadId}
              className={cn(
                "flex items-center gap-2 py-1.5 px-2 rounded text-xs transition-colors",
                r.status === 'searching' && "bg-primary/5",
                r.status === 'found' && "bg-emerald-500/5",
              )}
            >
              {statusIcon(r.status)}
              <span className="truncate flex-1 text-foreground">{r.businessName}</span>
              {r.handle && (
                <span className="text-emerald-600 font-medium shrink-0">@{r.handle}</span>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
