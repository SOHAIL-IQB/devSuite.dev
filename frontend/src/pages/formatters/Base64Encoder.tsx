import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Hash, ArrowRightLeft } from 'lucide-react';

export function Base64Encoder() {
  const [rawText, setRawText] = useState('');
  const [base64Text, setBase64Text] = useState('');
  const [lastEdited, setLastEdited] = useState<'raw' | 'base64' | null>(null);

  useEffect(() => {
    if (lastEdited === 'raw') {
      try {
        if (!rawText) {
          setBase64Text('');
          return;
        }
        setBase64Text(btoa(unescape(encodeURIComponent(rawText))));
      } catch (e) {
        // Handle invalid chars silently during typing
      }
    }
  }, [rawText, lastEdited]);

  useEffect(() => {
    if (lastEdited === 'base64') {
      try {
        if (!base64Text) {
          setRawText('');
          return;
        }
        setRawText(decodeURIComponent(escape(atob(base64Text))));
      } catch (e) {
        // Wait for valid base64 silently
      }
    }
  }, [base64Text, lastEdited]);

  return (
    <div className="h-full bg-background flex flex-col min-h-0">
      <div className="p-4 border-b bg-muted/5 shrink-0 flex items-center">
        <Hash className="w-5 h-5 mr-2 text-rose-500" />
        <h2 className="text-lg font-semibold">Base64 Encoder / Decoder</h2>
      </div>

      <div className="flex-1 p-6 flex flex-col md:flex-row gap-6 overflow-hidden items-stretch">
        
        {/* Raw Text */}
        <div className="flex-1 flex flex-col min-h-0">
          <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Raw Text
          </label>
          <Textarea 
            value={rawText}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
              setLastEdited('raw');
              setRawText(e.target.value);
            }}
            placeholder="Type raw string here..."
            className="flex-1 font-mono text-sm resize-none shadow-sm"
          />
        </div>

        {/* Divider icon */}
        <div className="flex items-center justify-center shrink-0">
          <ArrowRightLeft className="w-6 h-6 text-muted-foreground opacity-50 hidden md:block" />
        </div>

        {/* Base64 Text */}
        <div className="flex-1 flex flex-col min-h-0">
          <label className="text-sm font-semibold uppercase tracking-wider text-rose-500 mb-3">
            Base64 Encoded
          </label>
          <Textarea 
            value={base64Text}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
              setLastEdited('base64');
              setBase64Text(e.target.value);
            }}
            placeholder="Type base64 here..."
            className="flex-1 font-mono text-sm resize-none shadow-sm border-rose-500/20 focus-visible:ring-rose-500"
          />
        </div>

      </div>
    </div>
  );
}
