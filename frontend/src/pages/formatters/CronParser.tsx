import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarClock, AlertCircle, CheckCircle2, ChevronRight, Library, Globe2 } from 'lucide-react';
import cronstrue from 'cronstrue';
import { CronExpressionParser } from 'cron-parser';
import { formatInTimeZone } from 'date-fns-tz';

const CRON_LIBRARY = [
  { name: 'Every minute', expr: '* * * * *' },
  { name: 'Every 5 minutes', expr: '*/5 * * * *' },
  { name: 'Every hour', expr: '0 * * * *' },
  { name: 'Every midnight', expr: '0 0 * * *' },
  { name: 'Every Sunday', expr: '0 0 * * 0' },
  { name: 'Weekdays at 9 AM', expr: '0 9 * * 1-5' },
  { name: '1st of Month', expr: '0 0 1 * *' },
];

const CRON_PARTS = [
  { name: 'Minute', desc: '0-59' },
  { name: 'Hour', desc: '0-23' },
  { name: 'Day of Month', desc: '1-31' },
  { name: 'Month', desc: '1-12' },
  { name: 'Day of Week', desc: '0-6 (Sun-Sat)' }
];

const COMMON_TIMEZONES = [
  { value: Intl.DateTimeFormat().resolvedOptions().timeZone, label: 'Local System Time' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
];

export function CronParser() {
  const [cron, setCron] = useState('0 9 * * 1-5');
  const [english, setEnglish] = useState('');
  const [error, setError] = useState('');
  const [nextDates, setNextDates] = useState<Date[]>([]);
  const [parts, setParts] = useState<string[]>(['0', '9', '*', '*', '1-5']);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);

  useEffect(() => {
    try {
      if (!cron.trim()) {
        throw new Error('Please enter a cron expression.');
      }
      
      const partsArray = cron.trim().split(/\s+/);
      setParts(partsArray);

      if (partsArray.length !== 5 && partsArray.length !== 6) {
        throw new Error(`Cron expressions must have 5 or 6 segments. You provided ${partsArray.length}.`);
      }

      // Translate to English
      let humanReadable = '';
      try {
        humanReadable = cronstrue.toString(cron, { throwExceptionOnParseError: true });
      } catch (e: any) {
        throw new Error(e.toString().replace('Error: ', 'Syntax Error: '));
      }
      
      setEnglish(humanReadable);
      
      // Calculate next 5 dates with Timezone Support
      const interval = CronExpressionParser.parse(cron, { tz: timezone });
      const upcoming = [];
      for (let i = 0; i < 5; i++) {
        upcoming.push(interval.next().toDate());
      }
      setNextDates(upcoming);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Invalid cron expression');
      setEnglish('');
      setNextDates([]);
      const rawParts = cron.trim().split(/\s+/);
      setParts(rawParts.length > 0 && rawParts[0] !== "" ? rawParts : []);
    }
  }, [cron, timezone]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CalendarClock className="w-8 h-8 text-indigo-500" />
            Cron Expression Parser
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Translate arcane cron strings into plain English and view timezone-aware upcoming schedules.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-lg border">
          <Globe2 className="w-4 h-4 text-muted-foreground ml-2" />
          <select 
            className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer outline-none w-[200px]"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          >
            {COMMON_TIMEZONES.map(tz => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Editor Side */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-indigo-500/20 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/10 border-b pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Cron Expression</CardTitle>
                <div className="flex gap-2">
                  {error ? (
                    <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 mr-1.5" /> Invalid Expression
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Valid
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <Input 
                value={cron}
                onChange={(e) => setCron(e.target.value)}
                className={`font-mono text-2xl py-8 tracking-widest text-center shadow-inner transition-colors ${error ? 'border-red-500/50 focus-visible:ring-red-500/20' : 'focus-visible:ring-indigo-500/20'}`}
                placeholder="* * * * *"
                spellCheck={false}
              />

              {error && (
                <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-red-600">Parsing Diagnostics</h4>
                    <p className="text-xs text-red-500/80 mt-1 leading-relaxed">{error}</p>
                  </div>
                </div>
              )}
              
              {!error && english && (
                <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-lg p-5 text-center cursor-pointer hover:bg-indigo-500/10 transition-colors" onClick={() => copyToClipboard(english)} title="Click to copy explanation">
                  <span className="text-xl font-medium text-indigo-600 dark:text-indigo-400">"{english}"</span>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-2 font-semibold">Human Readable Output</div>
                </div>
              )}

              <div className="grid grid-cols-5 gap-2 pt-2">
                {CRON_PARTS.map((p, i) => {
                  const partVal = parts[i];
                  const isMissing = !partVal && error;
                  return (
                    <div key={i} className={`flex flex-col items-center p-3 border rounded-md transition-colors ${isMissing ? 'bg-red-500/5 border-red-500/30' : 'bg-muted/30'}`}>
                      <span className={`font-mono text-lg font-bold mb-1.5 ${isMissing ? 'text-red-500' : ''}`}>{partVal || '-'}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center mb-1">{p.name}</span>
                      <span className="text-[9px] text-muted-foreground/60">{p.desc}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Snippets Library */}
          <Card>
            <CardHeader className="pb-3 bg-muted/10 border-b">
              <CardTitle className="text-sm flex items-center gap-2">
                <Library className="w-4 h-4 text-muted-foreground" />
                Quick Snippets Library
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-2">
                {CRON_LIBRARY.map((lib, i) => (
                  <Button 
                    key={i} 
                    variant="secondary" 
                    size="sm" 
                    className="text-xs hover:bg-indigo-500 hover:text-white transition-colors"
                    onClick={() => setCron(lib.expr)}
                  >
                    {lib.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results Side */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="h-full border-indigo-500/10 shadow-sm flex flex-col">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle className="text-lg">Upcoming Executions</CardTitle>
              <CardDescription>Formatted for <span className="font-semibold text-foreground">{COMMON_TIMEZONES.find(t => t.value === timezone)?.label || timezone}</span></CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col pt-6">
              {error ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-muted-foreground text-center">
                  <AlertCircle className="w-10 h-10 mb-4 opacity-20 text-red-500" />
                  <p className="text-sm font-medium">Unable to calculate schedule.</p>
                  <p className="text-xs opacity-70 mt-1 max-w-[200px]">Fix the syntax errors in your expression to view upcoming executions.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {nextDates.map((date, i) => (
                    <div key={i} className="flex items-center justify-between p-3.5 border rounded-lg bg-background hover:border-indigo-500/30 hover:shadow-sm transition-all group">
                      <div className="flex items-center gap-3.5">
                        <div className="w-7 h-7 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold border border-indigo-500/20 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{formatInTimeZone(date, timezone, 'EEEE, MMM do, yyyy')}</p>
                          <p className="text-xs font-mono text-muted-foreground mt-0.5">{formatInTimeZone(date, timezone, 'hh:mm:ss a (zzzz)')}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-indigo-500 transition-colors" />
                    </div>
                  ))}
                  
                  <div className="mt-6 p-4 bg-muted/30 rounded-lg text-xs text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">DST Safe:</strong> Executions are calculated dynamically using the IANA timezone database to accurately account for Daylight Saving Time shifts.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
