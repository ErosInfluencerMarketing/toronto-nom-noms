import { useState } from 'react';
import { Template } from '@/types/template';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Sparkles, Loader2, ChevronDown, Check } from 'lucide-react';
import { toast } from 'sonner';

interface AIEmailWriterProps {
  channel: 'email' | 'instagram';
  templates: Template[];
  onGenerated: (result: { subject?: string; message_body: string }) => void;
}

export function AIEmailWriter({ channel, templates, onGenerated }: AIEmailWriterProps) {
  const [prompt, setPrompt] = useState('');
  const [selectedRefIds, setSelectedRefIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const toggleRef = (id: string) => {
    setSelectedRefIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Enter a prompt describing what you want to write');
      return;
    }

    setIsGenerating(true);
    try {
      const referenceTemplates = templates
        .filter((t) => selectedRefIds.includes(t.id))
        .map((t) => ({ name: t.name, subject: t.subject, message_body: t.message_body }));

      const { data, error } = await supabase.functions.invoke('generate-email', {
        body: { prompt: prompt.trim(), referenceTemplates, channel },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      onGenerated(data);
      toast.success('AI content generated!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate content');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full justify-between gap-2 border-primary/30 text-primary hover:bg-primary/5"
        >
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Write with AI
          </span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-3 space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Describe the email you want</Label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              channel === 'email'
                ? 'e.g., Write a follow-up email for a restaurant that showed interest in our delivery platform...'
                : 'e.g., Write a casual DM introducing our platform to a pizza shop...'
            }
            className="min-h-[80px] bg-background border-border text-sm"
          />
        </div>

        {templates.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Reference templates for style/tone{' '}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {templates.map((t) => {
                const selected = selectedRefIds.includes(t.id);
                return (
                  <Badge
                    key={t.id}
                    variant={selected ? 'default' : 'outline'}
                    className="cursor-pointer transition-colors text-xs"
                    onClick={() => toggleRef(t.id)}
                  >
                    {selected && <Check className="h-3 w-3 mr-1" />}
                    {t.name}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        <Button
          type="button"
          size="sm"
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="w-full"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          {isGenerating ? 'Generating...' : 'Generate'}
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
}
