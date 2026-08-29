import { URL } from 'url';
import dns from 'dns';
import net from 'net';

// Helper to check if an IPv4 address is in a private/internal range
export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map((part) => parseInt(part, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed IPv4 is treated as unsafe
  }

  const [a, b] = parts;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;
  // 10.0.0.0/8 (Private network)
  if (a === 10) return true;
  // 100.64.0.0/10 (Shared Address Space / CGNAT)
  if (a === 100 && b >= 64 && b <= 127) return true;
  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;
  // 169.254.0.0/16 (Link Local / Cloud Metadata e.g. AWS/GCP/Azure)
  if (a === 169 && b === 254) return true;
  // 172.16.0.0/12 (Private network)
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (a === 192 && b === 0 && parts[2] === 0) return true;
  // 192.0.2.0/24 (Documentation / Test-Net-1)
  if (a === 192 && b === 0 && parts[2] === 2) return true;
  // 192.168.0.0/16 (Private network)
  if (a === 192 && b === 168) return true;
  // 198.18.0.0/15 (Benchmark testing)
  if (a === 198 && (b === 18 || b === 19)) return true;
  // 198.51.100.0/24 (Test-Net-2)
  if (a === 198 && b === 51 && parts[2] === 100) return true;
  // 203.0.113.0/24 (Test-Net-3)
  if (a === 203 && b === 0 && parts[2] === 113) return true;
  // 224.0.0.0/4 (Multicast)
  if (a >= 224 && a <= 239) return true;
  // 240.0.0.0/4 (Reserved / Broadcast 255.255.255.255)
  if (a >= 240) return true;

  return false;
}

// Helper to check if an IPv6 address is in a private/internal range
export function isPrivateIPv6(ip: string): boolean {
  const cleanIp = ip.toLowerCase();

  // Loopback (::1) or Unspecified (::)
  if (cleanIp === '::1' || cleanIp === '::' || cleanIp === '0:0:0:0:0:0:0:1' || cleanIp === '0:0:0:0:0:0:0:0') {
    return true;
  }

  // IPv4-mapped IPv6 (::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (cleanIp.startsWith('::ffff:') || cleanIp.startsWith('0:0:0:0:0:ffff:')) {
    const ipv4Part = cleanIp.split(':').pop();
    if (ipv4Part && net.isIPv4(ipv4Part)) {
      return isPrivateIPv4(ipv4Part);
    }
    return true;
  }

  // Unique Local Address (fc00::/7 -> fc00:: to fdff::)
  if (cleanIp.startsWith('fc') || cleanIp.startsWith('fd')) {
    return true;
  }

  // Link-Local Unicast (fe80::/10 -> fe80:: to febf::)
  if (cleanIp.startsWith('fe8') || cleanIp.startsWith('fe9') || cleanIp.startsWith('fea') || cleanIp.startsWith('feb')) {
    return true;
  }

  // Multicast (ff00::/8)
  if (cleanIp.startsWith('ff')) {
    return true;
  }

  return false;
}

export function isPrivateIP(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) return isPrivateIPv4(ip);
  if (version === 6) return isPrivateIPv6(ip);
  return true; // Non-IP or invalid
}

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'broadcasthost',
  'ip6-localhost',
  'ip6-loopback',
  'metadata.google.internal',
  'metadata',
  'instance-data',
  'db',
  'redis',
  'backend',
  'frontend',
  'devsuite_db',
  'devsuite_redis',
  'devsuite_backend',
  'devsuite_frontend',
]);

/**
 * Validates a target URL against SSRF vulnerabilities.
 * Resolves DNS to check actual destination IP address against private/loopback/cloud-metadata ranges.
 */
export async function validateSafeUrl(targetUrl: string): Promise<{ safe: boolean; error?: string; resolvedIp?: string }> {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return { safe: false, error: 'Invalid URL format' };
  }

  // Protocol check: only http and https are allowed
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { safe: false, error: `Disallowed URL protocol '${parsed.protocol}'. Only HTTP and HTTPS are permitted.` };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Blocked hostnames & local domains
  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    return { safe: false, error: `Access to internal host '${hostname}' is forbidden.` };
  }

  // If hostname is directly an IP literal
  if (net.isIP(hostname)) {
    if (isPrivateIP(hostname)) {
      return { safe: false, error: `Access to private or loopback IP '${hostname}' is forbidden.` };
    }
    return { safe: true, resolvedIp: hostname };
  }

  // Resolve DNS to verify all destination IPs
  try {
    const lookupResults = await dns.promises.lookup(hostname, { all: true });
    if (!lookupResults || lookupResults.length === 0) {
      return { safe: false, error: `Could not resolve host '${hostname}'.` };
    }

    for (const entry of lookupResults) {
      if (isPrivateIP(entry.address)) {
        return {
          safe: false,
          error: `Host '${hostname}' resolves to protected internal IP address '${entry.address}'. Request blocked.`,
        };
      }
    }

    return { safe: true, resolvedIp: lookupResults[0].address };
  } catch (dnsErr: any) {
    return { safe: false, error: `DNS resolution failed for '${hostname}': ${dnsErr.message || 'Host not found'}` };
  }
}
