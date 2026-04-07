import { useRef } from 'react';
import { Attachment } from '@/hooks/useAttachments';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Paperclip, X, Upload, Loader2, FileIcon } from 'lucide-react';

interface AttachmentManagerProps {
  selectedAttachments: Attachment[];
  onAdd: (attachment: Attachment) => void;
  onRemove: (attachmentId: string) => void;
  allAttachments: Attachment[];
  onUpload: (file: File) => Promise<Attachment | null>;
  uploading: boolean;
  compact?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function AttachmentManager({
  selectedAttachments,
  onAdd,
  onRemove,
  allAttachments,
  onUpload,
  uploading,
  compact = false,
}: AttachmentManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('File must be under 10 MB');
      return;
    }
    const att = await onUpload(file);
    if (att) onAdd(att);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const availableAttachments = allAttachments.filter(
    (a) => !selectedAttachments.some((s) => s.id === a.id)
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Paperclip className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Attachments</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
          Upload
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Selected attachments */}
      {selectedAttachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedAttachments.map((att) => (
            <Badge key={att.id} variant="secondary" className="flex items-center gap-1 pr-1">
              <FileIcon className="h-3 w-3" />
              <span className="max-w-[150px] truncate text-xs">{att.file_name}</span>
              <span className="text-[10px] text-muted-foreground">({formatFileSize(att.file_size)})</span>
              <button
                type="button"
                onClick={() => onRemove(att.id)}
                className="ml-0.5 rounded-full hover:bg-destructive/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Quick-add from existing */}
      {!compact && availableAttachments.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Previously uploaded:</p>
          <div className="flex flex-wrap gap-1">
            {availableAttachments.slice(0, 8).map((att) => (
              <Badge
                key={att.id}
                variant="outline"
                className="cursor-pointer hover:bg-primary/10 hover:border-primary/50 transition-colors text-xs"
                onClick={() => onAdd(att)}
              >
                + {att.file_name}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
