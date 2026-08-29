export interface RegexToken {
  type: 'literal' | 'group' | 'char-class' | 'quantifier' | 'anchor' | 'lookaround' | 'special';
  raw: string;
  description: string;
}

export interface RegexMatchResult {
  matched: boolean;
  matchCount: number;
  matches: {
    text: string;
    index: number;
    groups: Record<string, string> | string[];
  }[];
  replacedText?: string;
}

export interface RegexSnippet {
  title: string;
  pattern: string;
  flags: string;
  description: string;
}

/**
 * Standard regex patterns library.
 */
export const REGEX_LIBRARY: RegexSnippet[] = [
  {
    title: 'Email Address (RFC 5322)',
    pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
    flags: 'i',
    description: 'Matches standard internet email addresses.',
  },
  {
    title: 'Semantic Versioning (SemVer)',
    pattern: '^v?(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-((?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\\+([0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?$',
    flags: '',
    description: 'Matches standard SemVer 2.0.0 versions with prereleases and build metadata.',
  },
  {
    title: 'UUID v4',
    pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
    flags: 'i',
    description: 'Matches Version-4 RFC 4122 compliant UUIDs.',
  },
  {
    title: 'IPv4 Address',
    pattern: '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$',
    flags: '',
    description: 'Validates standard dot-decimal IPv4 addresses from 0.0.0.0 to 255.255.255.255.',
  },
  {
    title: 'URL (HTTP/HTTPS)',
    pattern: '^https?:\\/\\/(?:www\\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)$',
    flags: 'i',
    description: 'Validates HTTP and HTTPS web URLs with domain and query strings.',
  },
  {
    title: 'ISO 8601 UTC Timestamp',
    pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?(?:Z|[+-]\\d{2}:\\d{2})$',
    flags: '',
    description: 'Matches ISO-8601 formatted date-time strings (e.g. 2026-08-29T14:30:00Z).',
  },
  {
    title: 'Strong Password Policy',
    pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$',
    flags: '',
    description: 'Min 8 chars, at least 1 uppercase, 1 lowercase, 1 digit, 1 special character.',
  },
];

/**
 * Parses regex pattern into explanatory structural tokens.
 */
export function explainRegex(pattern: string): RegexToken[] {
  const tokens: RegexToken[] = [];
  if (!pattern) return tokens;

  let i = 0;
  while (i < pattern.length) {
    const char = pattern[i];

    if (char === '^') {
      tokens.push({ type: 'anchor', raw: '^', description: 'Start of line / string anchor' });
      i++;
    } else if (char === '$') {
      tokens.push({ type: 'anchor', raw: '$', description: 'End of line / string anchor' });
      i++;
    } else if (char === '\\') {
      const next = pattern[i + 1] || '';
      const raw = '\\' + next;
      let desc = `Escaped character '${next}'`;
      if (next === 'd') desc = 'Digit [0-9]';
      else if (next === 'D') desc = 'Non-digit [^0-9]';
      else if (next === 'w') desc = 'Word character [a-zA-Z0-9_]';
      else if (next === 'W') desc = 'Non-word character';
      else if (next === 's') desc = 'Whitespace character (spaces, tabs, line breaks)';
      else if (next === 'S') desc = 'Non-whitespace character';
      else if (next === 'b') desc = 'Word boundary';

      tokens.push({ type: 'special', raw, description: desc });
      i += 2;
    } else if (char === '[') {
      const closing = pattern.indexOf(']', i);
      if (closing !== -1) {
        const raw = pattern.slice(i, closing + 1);
        tokens.push({
          type: 'char-class',
          raw,
          description: `Character set: matches any single character in ${raw}`,
        });
        i = closing + 1;
      } else {
        tokens.push({ type: 'literal', raw: '[', description: "Literal '['" });
        i++;
      }
    } else if (char === '(') {
      const closing = pattern.indexOf(')', i);
      if (closing !== -1) {
        const raw = pattern.slice(i, closing + 1);
        let desc = 'Capturing group';
        if (raw.startsWith('(?:')) desc = 'Non-capturing group';
        else if (raw.startsWith('(?=')) desc = 'Positive lookahead';
        else if (raw.startsWith('(?!')) desc = 'Negative lookahead';
        else if (raw.startsWith('(?<=')) desc = 'Positive lookbehind';
        else if (raw.startsWith('(?<!')) desc = 'Negative lookbehind';

        tokens.push({ type: 'group', raw, description: desc });
        i = closing + 1;
      } else {
        tokens.push({ type: 'literal', raw: '(', description: "Literal '('" });
        i++;
      }
    } else if (['+', '*', '?', '{'].includes(char)) {
      if (char === '{') {
        const closing = pattern.indexOf('}', i);
        if (closing !== -1) {
          const raw = pattern.slice(i, closing + 1);
          tokens.push({ type: 'quantifier', raw, description: `Quantifier: repeats preceding token ${raw}` });
          i = closing + 1;
        } else {
          tokens.push({ type: 'literal', raw: '{', description: "Literal '{'" });
          i++;
        }
      } else {
        let desc = 'Matches 1 or more times (+)';
        if (char === '*') desc = 'Matches 0 or more times (*)';
        if (char === '?') desc = 'Matches 0 or 1 time (optional ?)';
        tokens.push({ type: 'quantifier', raw: char, description: desc });
        i++;
      }
    } else if (char === '.') {
      tokens.push({ type: 'special', raw: '.', description: 'Wildcard: matches any character except newline' });
      i++;
    } else if (char === '|') {
      tokens.push({ type: 'special', raw: '|', description: 'Alternation (OR operator)' });
      i++;
    } else {
      tokens.push({ type: 'literal', raw: char, description: `Literal '${char}'` });
      i++;
    }
  }

  return tokens;
}

/**
 * Tests regex against input text and generates structured match result with replacement preview.
 */
export function testRegex(
  pattern: string,
  flags: string,
  testText: string,
  replacePattern?: string
): RegexMatchResult {
  if (!pattern) {
    return { matched: false, matchCount: 0, matches: [] };
  }

  try {
    const globalFlags = flags.includes('g') ? flags : flags + 'g';
    const regex = new RegExp(pattern, globalFlags);
    const matches: RegexMatchResult['matches'] = [];

    let match: RegExpExecArray | null;
    let iterations = 0;
    while ((match = regex.exec(testText)) !== null && iterations < 500) {
      iterations++;
      matches.push({
        text: match[0],
        index: match.index,
        groups: match.groups || Array.from(match).slice(1),
      });

      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }
    }

    let replacedText: string | undefined;
    if (typeof replacePattern === 'string') {
      replacedText = testText.replace(regex, replacePattern);
    }

    return {
      matched: matches.length > 0,
      matchCount: matches.length,
      matches,
      replacedText,
    };
  } catch {
    return { matched: false, matchCount: 0, matches: [] };
  }
}
