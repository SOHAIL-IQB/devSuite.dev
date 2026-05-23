import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarClock, AlertCircle, CheckCircle2, ChevronRight, Library } from 'lucide-react';
import cronstrue from 'cronstrue';
import parser from 'cron-parser';
import { format } from 'date-fns';

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

export function CronParser() {
  const [cron, setCron] = useState('0 9 * * 1-5');
  const [english, setEnglish] = useState('');
  const [error, setError] = useState('');
  const [nextDates, setNextDates] = useState<Date[]>([]);
  const [parts, setParts] = useState<string[]>(['0', '9', '*', '*', '1-5']);

  useEffect(() => {
    try {
      if (!cron.trim()) {
        throw new Error('Cron expression cannot be empty.');
      }
      
      const partsArray = cron.trim().split(/\s+/);
      if (partsArray.length !== 5 && partsArray.length !== 6) {
        throw new Error(`Expected 5 or 6 parts, got ${partsArray.length}.`);
      }
      
      setParts(partsArray);

      // Translate to English
      const humanReadable = cronstrue.toString(cron, { throwExceptionOnParseError: true });
      setEnglish(humanReadable);
      
      // Calculate next 5 dates
      const interval = parser.parse(cron);
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
      setParts(cron.trim().split(/\s+/));
    }
  }, [cron]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CalendarClock className="w-8 h-8 text-primary" />
            Cron Expression Parser
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Translate arcane cron strings into plain English and view upcoming schedules.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Editor Side */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Cron Expression</CardTitle>
                <div className="flex gap-2">
                  {error ? (
                    <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
                      <AlertCircle className="w-3 h-3 mr-1" /> Invalid
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Valid
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input 
                value={cron}
                onChange={(e) => setCron(e.target.value)}
                className="font-mono text-xl py-6 tracking-widest text-center"
                placeholder="* * * * *"
              />

              {error && (
                <div className="text-sm text-red-500 font-medium text-center">{error}</div>
              )}
              
              {!error && english && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center">
                  <span className="text-lg font-medium text-primary">"{english}"</span>
                </div>
              )}

              <div className="grid grid-cols-5 gap-2 pt-4">
                {CRON_PARTS.map((p, i) => (
                  <div key={i} className="flex flex-col items-center p-2 bg-muted/30 border rounded-md">
                    <span className="font-mono text-lg font-bold mb-1">{parts[i] || '-'}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-center">{p.name}</span>
                    <span className="text-[9px] text-muted-foreground/60">{p.desc}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Snippets Library */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Library className="w-4 h-4 text-muted-foreground" />
                Quick Snippets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {CRON_LIBRARY.map((lib, i) => (
                  <Button 
                    key={i} 
                    variant="secondary" 
                    size="sm" 
                    className="text-xs"
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
        <div className="space-y-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">Next Executions</CardTitle>
              <CardDescription>Based on your local system timezone</CardDescription>
            </CardHeader>
            <CardContent>
              {error ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <AlertCircle className="w-8 h-8 mb-3 opacity-20" />
                  <p>Fix the syntax errors to view upcoming schedules.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {nextDates.map((date, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{format(date, 'PPPP')}</p>
                          <p className="text-xs text-muted-foreground">{format(date, 'hh:mm:ss a (z)')}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
