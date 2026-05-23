import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Clock, RefreshCw, Copy, CalendarDays, Globe2, Sparkles, History } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, isValid } from 'date-fns';
import { formatInTimeZone, toDate } from 'date-fns-tz';
import * as chrono from 'chrono-node';

const COMMON_TIMEZONES = [
  { value: Intl.DateTimeFormat().resolvedOptions().timeZone, label: 'Local System Time' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
];

export function EpochConverter() {
  const [currentUnix, setCurrentUnix] = useState(Math.floor(Date.now() / 1000));
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  
  const [naturalInput, setNaturalInput] = useState('');
  const [seconds, setSeconds] = useState(currentUnix.toString());
  const [milliseconds, setMilliseconds] = useState((currentUnix * 1000).toString());
  const [isoString, setIsoString] = useState(new Date().toISOString());
  
  const [dateObj, setDateObj] = useState<Date>(new Date());
  
  // History
  const [history, setHistory] = useState<number[]>([]);

  // Ticking clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentUnix(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load history
  useEffect(() => {
    try {
      const saved = localStorage.getItem('devsuite_epoch_history');
      if (saved) setHistory(JSON.parse(saved));
    } catch(e) {}
  }, []);

  const saveToHistory = (unixSecs: number) => {
    setHistory(prev => {
      const newHist = [unixSecs, ...prev.filter(h => h !== unixSecs)].slice(0, 5);
      localStorage.setItem('devsuite_epoch_history', JSON.stringify(newHist));
      return newHist;
    });
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label}`);
  };

  const updateFromDate = (date: Date, skipSave = false) => {
    if (!isValid(date)) return;
    setDateObj(date);
    setSeconds(Math.floor(date.getTime() / 1000).toString());
    setMilliseconds(date.getTime().toString());
    setIsoString(date.toISOString());
    
    if (!skipSave) {
      saveToHistory(Math.floor(date.getTime() / 1000));
    }
  };

  const handleNaturalChange = (val: string) => {
    setNaturalInput(val);
    const parsedDate = chrono.parseDate(val);
    if (parsedDate && isValid(parsedDate)) {
      updateFromDate(parsedDate);
    }
  };

  const handleSecondsChange = (val: string) => {
    setSeconds(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed)) {
      updateFromDate(new Date(parsed * 1000));
    }
  };

  const handleMillisecondsChange = (val: string) => {
    setMilliseconds(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed)) {
      updateFromDate(new Date(parsed));
    }
  };

  const handleIsoChange = (val: string) => {
    setIsoString(val);
    try {
      const parsed = toDate(val);
      if (isValid(parsed)) {
        updateFromDate(parsed);
      }
    } catch(e) {}
  };

  const setNow = () => {
    updateFromDate(new Date());
    setNaturalInput('');
  };

  const loadFromHistory = (unixSec: number) => {
    updateFromDate(new Date(unixSec * 1000), true);
    setNaturalInput('');
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="w-8 h-8 text-teal-500" />
            Epoch Timestamp Converter
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Convert Unix timestamps, dates, and natural language instantly.
          </p>
        </div>
        
        {/* Live Clock Widget */}
        <div 
          className="bg-teal-500/10 border border-teal-500/20 rounded-lg p-3 flex flex-col items-center justify-center cursor-pointer hover:bg-teal-500/20 transition-all shadow-sm" 
          onClick={() => handleCopy(currentUnix.toString(), 'Current Epoch')}
          title="Click to copy current Unix time"
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-teal-600 dark:text-teal-400 mb-1">Live Unix Time</span>
          <div className="font-mono text-2xl font-bold text-teal-700 dark:text-teal-300 tracking-wider">{currentUnix}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-lg border w-fit">
        <Globe2 className="w-4 h-4 text-muted-foreground ml-2" />
        <select 
          className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer outline-none w-[250px]"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
        >
          {COMMON_TIMEZONES.map(tz => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Conversion Inputs */}
        <Card className="border-teal-500/10 shadow-sm flex flex-col h-full">
          <CardHeader className="bg-muted/10 border-b pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <RefreshCw className="w-5 h-5 text-teal-500" />
              Bi-directional Conversion
            </CardTitle>
            <CardDescription>Edit any field below to instantly sync the others.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6 flex-1 flex flex-col">
            
            <div className="space-y-2 bg-teal-500/5 border border-teal-500/20 p-4 rounded-lg">
              <label className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Natural Language
              </label>
              <Input 
                value={naturalInput} 
                onChange={(e) => handleNaturalChange(e.target.value)} 
                className="font-medium bg-background border-teal-500/20 focus-visible:ring-teal-500/20"
                placeholder="Try 'tomorrow at 5pm' or 'last Friday'"
              />
              <p className="text-[10px] text-muted-foreground">Powered by Chrono-Node AI parsing engine.</p>
            </div>

            <div className="space-y-4 flex-1">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Timestamp (Seconds)</label>
                <div className="flex gap-2">
                  <Input 
                    value={seconds} 
                    onChange={(e) => handleSecondsChange(e.target.value)} 
                    className="font-mono text-base bg-muted/30"
                    placeholder="e.g. 1716478200"
                  />
                  <Button variant="outline" size="icon" onClick={() => handleCopy(seconds, 'Seconds Timestamp')}>
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Timestamp (Milliseconds)</label>
                <div className="flex gap-2">
                  <Input 
                    value={milliseconds} 
                    onChange={(e) => handleMillisecondsChange(e.target.value)} 
                    className="font-mono text-base bg-muted/30"
                    placeholder="e.g. 1716478200000"
                  />
                  <Button variant="outline" size="icon" onClick={() => handleCopy(milliseconds, 'Milliseconds Timestamp')}>
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">ISO 8601 String</label>
                <div className="flex gap-2">
                  <Input 
                    value={isoString} 
                    onChange={(e) => handleIsoChange(e.target.value)} 
                    className="font-mono text-sm bg-muted/30"
                    placeholder="2024-05-23T15:30:00.000Z"
                  />
                  <Button variant="outline" size="icon" onClick={() => handleCopy(isoString, 'ISO Date')}>
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            </div>

            <Button className="w-full mt-4 hover:bg-teal-500 hover:text-white transition-colors" variant="secondary" onClick={setNow}>
              Set to Current Local Time
            </Button>

          </CardContent>
        </Card>

        {/* Results Side */}
        <div className="space-y-6">
          <Card className="border-teal-500/10 shadow-sm">
            <CardHeader className="bg-muted/10 border-b pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarDays className="w-5 h-5 text-teal-500" />
                Human Readable Output
              </CardTitle>
              <CardDescription>Formatted automatically using IANA Timezones.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 pt-6">
              
              <OutputRow 
                label="Relative Time" 
                value={isValid(dateObj) ? formatDistanceToNow(dateObj, { addSuffix: true }) : 'Invalid Date'} 
                accent 
              />
              <OutputRow 
                label="Selected Timezone" 
                value={isValid(dateObj) ? formatInTimeZone(dateObj, timezone, 'PPPP') : 'Invalid Date'} 
              />
              <OutputRow 
                label="Time (12-hour)" 
                value={isValid(dateObj) ? formatInTimeZone(dateObj, timezone, 'hh:mm:ss a (zzzz)') : 'Invalid Date'} 
              />
              <OutputRow 
                label="Time (24-hour)" 
                value={isValid(dateObj) ? formatInTimeZone(dateObj, timezone, 'HH:mm:ss') : 'Invalid Date'} 
              />
              <OutputRow 
                label="GMT / UTC" 
                value={isValid(dateObj) ? formatInTimeZone(dateObj, 'UTC', "yyyy-MM-dd HH:mm:ss 'UTC'") : 'Invalid Date'} 
              />
              <OutputRow 
                label="Day of Year" 
                value={isValid(dateObj) ? formatInTimeZone(dateObj, timezone, 'DDD') : '-'} 
              />
              
            </CardContent>
          </Card>

          {/* History */}
          <Card>
            <CardHeader className="pb-3 bg-muted/10 border-b">
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="w-4 h-4 text-muted-foreground" />
                Recent Conversions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {history.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-4 italic">No recent conversions.</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {history.map((unixSec, i) => (
                    <Button 
                      key={i} 
                      variant="secondary" 
                      size="sm" 
                      className="text-xs font-mono"
                      onClick={() => loadFromHistory(unixSec)}
                      title="Click to reload this timestamp"
                    >
                      {unixSec}
                    </Button>
                  ))}
                  <Button variant="ghost" size="sm" className="text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 ml-auto" onClick={() => { setHistory([]); localStorage.removeItem('devsuite_epoch_history'); }}>Clear</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}

function OutputRow({ label, value, accent = false }: { label: string, value: string, accent?: boolean }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    toast.success(`Copied ${label}`);
  };

  return (
    <div className="flex justify-between items-center py-3 border-b last:border-0 group hover:bg-muted/30 px-2 -mx-2 rounded transition-colors">
      <span className="text-sm font-semibold text-muted-foreground w-1/3">{label}</span>
      <div className="flex items-center gap-3 text-right">
        <span className={`text-sm ${accent ? 'font-bold text-teal-600 dark:text-teal-400' : 'font-mono text-foreground/90'}`}>
          {value}
        </span>
        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={handleCopy}>
          <Copy className="w-3.5 h-3.5 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}
