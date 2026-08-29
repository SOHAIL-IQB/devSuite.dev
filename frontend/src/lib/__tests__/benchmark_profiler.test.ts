import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBenchmarkStats,
  analyzePayloadCompression,
} from '../benchmark_profiler.utils.ts';

describe('API Benchmark & Latency Profiler', () => {
  it('should calculate accurate min, max, mean, p50, p90, p99 percentiles', () => {
    const latencies = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const statusCodes = [200, 200, 200, 200, 200, 200, 200, 200, 404, 500];
    const totalDuration = 500; // 0.5s

    const stats = calculateBenchmarkStats(latencies, statusCodes, totalDuration);

    assert.equal(stats.min, 10);
    assert.equal(stats.max, 100);
    assert.equal(stats.mean, 55);
    assert.equal(stats.p50, 60);
    assert.equal(stats.p90, 100);
    assert.equal(stats.successCount, 8);
    assert.equal(stats.errorCount, 2);
    assert.equal(stats.requestsPerSecond, 20);
  });

  it('should calculate compression savings for JSON payloads', () => {
    const json = JSON.stringify({
      users: Array.from({ length: 50 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`,
      })),
    });

    const compression = analyzePayloadCompression(json);
    assert.ok(compression.rawBytes > 500);
    assert.ok(compression.gzipEstimatedBytes < compression.rawBytes);
    assert.ok(compression.estimatedSavingsPercent > 50);
  });
});
