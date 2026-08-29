import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  calculateBenchmarkStats,
  analyzePayloadCompression,
  type LatencyStats,
} from '@/lib/benchmark_profiler.utils';
import {
  Activity,
  Play,
  Zap,
  Clock,
  BarChart3,
  Server,
  StopCircle,
  FileArchive
} from 'lucide-react';

export function BenchmarkWorkspace() {
  const [url, setUrl] = useState('https://httpbin.org/get');
  const [method, setMethod] = useState('GET');
  const [totalRequests, setTotalRequests] = useState(25);
  const [concurrency, setConcurrency] = useState(5);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  // Results State
  const [stats, setStats] = useState<LatencyStats | null>(null);

  // Compression tab state
  const [samplePayload, setSamplePayload] = useState(
    JSON.stringify(
      {
        status: 'success',
        users: Array.from({ length: 20 }, (_, i) => ({
          id: i + 1,
          name: `User ${i + 1}`,
          email: `user${i + 1}@example.com`,
          role: i % 2 === 0 ? 'admin' : 'member',
          preferences: { theme: 'dark', notifications: true },
        })),
      },
      null,
      2
    )
  );

  const compressionStats = analyzePayloadCompression(samplePayload);

  const runBenchmark = async () => {
    setIsRunning(true);
    setProgress(0);
    setStats(null);

    const latencies: number[] = [];
    const statusCodes: number[] = [];
    const startTime = performance.now();

    let completed = 0;
    const queue = Array.from({ length: totalRequests }, (_, i) => i);

    const worker = async () => {
      while (queue.length > 0) {
        queue.shift();
        const reqStart = performance.now();
        try {
          const res = await fetch(url, {
            method,
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
          });
          const reqEnd = performance.now();
          latencies.push(reqEnd - reqStart);
          statusCodes.push(res.status);
        } catch {
          const reqEnd = performance.now();
          latencies.push(reqEnd - reqStart);
          statusCodes.push(0); // network / CORS error
        }

        completed++;
        setProgress(Math.round((completed / totalRequests) * 100));
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, totalRequests) }, () => worker());
    await Promise.all(workers);

    const totalDuration = performance.now() - startTime;
    const computedStats = calculateBenchmarkStats(latencies, statusCodes, totalDuration);
    setStats(computedStats);
    setIsRunning(false);
    toast.success(`Benchmark complete! ${computedStats.requestsPerSecond} req/s`);
  };

  return (
    <div className="h-full flex flex-col bg-background p-4 gap-4 overflow-hidden">
      
      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-muted/20 border rounded-lg shadow-sm shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold tracking-tight">API Benchmark & Latency Profiler</h1>
              <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider text-amber-500 border-amber-500/30">
                Load Tester
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Run concurrency stress tests, measure p50/p90/p99 latency percentiles, and analyze payload compression.
            </p>
          </div>
        </div>
      </div>

      {/* BENCHMARK CONFIG BAR */}
      <div className="p-3 border rounded-lg bg-background flex flex-col md:flex-row items-center gap-3 shrink-0">
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger className="w-24 h-9 text-xs font-mono font-bold"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="GET" className="font-mono text-xs text-emerald-500">GET</SelectItem>
            <SelectItem value="POST" className="font-mono text-xs text-blue-500">POST</SelectItem>
            <SelectItem value="PUT" className="font-mono text-xs text-amber-500">PUT</SelectItem>
            <SelectItem value="DELETE" className="font-mono text-xs text-red-500">DELETE</SelectItem>
          </SelectContent>
        </Select>

        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.example.com/v1/endpoint"
          className="font-mono text-xs h-9 flex-1"
        />

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <Label className="text-[11px] text-muted-foreground">Requests:</Label>
            <Select value={String(totalRequests)} onValueChange={(v) => setTotalRequests(Number(v))}>
              <SelectTrigger className="w-20 h-9 text-xs font-mono"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10" className="text-xs font-mono">10</SelectItem>
                <SelectItem value="25" className="text-xs font-mono">25</SelectItem>
                <SelectItem value="50" className="text-xs font-mono">50</SelectItem>
                <SelectItem value="100" className="text-xs font-mono">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-1">
            <Label className="text-[11px] text-muted-foreground">Concurrency:</Label>
            <Select value={String(concurrency)} onValueChange={(v) => setConcurrency(Number(v))}>
              <SelectTrigger className="w-16 h-9 text-xs font-mono"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1" className="text-xs font-mono">1</SelectItem>
                <SelectItem value="5" className="text-xs font-mono">5</SelectItem>
                <SelectItem value="10" className="text-xs font-mono">10</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={runBenchmark}
            disabled={isRunning}
            className="h-9 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold"
          >
            {isRunning ? (
              <>
                <StopCircle className="w-3.5 h-3.5 mr-1 animate-spin" /> Running ({progress}%)
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 mr-1" /> Start Test
              </>
            )}
          </Button>
        </div>
      </div>

      {/* RESULTS GRID */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-4">
        
        {/* STATS TILES (8 COLS) */}
        <div className="md:col-span-8 flex flex-col gap-3 min-h-0">
          
          {stats ? (
            <div className="flex-1 border rounded-lg bg-background p-4 flex flex-col gap-4 overflow-y-auto mac-scrollbar">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 border rounded-lg bg-muted/10 space-y-1">
                  <span className="text-[11px] text-muted-foreground uppercase font-semibold flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500" /> Throughput
                  </span>
                  <div className="text-lg font-bold font-mono text-amber-500">
                    {stats.requestsPerSecond} <span className="text-xs text-muted-foreground">req/s</span>
                  </div>
                </div>

                <div className="p-3 border rounded-lg bg-muted/10 space-y-1">
                  <span className="text-[11px] text-muted-foreground uppercase font-semibold flex items-center gap-1">
                    <Clock className="w-3 h-3 text-blue-500" /> Mean Latency
                  </span>
                  <div className="text-lg font-bold font-mono">
                    {stats.mean} <span className="text-xs text-muted-foreground">ms</span>
                  </div>
                </div>

                <div className="p-3 border rounded-lg bg-muted/10 space-y-1">
                  <span className="text-[11px] text-muted-foreground uppercase font-semibold flex items-center gap-1">
                    <BarChart3 className="w-3 h-3 text-purple-500" /> Median (p50)
                  </span>
                  <div className="text-lg font-bold font-mono">
                    {stats.p50} <span className="text-xs text-muted-foreground">ms</span>
                  </div>
                </div>

                <div className="p-3 border rounded-lg bg-muted/10 space-y-1">
                  <span className="text-[11px] text-muted-foreground uppercase font-semibold flex items-center gap-1">
                    <BarChart3 className="w-3 h-3 text-red-500" /> 99th % (p99)
                  </span>
                  <div className="text-lg font-bold font-mono text-red-500">
                    {stats.p99} <span className="text-xs text-muted-foreground">ms</span>
                  </div>
                </div>
              </div>

              {/* Percentile Breakdown Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="p-2 border-b bg-muted/20 text-xs font-bold uppercase tracking-wider">
                  Latency Percentile Distribution
                </div>
                <div className="grid grid-cols-6 p-3 text-center text-xs font-mono">
                  <div>
                    <div className="text-muted-foreground text-[10px]">MIN</div>
                    <div className="font-bold">{stats.min}ms</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-[10px]">p50</div>
                    <div className="font-bold">{stats.p50}ms</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-[10px]">p90</div>
                    <div className="font-bold">{stats.p90}ms</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-[10px]">p95</div>
                    <div className="font-bold">{stats.p95}ms</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-[10px]">p99</div>
                    <div className="font-bold">{stats.p99}ms</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-[10px]">MAX</div>
                    <div className="font-bold">{stats.max}ms</div>
                  </div>
                </div>
              </div>

              {/* Status Code Distribution */}
              <div className="border rounded-lg p-3 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Server className="w-3.5 h-3.5" /> HTTP Status Codes
                </span>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.statusCodes).map(([code, count]) => (
                    <Badge
                      key={code}
                      variant="outline"
                      className={`text-xs font-mono ${
                        Number(code) >= 200 && Number(code) < 300
                          ? 'border-emerald-500 text-emerald-500'
                          : 'border-red-500 text-red-500'
                      }`}
                    >
                      {code === '0' ? 'CORS / Net Err' : `HTTP ${code}`}: {count} requests
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 border rounded-lg bg-background flex flex-col items-center justify-center p-6 text-center text-muted-foreground space-y-2">
              <Activity className="w-12 h-12 text-muted-foreground/30 animate-pulse" />
              <div className="text-sm font-semibold">Ready to Benchmark</div>
              <p className="text-xs max-w-sm">
                Enter an endpoint above and click &quot;Start Test&quot; to execute real-time concurrency load tests.
              </p>
            </div>
          )}
        </div>

        {/* PAYLOAD COMPRESSION SIMULATOR (4 COLS) */}
        <div className="md:col-span-4 border rounded-lg bg-background p-4 flex flex-col gap-3 min-h-0">
          <div className="flex items-center justify-between pb-2 border-b">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileArchive className="w-3.5 h-3.5 text-amber-500" /> Payload Compression
            </span>
          </div>

          <div className="space-y-1 flex-1 flex flex-col min-h-0">
            <Label className="text-[11px] text-muted-foreground">Sample JSON Response Payload</Label>
            <Textarea
              value={samplePayload}
              onChange={(e) => setSamplePayload(e.target.value)}
              className="font-mono text-xs flex-1 resize-none mac-scrollbar"
            />
          </div>

          <div className="p-3 border rounded-lg bg-muted/10 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Raw Size:</span>
              <span className="font-mono font-bold">{compressionStats.rawBytes} bytes</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Gzip (estimated):</span>
              <span className="font-mono font-bold text-emerald-500">{compressionStats.gzipEstimatedBytes} bytes</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Brotli (estimated):</span>
              <span className="font-mono font-bold text-emerald-500">{compressionStats.brotliEstimatedBytes} bytes</span>
            </div>
            <div className="pt-1 border-t flex items-center justify-between font-semibold">
              <span>Bandwidth Saved:</span>
              <Badge className="bg-emerald-600 text-white font-mono text-[10px]">
                ~{compressionStats.estimatedSavingsPercent}%
              </Badge>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
