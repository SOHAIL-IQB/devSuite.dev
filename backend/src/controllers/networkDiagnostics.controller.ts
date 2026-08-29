import { Request, Response } from 'express';
import { networkDiagnosticsService } from '../services/networkDiagnostics.service';

export const queryDns = async (req: Request, res: Response): Promise<void> => {
  try {
    const { domain, recordType } = req.body || {};
    if (!domain || typeof domain !== 'string') {
      res.status(400).json({ error: 'Valid domain name is required' });
      return;
    }

    const result = await networkDiagnosticsService.resolveDns(domain, recordType || 'A');
    res.json({ success: true, result });
  } catch (error: any) {
    console.error('DNS Query error:', error);
    res.status(500).json({ error: error.message || 'DNS resolution failed' });
  }
};

export const inspectSsl = async (req: Request, res: Response): Promise<void> => {
  try {
    const { host, port } = req.body || {};
    if (!host || typeof host !== 'string') {
      res.status(400).json({ error: 'Valid host name is required' });
      return;
    }

    const result = await networkDiagnosticsService.inspectSsl(host, Number(port) || 443);
    res.json({ success: true, result });
  } catch (error: any) {
    console.error('SSL Inspection error:', error);
    res.status(500).json({ error: error.message || 'SSL inspection failed' });
  }
};
