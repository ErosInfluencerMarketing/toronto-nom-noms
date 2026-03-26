import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InlineEditCellProps {
  value: string;
  onSave: (value: string) => void;
  type?: 'text' | 'select' | 'date';
  options?: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
  displayRender?: (value: string) => React.ReactNode;
  onDisplayClick?: () => void;
}

export function InlineEditCell({
  value,
  onSave,
  type = 'text',
  options,
  placeholder = '-',
  className,
  displayRender,
}: InlineEditCellProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSave = () => {
    if (editValue !== value) {
      onSave(editValue);
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') handleCancel();
  };

  if (type === 'select' && options) {
    return (
      <Select
        value={value}
        onValueChange={(v) => {
          onSave(v);
        }}
      >
        <SelectTrigger className="h-7 text-xs border-transparent hover:border-border bg-transparent px-1.5 w-auto min-w-[80px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border z-50">
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          type={type === 'date' ? 'date' : 'text'}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="h-7 text-xs px-1.5 w-auto min-w-[60px] bg-secondary border-border"
        />
      </div>
    );
  }

  return (
    <span
      onClick={() => {
        setEditValue(value);
        setEditing(true);
      }}
      className={cn(
        'cursor-pointer rounded px-1.5 py-0.5 hover:bg-secondary/80 transition-colors inline-block min-w-[30px]',
        className
      )}
      title="Click to edit"
    >
      {displayRender ? displayRender(value) : value || <span className="text-muted-foreground">{placeholder}</span>}
    </span>
  );
}
