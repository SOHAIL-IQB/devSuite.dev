import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Clock, RefreshCw, Copy, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';

export function EpochConverter() {
  const [currentUnix, setCurrentUnix] = useState(Math.floor(Date.now() / 1000));
  
  const [seconds, setSeconds] = useState(currentUnix.toString());
  const [milliseconds, setMilliseconds] = useState((currentUnix * 1000).toString());
  const [isoString, setIsoString] = useState(new Date().toISOString());
  const [localString, setLocalString] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"));

  const [dateObj, setDateObj] = useState<Date>(new Date());

  // Ticking clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentUnix(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label}`);
  };

  const updateFromDate = (date: Date) => {
    if (!isValid(date)) return;
    setDateObj(date);
    setSeconds(Math.floor(date.getTime() / 1000).toString());
    setMilliseconds(date.getTime().toString());
    setIsoString(date.toISOString());
    setLocalString(format(date, "yyyy-MM-dd'T'HH:mm:ss"));
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
    const parsed = parseISO(val);
    if (isValid(parsed)) {
      updateFromDate(parsed);
    }
  };

  const handleLocalChange = (val: string) => {
    setLocalString(val);
    const parsed = new Date(val);
    if (isValid(parsed)) {
      updateFromDate(parsed);
    }
  };

  const setNow = () => {
    updateFromDate(new Date());
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="w-8 h-8 text-primary" />
            Epoch Converter
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Convert Unix timestamps to dates and vice versa instantly.
          </p>
        </div>
        
        {/* Live Clock Widget */}
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex flex-col items-center justify-center cursor-pointer hover:bg-primary/20 transition-colors" onClick={() => handleCopy(currentUnix.toString(), 'Current Epoch')}>
          <span className="text-[10px] uppercase font-bold tracking-wider text-primary mb-1">Current Unix Time</span>
          <div className="font-mono text-xl font-semibold text-primary">{currentUnix}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Conversion Inputs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Bi-directional Conversion
            </CardTitle>
            <CardDescription>Edit any field below to sync the others.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Timestamp (Seconds)</label>
              <div className="flex gap-2">
                <Input 
                  value={seconds} 
                  onChange={(e) => handleSecondsChange(e.target.value)} 
                  className="font-mono text-sm"
                  placeholder="e.g. 1716478200"
                />
                <Button variant="outline" size="icon" onClick={() => handleCopy(seconds, 'Seconds Timestamp')}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Timestamp (Milliseconds)</label>
              <div className="flex gap-2">
                <Input 
                  value={milliseconds} 
                  onChange={(e) => handleMillisecondsChange(e.target.value)} 
                  className="font-mono text-sm"
                  placeholder="e.g. 1716478200000"
                />
                <Button variant="outline" size="icon" onClick={() => handleCopy(milliseconds, 'Milliseconds Timestamp')}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-1.5 pt-4 border-t">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">ISO 8601 (UTC)</label>
              <div className="flex gap-2">
                <Input 
                  value={isoString} 
                  onChange={(e) => handleIsoChange(e.target.value)} 
                  className="font-mono text-sm"
                  placeholder="2024-05-23T15:30:00.000Z"
                />
                <Button variant="outline" size="icon" onClick={() => handleCopy(isoString, 'ISO Date')}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Local Date / Time</label>
              <div className="flex gap-2">
                <Input 
                  type="datetime-local"
                  value={localString} 
                  onChange={(e) => handleLocalChange(e.target.value)} 
                  className="font-mono text-sm"
                  step="1"
                />
                <Button variant="outline" size="icon" onClick={() => handleCopy(localString, 'Local Date')}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Button className="w-full mt-2" variant="secondary" onClick={setNow}>
              Set to Current Time
            </Button>

          </CardContent>
        </Card>

        {/* Results / Formatted Displays */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              Human Readable Output
            </CardTitle>
            <CardDescription>Standard formats for the parsed timestamp.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-sm font-medium text-muted-foreground">Relative Time</span>
                <span className="text-sm font-semibold text-primary">{isValid(dateObj) ? formatDistanceToNow(dateObj, { addSuffix: true }) : 'Invalid Date'}</span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-sm font-medium text-muted-foreground">Local Timezone</span>
                <span className="text-sm font-mono">{isValid(dateObj) ? format(dateObj, 'PPpp') : 'Invalid Date'}</span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-sm font-medium text-muted-foreground">GMT / UTC</span>
                <span className="text-sm font-mono">{isValid(dateObj) ? dateObj.toUTCString() : 'Invalid Date'}</span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-sm font-medium text-muted-foreground">Unix Seconds</span>
                <span className="text-sm font-mono text-muted-foreground">{seconds}</span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-sm font-medium text-muted-foreground">Day of Year</span>
                <span className="text-sm font-mono">{isValid(dateObj) ? format(dateObj, 'DDD') : '-'}</span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-sm font-medium text-muted-foreground">Week of Year</span>
                <span className="text-sm font-mono">{isValid(dateObj) ? format(dateObj, 'ww') : '-'}</span>
              </div>
              <div className="flex justify-between items-center pb-2">
                <span className="text-sm font-medium text-muted-foreground">Leap Year?</span>
                <span className="text-sm font-mono">
                  {isValid(dateObj) ? (
                    new Date(dateObj.getFullYear(), 1, 29).getMonth() === 1 ? 'Yes' : 'No'
                  ) : '-'}
                </span>
              </div>
            </div>

          </CardContent>
        </Card>

      </div>
    </div>
  );
}
