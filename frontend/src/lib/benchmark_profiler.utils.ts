export interface BenchmarkConfig {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
  totalRequests: number;
  concurrency: number;
  timeoutMs: number;
}

export interface LatencyStats {
  min: number;
  max: number;
  mean: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  stdDev: number;
  totalDurationMs: number;
  requestsPerSecond: number;
  successCount: number;
  errorCount: number;
  statusCodes: Record<number, number>;
}

/**
 * Calculates statistics across a list of measured latency times in milliseconds.
 */
export function calculateBenchmarkStats(
  latencies: number[],
  statusCodes: number[],
  totalDurationMs: number
): LatencyStats {
  if (latencies.length === 0) {
    return {
      min: 0,
      max: 0,
      mean: 0,
      p50: 0,
      p90: 0,
      p95: 0,
      p99: 0,
      stdDev: 0,
      totalDurationMs: 0,
      requestsPerSecond: 0,
      successCount: 0,
      errorCount: 0,
      statusCodes: {},
    };
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  const mean = sum / sorted.length;

  const getPercentile = (p: number) => {
    const idx = Math.min(Math.floor((p / 100) * sorted.length), sorted.length - 1);
    return sorted[idx];
  };

  const variance = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / sorted.length;
  const stdDev = Math.sqrt(variance);

  const codeCounts: Record<number, number> = {};
  let successCount = 0;
  let errorCount = 0;

  for (const code of statusCodes) {
    codeCounts[code] = (codeCounts[code] || 0) + 1;
    if (code >= 200 && code < 400) {
      successCount++;
    } else {
      errorCount++;
    }
  }

  const durationSec = Math.max(totalDurationMs / 1000, 0.001);
  const requestsPerSecond = Math.round((latencies.length / durationSec) * 100) / 100;

  return {
    min: Math.round(sorted[0] * 100) / 100,
    max: Math.round(sorted[sorted.length - 1] * 100) / 100,
    mean: Math.round(mean * 100) / 100,
    p50: Math.round(getPercentile(50) * 100) / 100,
    p90: Math.round(getPercentile(90) * 100) / 100,
    p95: Math.round(getPercentile(95) * 100) / 100,
    p99: Math.round(getPercentile(99) * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
    totalDurationMs: Math.round(totalDurationMs * 100) / 100,
    requestsPerSecond,
    successCount,
    errorCount,
    statusCodes: codeCounts,
  };
}

/**
 * Calculates raw byte size and estimates Gzip / Brotli compression savings.
 */
export function analyzePayloadCompression(text: string): {
  rawBytes: number;
  gzipEstimatedBytes: number;
  brotliEstimatedBytes: number;
  estimatedSavingsPercent: number;
} {
  const rawBytes = new TextEncoder().encode(text).length;
  if (rawBytes === 0) {
    return { rawBytes: 0, gzipEstimatedBytes: 0, brotliEstimatedBytes: 0, estimatedSavingsPercent: 0 };
  }

  // Typical JSON/text compression ratios
  const gzipEstimatedBytes = Math.max(Math.round(rawBytes * 0.32), 20);
  const brotliEstimatedBytes = Math.max(Math.round(rawBytes * 0.26), 18);
  const estimatedSavingsPercent = Math.round(((rawBytes - gzipEstimatedBytes) / rawBytes) * 100);

  return {
    rawBytes,
    gzipEstimatedBytes,
    brotliEstimatedBytes,
    estimatedSavingsPercent,
  };
}
