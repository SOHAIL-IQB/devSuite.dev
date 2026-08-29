import dns from 'dns';
import tls from 'tls';
import { promisify } from 'util';

const dnsPromises = dns.promises;

export interface DnsRecordResult {
  type: string;
  records: any[];
  latencyMs: number;
}

export interface SslCertResult {
  hostname: string;
  port: number;
  subject: {
    commonName?: string;
    organization?: string;
    country?: string;
  };
  issuer: {
    commonName?: string;
    organization?: string;
    country?: string;
  };
  validFrom: string;
  validTo: string;
  daysRemaining: number;
  isExpired: boolean;
  isExpiringSoon: boolean;
  serialNumber?: string;
  fingerprint256?: string;
  protocol?: string;
  cipher?: string;
  authorized: boolean;
  authorizationError?: string;
}

class NetworkDiagnosticsService {
  async resolveDns(domain: string, recordType = 'A'): Promise<DnsRecordResult> {
    const cleanDomain = domain.replace(/^https?:\/\//i, '').split('/')[0].split(':')[0].trim();
    const startTime = Date.now();
    const type = recordType.toUpperCase();

    let records: any[] = [];

    try {
      switch (type) {
        case 'A':
          records = await dnsPromises.resolve4(cleanDomain, { ttl: true });
          break;
        case 'AAAA':
          records = await dnsPromises.resolve6(cleanDomain, { ttl: true });
          break;
        case 'CNAME':
          records = await dnsPromises.resolveCname(cleanDomain);
          break;
        case 'MX':
          records = await dnsPromises.resolveMx(cleanDomain);
          break;
        case 'TXT':
          records = await dnsPromises.resolveTxt(cleanDomain);
          break;
        case 'NS':
          records = await dnsPromises.resolveNs(cleanDomain);
          break;
        case 'SOA':
          records = [await dnsPromises.resolveSoa(cleanDomain)];
          break;
        default:
          records = await dnsPromises.resolve4(cleanDomain, { ttl: true });
          break;
      }
    } catch (err: any) {
      if (err.code === 'ENODATA' || err.code === 'ENOTFOUND') {
        records = [];
      } else {
        throw err;
      }
    }

    const latencyMs = Date.now() - startTime;
    return {
      type,
      records: Array.isArray(records) ? records : [records],
      latencyMs,
    };
  }

  async inspectSsl(hostname: string, port = 443, timeoutMs = 8000): Promise<SslCertResult> {
    const cleanHost = hostname.replace(/^https?:\/\//i, '').split('/')[0].split(':')[0].trim();

    return new Promise((resolve, reject) => {
      const options: tls.ConnectionOptions = {
        host: cleanHost,
        port,
        servername: cleanHost,
        rejectUnauthorized: false,
        timeout: timeoutMs,
      };

      const socket = tls.connect(options, () => {
        try {
          const peerCert = socket.getPeerCertificate(true);
          const authorized = socket.authorized;
          const authorizationError = socket.authorizationError ? String(socket.authorizationError) : undefined;
          const protocol = socket.getProtocol() || 'TLS';
          const cipher = socket.getCipher()?.name;

          if (!peerCert || !peerCert.valid_to) {
            socket.destroy();
            reject(new Error('No peer certificate presented by server'));
            return;
          }

          const validFromDate = new Date(peerCert.valid_from);
          const validToDate = new Date(peerCert.valid_to);
          const now = new Date();
          const msRemaining = validToDate.getTime() - now.getTime();
          const daysRemaining = Math.floor(msRemaining / (1000 * 60 * 60 * 24));

          const formatField = (f: string | string[] | undefined): string | undefined =>
            Array.isArray(f) ? f.join(', ') : f;

          const result: SslCertResult = {
            hostname: cleanHost,
            port,
            subject: {
              commonName: formatField(peerCert.subject?.CN),
              organization: formatField(peerCert.subject?.O),
              country: formatField(peerCert.subject?.C),
            },
            issuer: {
              commonName: formatField(peerCert.issuer?.CN),
              organization: formatField(peerCert.issuer?.O),
              country: formatField(peerCert.issuer?.C),
            },
            validFrom: validFromDate.toISOString(),
            validTo: validToDate.toISOString(),
            daysRemaining,
            isExpired: daysRemaining < 0,
            isExpiringSoon: daysRemaining >= 0 && daysRemaining <= 30,
            serialNumber: peerCert.serialNumber,
            fingerprint256: peerCert.fingerprint256,
            protocol,
            cipher,
            authorized,
            authorizationError,
          };

          socket.destroy();
          resolve(result);
        } catch (e) {
          socket.destroy();
          reject(e);
        }
      });

      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error(`Connection to ${cleanHost}:${port} timed out after ${timeoutMs}ms`));
      });

      socket.on('error', (err) => {
        socket.destroy();
        reject(err);
      });
    });
  }
}

export const networkDiagnosticsService = new NetworkDiagnosticsService();
