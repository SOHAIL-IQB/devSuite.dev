export interface RegexWorkerMessage {
  id: string;
  type: 'match' | 'replace';
  regexStr: string;
  flags: string;
  targetText: string;
  replacementStr?: string;
}

export interface SerializedMatch {
  fullMatch: string;
  index: number;
  groups: (string | undefined)[];
}

export interface RegexWorkerResponse {
  id: string;
  error?: string;
  matches?: SerializedMatch[];
  replacedText?: string;
}

self.onmessage = (e: MessageEvent<RegexWorkerMessage>) => {
  const { id, type, regexStr, flags, targetText, replacementStr } = e.data;

  try {
    const re = new RegExp(regexStr, flags);
    
    if (type === 'match') {
      const results: SerializedMatch[] = [];
      const MAX_MATCHES = 5000; // Hard cap to prevent memory bloat on massive outputs
      
      if (!flags.includes('g') && !flags.includes('y')) {
        const match = targetText.match(re);
        if (match) {
          results.push({
            fullMatch: match[0],
            index: match.index || 0,
            groups: Array.from(match).slice(1)
          });
        }
      } else {
        const matches = targetText.matchAll(re);
        let count = 0;
        for (const match of matches) {
          if (count >= MAX_MATCHES) break;
          results.push({
            fullMatch: match[0],
            index: match.index || 0,
            groups: Array.from(match).slice(1)
          });
          count++;
        }
      }
      
      self.postMessage({ id, matches: results });
      
    } else if (type === 'replace') {
      const replacedText = targetText.replace(re, replacementStr || '');
      self.postMessage({ id, replacedText });
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Invalid regex operation';
    self.postMessage({ id, error: errorMsg });
  }
};
