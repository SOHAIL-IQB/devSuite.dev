import { Request, Response } from 'express';
import { webhookBinService } from '../services/webhookBin.service';

export const createNewBin = (req: Request, res: Response): void => {
  try {
    const { statusCode, contentType, responseBody, customHeaders } = req.body || {};
    const bin = webhookBinService.createBin({
      statusCode,
      contentType,
      responseBody,
      customHeaders,
    });

    res.status(201).json({
      success: true,
      bin,
    });
  } catch (error) {
    console.error('Error creating webhook bin:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getBinDetails = (req: Request, res: Response): void => {
  try {
    const binId = String(req.params.binId);
    let bin = webhookBinService.getBin(binId);

    if (!bin) {
      // If bin doesn't exist, create it on demand so user can view immediate results
      bin = webhookBinService.createBin();
      bin.id = binId;
    }

    res.json({
      success: true,
      bin,
    });
  } catch (error) {
    console.error('Error fetching bin details:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updateBinConfig = (req: Request, res: Response): void => {
  try {
    const binId = String(req.params.binId);
    const { statusCode, contentType, responseBody, customHeaders } = req.body;

    const updated = webhookBinService.updateBinConfig(binId, {
      statusCode: statusCode !== undefined ? Number(statusCode) : undefined,
      contentType,
      responseBody,
      customHeaders,
    });

    if (!updated) {
      res.status(404).json({ error: 'Webhook bin not found' });
      return;
    }

    res.json({
      success: true,
      bin: updated,
    });
  } catch (error) {
    console.error('Error updating bin config:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const clearBinRequests = (req: Request, res: Response): void => {
  try {
    const binId = String(req.params.binId);
    const success = webhookBinService.clearRequests(binId);

    if (!success) {
      res.status(404).json({ error: 'Webhook bin not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Requests cleared successfully',
    });
  } catch (error) {
    console.error('Error clearing bin requests:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const handleIncomingWebhook = (req: Request, res: Response): void => {
  try {
    const binId = String(req.params.binId);
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

    const result = webhookBinService.recordRequest(binId, {
      method: req.method,
      url: req.originalUrl,
      path: req.path,
      queryParams: req.query,
      headers: req.headers,
      body: req.body,
      clientIp,
    });

    const binConfig = result?.bin.config || {
      statusCode: 200,
      contentType: 'application/json',
      responseBody: '{"success": true}',
    };

    // Apply custom response headers
    if (binConfig.customHeaders) {
      for (const [headerKey, headerVal] of Object.entries(binConfig.customHeaders)) {
        res.setHeader(headerKey, headerVal);
      }
    }

    res.setHeader('Content-Type', binConfig.contentType || 'application/json');
    res.status(binConfig.statusCode || 200).send(binConfig.responseBody || '');
  } catch (error) {
    console.error('Error processing incoming webhook:', error);
    res.status(500).json({ error: 'Failed to capture webhook' });
  }
};
