import { useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Globe2,
  ShieldCheck,
  ShieldAlert,
  Search,
  Loader2,
  Clock,
  Lock,
  Activity
} from 'lucide-react';

export function NetworkDiagnosticsWorkspace() {
  // DNS State
  const [domain, setDomain] = useState('github.com');
  const [dnsType, setDnsType] = useState('A');
  const [dnsLoading, setDnsLoading] = useState(false);
  const [dnsResult, setDnsResult] = useState<any>(null);

  // SSL State
  const [sslHost, setSslHost] = useState('github.com');
  const [sslPort, setSslPort] = useState('443');
  const [sslLoading, setSslLoading] = useState(false);
  const [sslResult, setSslResult] = useState<any>(null);

  const handleQueryDns = async () => {
    if (!domain.trim()) return;
    setDnsLoading(true);
    try {
      const res = await api.post('/diagnostics/dns', {
        domain: domain.trim(),
        recordType: dnsType,
      });
      if (res.data?.result) {
        setDnsResult(res.data.result);
        toast.success(`DNS resolved in ${res.data.result.latencyMs}ms`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'DNS query failed');
      setDnsResult(null);
    } finally {
      setDnsLoading(false);
    }
  };

  const handleInspectSsl = async () => {
    if (!sslHost.trim()) return;
    setSslLoading(true);
    try {
      const res = await api.post('/diagnostics/ssl', {
        host: sslHost.trim(),
        port: parseInt(sslPort) || 443,
      });
      if (res.data?.result) {
        setSslResult(res.data.result);
        toast.success('SSL certificate inspected');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'SSL inspection failed');
      setSslResult(null);
    } finally {
      setSslLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background p-4 gap-4 overflow-hidden">
      
      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-muted/20 border rounded-lg shadow-sm shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-500">
            <Globe2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold tracking-tight">DNS & SSL/TLS Network Diagnostics</h1>
              <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider text-sky-500 border-sky-500/30">
                Network Toolkit
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Inspect authoritative DNS records (A, AAAA, CNAME, MX, TXT) and audit SSL/TLS certificates and cipher suites.
            </p>
          </div>
        </div>
      </div>

      {/* TABS: DNS LOOKUP & SSL INSPECTOR */}
      <Tabs defaultValue="dns" className="flex-1 flex flex-col min-h-0">
        <div className="shrink-0 flex items-center justify-between pb-2">
          <TabsList className="h-8 bg-muted/50 p-0.5">
            <TabsTrigger value="dns" className="text-xs h-7 px-3 gap-1.5">
              <Activity className="w-3.5 h-3.5" /> DNS Records
            </TabsTrigger>
            <TabsTrigger value="ssl" className="text-xs h-7 px-3 gap-1.5">
              <Lock className="w-3.5 h-3.5" /> SSL/TLS Certificate
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: DNS RECORDS */}
        <TabsContent value="dns" className="flex-1 m-0 min-h-0 flex flex-col gap-3 bg-background border rounded-lg p-4 overflow-y-auto mac-scrollbar">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex-1 min-w-[240px] relative">
              <Input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="domain.com (e.g. github.com)"
                className="font-mono text-xs h-9"
                onKeyDown={(e) => e.key === 'Enter' && handleQueryDns()}
              />
            </div>

            <Select value={dnsType} onValueChange={setDnsType}>
              <SelectTrigger className="w-28 h-9 text-xs font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA'].map((t) => (
                  <SelectItem key={t} value={t} className="text-xs font-mono">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={handleQueryDns}
              disabled={dnsLoading}
              className="h-9 text-xs gap-1.5 bg-sky-600 hover:bg-sky-700 text-white shadow-sm"
            >
              {dnsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              Query DNS
            </Button>
          </div>

          {dnsResult && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-3 bg-muted/20 border rounded-lg">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="font-mono text-xs font-bold text-sky-500 border-sky-500/30">
                    {dnsResult.type} Records
                  </Badge>
                  <span className="text-xs font-semibold">{domain}</span>
                </div>
                <div className="flex items-center text-xs text-muted-foreground font-mono">
                  <Clock className="w-3.5 h-3.5 mr-1" /> {dnsResult.latencyMs} ms
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b font-mono uppercase text-[10px] text-muted-foreground">
                    <tr>
                      <th className="p-2.5">Record Data</th>
                      <th className="p-2.5">TTL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-mono">
                    {dnsResult.records.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="p-4 text-center text-muted-foreground">
                          No {dnsResult.type} records found for this domain.
                        </td>
                      </tr>
                    ) : (
                      dnsResult.records.map((rec: any, idx: number) => (
                        <tr key={idx} className="hover:bg-muted/20">
                          <td className="p-2.5 font-medium break-all">
                            {typeof rec === 'object' ? JSON.stringify(rec.address || rec.exchange || rec.entries || rec) : String(rec)}
                          </td>
                          <td className="p-2.5 text-muted-foreground">
                            {rec.ttl ? `${rec.ttl}s` : 'N/A'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* TAB 2: SSL/TLS CERTIFICATE */}
        <TabsContent value="ssl" className="flex-1 m-0 min-h-0 flex flex-col gap-3 bg-background border rounded-lg p-4 overflow-y-auto mac-scrollbar">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex-1 min-w-[240px]">
              <Input
                value={sslHost}
                onChange={(e) => setSslHost(e.target.value)}
                placeholder="hostname (e.g. api.stripe.com)"
                className="font-mono text-xs h-9"
                onKeyDown={(e) => e.key === 'Enter' && handleInspectSsl()}
              />
            </div>
            <div className="w-24">
              <Input
                value={sslPort}
                onChange={(e) => setSslPort(e.target.value)}
                placeholder="Port"
                className="font-mono text-xs h-9"
              />
            </div>
            <Button
              onClick={handleInspectSsl}
              disabled={sslLoading}
              className="h-9 text-xs gap-1.5 bg-sky-600 hover:bg-sky-700 text-white shadow-sm"
            >
              {sslLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
              Inspect SSL
            </Button>
          </div>

          {sslResult && (
            <div className="space-y-3 pt-2">
              {/* STATUS BANNER */}
              <div className="p-4 border rounded-lg bg-muted/10 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {sslResult.isExpired ? (
                    <ShieldAlert className="w-6 h-6 text-red-500" />
                  ) : sslResult.isExpiringSoon ? (
                    <ShieldAlert className="w-6 h-6 text-orange-500" />
                  ) : (
                    <ShieldCheck className="w-6 h-6 text-emerald-500" />
                  )}
                  <div>
                    <h2 className="text-sm font-bold">
                      {sslResult.isExpired
                        ? 'Certificate Expired'
                        : sslResult.isExpiringSoon
                        ? 'Certificate Expiring Soon'
                        : 'Certificate Valid & Secure'}
                    </h2>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      Issued for: {sslResult.subject?.commonName || sslResult.hostname}
                    </p>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className={`text-xs font-mono px-2.5 py-1 ${
                    sslResult.isExpired
                      ? 'bg-red-500/10 text-red-500 border-red-500/30'
                      : sslResult.isExpiringSoon
                      ? 'bg-orange-500/10 text-orange-500 border-orange-500/30'
                      : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                  }`}
                >
                  {sslResult.daysRemaining} days remaining
                </Badge>
              </div>

              {/* DETAILS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 border rounded-lg bg-muted/10 space-y-2 text-xs">
                  <h3 className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                    Subject & Issuer
                  </h3>
                  <div className="space-y-1.5 font-mono">
                    <div><span className="text-muted-foreground">CN:</span> {sslResult.subject?.commonName || 'N/A'}</div>
                    <div><span className="text-muted-foreground">Org:</span> {sslResult.subject?.organization || 'N/A'}</div>
                    <div><span className="text-muted-foreground">Issuer CN:</span> {sslResult.issuer?.commonName || 'N/A'}</div>
                    <div><span className="text-muted-foreground">Issuer Org:</span> {sslResult.issuer?.organization || 'N/A'}</div>
                  </div>
                </div>

                <div className="p-3.5 border rounded-lg bg-muted/10 space-y-2 text-xs">
                  <h3 className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                    Security & Protocol
                  </h3>
                  <div className="space-y-1.5 font-mono">
                    <div><span className="text-muted-foreground">Protocol:</span> {sslResult.protocol}</div>
                    <div><span className="text-muted-foreground">Cipher:</span> {sslResult.cipher}</div>
                    <div><span className="text-muted-foreground">Valid From:</span> {new Date(sslResult.validFrom).toLocaleDateString()}</div>
                    <div><span className="text-muted-foreground">Valid Until:</span> {new Date(sslResult.validTo).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
