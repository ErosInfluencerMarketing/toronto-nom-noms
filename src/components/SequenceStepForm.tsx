import { Template } from '@/types/template';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, GripVertical } from 'lucide-react';

interface StepData {
  template_id: string;
  delay_days: number;
}

interface SequenceStepFormProps {
  step: StepData;
  stepIndex: number;
  templates: Template[];
  onChange: (index: number, data: StepData) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}

export function SequenceStepForm({
  step,
  stepIndex,
  templates,
  onChange,
  onRemove,
  canRemove,
}: SequenceStepFormProps) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-secondary/50">
      <div className="flex items-center gap-1 pt-2 text-muted-foreground">
        <GripVertical className="h-4 w-4" />
        <span className="text-xs font-medium min-w-[1.5rem]">{stepIndex + 1}.</span>
      </div>

      <div className="flex-1 space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Template</Label>
          <Select
            value={step.template_id}
            onValueChange={(v) => onChange(stepIndex, { ...step, template_id: v })}
          >
            <SelectTrigger className="bg-background border-border h-9">
              <SelectValue placeholder="Select template..." />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">
            {stepIndex === 0 ? 'Send after (days)' : 'Wait (days) after previous step'}
          </Label>
          <Input
            type="number"
            min={0}
            max={60}
            value={step.delay_days}
            onChange={(e) =>
              onChange(stepIndex, { ...step, delay_days: parseInt(e.target.value) || 0 })
            }
            className="bg-background border-border h-9 w-24"
          />
        </div>
      </div>

      {canRemove && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0 mt-1"
          onClick={() => onRemove(stepIndex)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
