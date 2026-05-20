import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Copy, Trash2, Fingerprint } from 'lucide-react';
import { toast } from 'sonner';

export function UuidGenerator() {
  const [quantity, setQuantity] = useState('1');
  const [version, setVersion] = useState('v4');
  const [hyphens, setHyphens] = useState('true');
  const [uppercase, setUppercase] = useState('false');
  const [output, setOutput] = useState('');

  const generateUuidV4 = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Mathematical fallback for non-secure contexts
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  const generate = () => {
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1 || qty > 10000) {
      toast.error('Quantity must be between 1 and 10,000');
      return;
    }

    const results = [];
    for (let i = 0; i < qty; i++) {
      let uuid = '';
      if (version === 'v4') {
        uuid = generateUuidV4();
      } else {
        // Fallback or mock for others, v4 is only native one
        uuid = generateUuidV4();
      }

      if (hyphens === 'false') {
        uuid = uuid.replace(/-/g, '');
      }

      if (uppercase === 'true') {
        uuid = uuid.toUpperCase();
      }

      results.push(uuid);
    }

    setOutput(results.join('\n'));
    toast.success(`Generated ${qty} UUID(s)`);
  };

  const clear = () => {
    setOutput('');
  };

  const copyToClipboard = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="flex flex-col h-full bg-background p-6">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center">
            <Fingerprint className="w-5 h-5 mr-2 text-primary" /> UUID Generator
          </h2>
          <p className="text-muted-foreground text-sm mt-1">Generate secure UUIDs instantly.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 bg-muted/20 border rounded-lg shadow-sm">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Version</Label>
            <Select value={version} onValueChange={setVersion}>
              <SelectTrigger>
                <SelectValue placeholder="Version" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="v4">UUID v4 (Random)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Quantity</Label>
            <Input 
              type="number" 
              value={quantity} 
              onChange={(e) => setQuantity(e.target.value)} 
              min={1} 
              max={10000} 
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Hyphens</Label>
            <Select value={hyphens} onValueChange={setHyphens}>
              <SelectTrigger>
                <SelectValue placeholder="Hyphens" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Yes</SelectItem>
                <SelectItem value="false">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Uppercase</Label>
            <Select value={uppercase} onValueChange={setUppercase}>
              <SelectTrigger>
                <SelectValue placeholder="Uppercase" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">Lowercase</SelectItem>
                <SelectItem value="true">Uppercase</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button onClick={generate} className="px-6 font-semibold shadow-sm">
            <Play className="w-4 h-4 mr-2" /> Generate UUIDs
          </Button>
          <Button onClick={clear} variant="outline" className="shadow-sm">
            <Trash2 className="w-4 h-4 mr-2" /> Clear
          </Button>
          <Button onClick={copyToClipboard} variant="outline" className="shadow-sm" disabled={!output}>
            <Copy className="w-4 h-4 mr-2" /> Copy All
          </Button>
        </div>

        <div className="relative">
          <div className="absolute top-3 right-4 text-[11px] font-semibold text-muted-foreground tracking-widest uppercase">Output</div>
          <textarea
            readOnly
            value={output}
            placeholder="Generated UUIDs will appear here..."
            className="w-full h-[400px] p-4 font-mono text-sm bg-muted/10 border rounded-lg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 resize-none mac-scrollbar shadow-inner"
          />
        </div>

      </div>
    </div>
  );
}
