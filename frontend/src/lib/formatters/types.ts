export interface FormatterResult {
  formatted: string;
  isValid: boolean;
  error?: string;
}

export interface DiagnosticMarker {
  severity: 'error' | 'warning' | 'info' | 'hint';
  message: string;
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

export interface FormatterStrategy {
  id: string;
  name: string;
  monacoLanguage: string;
  format: (code: string) => Promise<FormatterResult>;
  minify?: (code: string) => Promise<FormatterResult>;
  validate: (code: string) => Promise<DiagnosticMarker[]>;
}
