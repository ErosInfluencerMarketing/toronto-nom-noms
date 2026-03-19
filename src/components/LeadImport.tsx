import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { LeadFormData, Platform, LeadStatus } from '@/types/lead';
import { toast } from 'sonner';

interface LeadImportProps {
  onImport: (leads: LeadFormData[]) => Promise<void>;
  isLoading: boolean;
}

interface ParsedRow {
  business_name?: string;
  owner_name?: string;
  email?: string;
  instagram_handle?: string;
  platform?: string;
  status?: string;
  next_outreach_date?: string;
  notes?: string;
}

const VALID_PLATFORMS: Platform[] = ['eros', 'noms'];
const VALID_STATUSES: LeadStatus[] = ['new', 'contacted', 'demo_booked', 'onboarded'];

const normalizeHeader = (header: string): string => {
  return header
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
};

const parseDate = (value: unknown): string | undefined => {
  if (!value) return undefined;
  
  if (typeof value === 'number') {
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
  }
  
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  }
  
  return undefined;
};

export function LeadImport({ onImport, isLoading }: LeadImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [parsedLeads, setParsedLeads] = useState<LeadFormData[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const leads: LeadFormData[] = [];
    const parseErrors: string[] = [];

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<ParsedRow>(worksheet, { 
        raw: false,
        defval: ''
      });

      // Normalize headers
      const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { raw: true });
      
      rawData.forEach((row, index) => {
        const normalizedRow: Record<string, unknown> = {};
        Object.entries(row).forEach(([key, value]) => {
          normalizedRow[normalizeHeader(key)] = value;
        });

        const businessName = normalizedRow.business_name || normalizedRow.businessname || normalizedRow.name || '';

        const platformRaw = String(normalizedRow.platform || 'eros').toLowerCase().trim();
        const platform: Platform = VALID_PLATFORMS.includes(platformRaw as Platform) 
          ? (platformRaw as Platform) 
          : 'eros';

        const statusRaw = String(normalizedRow.status || 'new').toLowerCase().trim().replace(/\s+/g, '_');
        const status: LeadStatus = VALID_STATUSES.includes(statusRaw as LeadStatus)
          ? (statusRaw as LeadStatus)
          : 'new';

        leads.push({
          business_name: String(businessName).trim(),
          owner_name: normalizedRow.owner_name ? String(normalizedRow.owner_name).trim() : undefined,
          email: normalizedRow.email ? String(normalizedRow.email).trim() : undefined,
          instagram_handle: normalizedRow.instagram_handle || normalizedRow.instagram 
            ? normalizeInstagramHandle(String(normalizedRow.instagram_handle || normalizedRow.instagram))
            : undefined,
          platform,
          status,
          next_outreach_date: parseDate(normalizedRow.next_outreach_date),
          notes: normalizedRow.notes ? String(normalizedRow.notes).trim() : undefined,
        });
      });

      setParsedLeads(leads);
      setErrors(parseErrors);
      setIsDialogOpen(true);
    } catch (error) {
      toast.error('Failed to parse file. Please check the format.');
      console.error('Parse error:', error);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    try {
      await onImport(parsedLeads);
      setIsDialogOpen(false);
      setParsedLeads([]);
      setErrors([]);
      toast.success(`Successfully imported ${parsedLeads.length} leads`);
    } catch (error) {
      toast.error('Failed to import leads');
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFileSelect}
        className="hidden"
      />
      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        className="shrink-0"
      >
        <Upload className="h-4 w-4 mr-2" />
        Import
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Import Leads
            </DialogTitle>
            <DialogDescription>
              Review the parsed data from <span className="font-medium">{fileName}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {parsedLeads.length} leads ready to import
                </p>
                <p className="text-xs text-muted-foreground">
                  Platforms: {parsedLeads.filter(l => l.platform === 'eros').length} Eros, {parsedLeads.filter(l => l.platform === 'noms').length} Noms
                </p>
              </div>
            </div>

            {errors.length > 0 && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive">
                      {errors.length} rows skipped
                    </p>
                    <ul className="text-xs text-muted-foreground mt-1 space-y-0.5 max-h-24 overflow-y-auto">
                      {errors.slice(0, 5).map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                      {errors.length > 5 && (
                        <li>...and {errors.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">Expected columns:</p>
              <p>business_name (required), owner_name, email, instagram_handle, platform (eros/noms), status (new/contacted/demo_booked/onboarded), next_outreach_date, notes</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={parsedLeads.length === 0 || isLoading}
            >
              {isLoading ? 'Importing...' : `Import ${parsedLeads.length} Leads`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
