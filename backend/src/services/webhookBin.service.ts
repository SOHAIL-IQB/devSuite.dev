import { randomUUID } from 'crypto';

export interface CapturedRequest {
  id: string;
  method: string;
  url: string;
  path: string;
  queryParams: Record<string, any>;
  headers: Record<string, string | string[] | undefined>;
  body: any;
  rawBody: string;
  clientIp: string;
  size: number;
  timestamp: string;
}

export interface BinConfig {
  statusCode: number;
  contentType: string;
  responseBody: string;
  customHeaders?: Record<string, string>;
}

export interface WebhookBin {
  id: string;
  createdAt: string;
  updatedAt: string;
  config: BinConfig;
  requests: CapturedRequest[];
}

class WebhookBinService {
  private bins: Map<string, WebhookBin> = new Map();
  private maxRequestsPerBin = 50;
  private maxBins = 200;

  createBin(initialConfig?: Partial<BinConfig>): WebhookBin {
    // Evict oldest bin if capacity reached
    if (this.bins.size >= this.maxBins) {
      const oldestKey = this.bins.keys().next().value;
      if (oldestKey) this.bins.delete(oldestKey);
    }

    const id = 'bin_' + randomUUID().replace(/-/g, '').slice(0, 12);
    const now = new Date().toISOString();

    const bin: WebhookBin = {
      id,
      createdAt: now,
      updatedAt: now,
      config: {
        statusCode: initialConfig?.statusCode || 200,
        contentType: initialConfig?.contentType || 'application/json',
        responseBody: initialConfig?.responseBody || JSON.stringify({ success: true, message: 'Webhook received by DevSuite' }, null, 2),
        customHeaders: initialConfig?.customHeaders || {},
      },
      requests: [],
    };

    this.bins.set(id, bin);
    return bin;
  }

  getBin(binId: string): WebhookBin | null {
    return this.bins.get(binId) || null;
  }

  updateBinConfig(binId: string, configUpdates: Partial<BinConfig>): WebhookBin | null {
    const bin = this.bins.get(binId);
    if (!bin) return null;

    bin.config = {
      ...bin.config,
      ...configUpdates,
    };
    bin.updatedAt = new Date().toISOString();
    return bin;
  }

  recordRequest(
    binId: string,
    reqData: {
      method: string;
      url: string;
      path: string;
      queryParams: Record<string, any>;
      headers: Record<string, string | string[] | undefined>;
      body: any;
      clientIp: string;
    }
  ): { bin: WebhookBin; captured: CapturedRequest } | null {
    let bin = this.bins.get(binId);
    if (!bin) {
      // Auto-create bin if not exists on first request
      bin = this.createBin();
      this.bins.set(binId, bin);
      bin.id = binId;
    }

    const rawBody = typeof reqData.body === 'string' ? reqData.body : JSON.stringify(reqData.body || '');
    const size = Buffer.byteLength(rawBody, 'utf8');

    const captured: CapturedRequest = {
      id: randomUUID(),
      method: reqData.method.toUpperCase(),
      url: reqData.url,
      path: reqData.path || '/',
      queryParams: reqData.queryParams || {},
      headers: reqData.headers || {},
      body: reqData.body,
      rawBody,
      clientIp: reqData.clientIp || '127.0.0.1',
      size,
      timestamp: new Date().toISOString(),
    };

    // Prepend to requests list (newest first)
    bin.requests.unshift(captured);
    if (bin.requests.length > this.maxRequestsPerBin) {
      bin.requests = bin.requests.slice(0, this.maxRequestsPerBin);
    }
    bin.updatedAt = new Date().toISOString();

    return { bin, captured };
  }

  clearRequests(binId: string): boolean {
    const bin = this.bins.get(binId);
    if (!bin) return false;
    bin.requests = [];
    bin.updatedAt = new Date().toISOString();
    return true;
  }
}

export const webhookBinService = new WebhookBinService();
