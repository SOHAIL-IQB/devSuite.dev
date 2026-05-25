import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Palette, Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { colord, extend } from 'colord';
import cmykPlugin from 'colord/plugins/cmyk';
import namesPlugin from 'colord/plugins/names';

extend([cmykPlugin, namesPlugin]);

export function ColorConverter() {
  const [inputColor, setInputColor] = useState('#3b82f6'); // default blue
  const [isValid, setIsValid] = useState(true);

  // Parsed outputs
  const [hex, setHex] = useState('');
  const [rgb, setRgb] = useState('');
  const [hsl, setHsl] = useState('');
  const [cmyk, setCmyk] = useState('');
  const [name, setName] = useState('');
  
  // Palette
  const [complementary, setComplementary] = useState('');
  const [analogous1, setAnalogous1] = useState('');
  const [analogous2, setAnalogous2] = useState('');

  // Update logic
  useEffect(() => {
    updateFromColor(inputColor);
  }, [inputColor]);

  const updateFromColor = (val: string) => {
    const c = colord(val);
    if (c.isValid()) {
      setIsValid(true);
      setHex(c.toHex());
      setRgb(c.toRgbString());
      setHsl(c.toHslString());
      setCmyk(c.toCmykString());
      setName(c.toName({ closest: true }) || 'Unknown');

      // Generate palette mathematically (colord natively doesn't have harmonies without plugin, so we shift Hue manually)
      const hslObj = c.toHsl();
      setComplementary(colord({ ...hslObj, h: (hslObj.h + 180) % 360 }).toHex());
      setAnalogous1(colord({ ...hslObj, h: (hslObj.h + 30) % 360 }).toHex());
      setAnalogous2(colord({ ...hslObj, h: (hslObj.h - 30 + 360) % 360 }).toHex());
    } else {
      setIsValid(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label}`);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Palette className="w-8 h-8 text-pink-500" />
            Color Format Converter
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Convert, tweak, and extract palettes omni-directionally.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Swatch & Input Panel */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-pink-500/20 shadow-sm overflow-hidden flex flex-col h-[400px]">
            {/* Massive Live Swatch */}
            <div 
              className="flex-1 transition-colors duration-300 relative group flex flex-col items-center justify-center"
              style={{ backgroundColor: isValid ? hex : 'transparent' }}
            >
              {!isValid && (
                <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center border-b border-red-500/20">
                  <span className="text-red-500 font-semibold tracking-wider uppercase text-sm">Invalid Color</span>
                </div>
              )}
              {isValid && (
                <Button 
                  variant="secondary" 
                  className="opacity-0 group-hover:opacity-100 transition-opacity bg-background/50 backdrop-blur border-none hover:bg-background/80"
                  onClick={() => handleCopy(hex, 'Color')}
                >
                  <Copy className="w-4 h-4 mr-2" /> Copy Color
                </Button>
              )}
            </div>
            
            <CardContent className="p-6 bg-card border-t border-border">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Universal Input</label>
                <div className="flex gap-2">
                  <Input 
                    value={inputColor}
                    onChange={(e) => setInputColor(e.target.value)}
                    className="font-mono text-lg py-6 focus-visible:ring-pink-500/20"
                    placeholder="#3b82f6 or rgb(59, 130, 246)"
                    spellCheck={false}
                  />
                </div>
                {isValid && (
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-2 flex justify-between">
                    <span>Closest Match:</span>
                    <span className="text-foreground capitalize">{name}</span>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Generated Palette */}
          {isValid && (
            <Card className="border-border shadow-sm">
              <CardHeader className="bg-muted/10 border-b pb-3 pt-4">
                <CardTitle className="text-sm">Generated Palette</CardTitle>
              </CardHeader>
              <CardContent className="p-4 grid grid-cols-3 gap-2">
                <PaletteSwatch color={analogous2} label="Analogous" />
                <PaletteSwatch color={complementary} label="Complementary" />
                <PaletteSwatch color={analogous1} label="Analogous" />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Readouts & Tweak Panel */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-border shadow-sm h-full flex flex-col">
            <CardHeader className="bg-muted/10 border-b pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-pink-500" />
                Format Readouts
              </CardTitle>
              <CardDescription>Click any field to copy or edit to convert back.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6 flex-1">
              
              <FormatRow label="HEX" value={hex} onChange={setInputColor} valid={isValid} />
              <FormatRow label="RGB" value={rgb} onChange={setInputColor} valid={isValid} />
              <FormatRow label="HSL" value={hsl} onChange={setInputColor} valid={isValid} />
              <FormatRow label="CMYK" value={cmyk} onChange={setInputColor} valid={isValid} />

            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}

function FormatRow({ label, value, onChange, valid }: { label: string, value: string, onChange: (val: string) => void, valid: boolean }) {
  const handleCopy = () => {
    if (valid) {
      navigator.clipboard.writeText(value);
      toast.success(`Copied ${label}`);
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</label>
      <div className="flex gap-2">
        <Input 
          value={valid ? value : ''} 
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-base bg-muted/30"
          placeholder={label}
        />
        <Button variant="outline" size="icon" onClick={handleCopy} disabled={!valid}>
          <Copy className="w-4 h-4 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}

function PaletteSwatch({ color, label }: { color: string, label: string }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(color);
    toast.success('Copied Palette Color');
  };

  return (
    <div className="flex flex-col gap-1 cursor-pointer group" onClick={handleCopy} title="Click to copy">
      <div className="h-16 rounded-md shadow-inner border border-black/5" style={{ backgroundColor: color }}></div>
      <div className="flex flex-col items-center mt-1">
        <span className="text-[10px] font-mono text-foreground font-semibold group-hover:text-pink-500 transition-colors">{color}</span>
        <span className="text-[9px] text-muted-foreground uppercase tracking-widest">{label}</span>
      </div>
    </div>
  );
}
