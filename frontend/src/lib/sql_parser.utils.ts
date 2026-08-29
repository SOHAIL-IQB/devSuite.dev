export interface SqlColumn {
  name: string;
  type: string;
  isPrimary: boolean;
  isNullable: boolean;
  isForeign: boolean;
  foreignTable?: string;
  foreignColumn?: string;
}

export interface SqlTable {
  name: string;
  columns: SqlColumn[];
  primaryKeys: string[];
}

export interface SqlRelationship {
  fromTable: string;
  toTable: string;
  fromColumn: string;
  toColumn: string;
  type: 'one-to-many' | 'one-to-one' | 'many-to-many';
}

export interface ParsedSchema {
  tables: SqlTable[];
  relationships: SqlRelationship[];
}

/**
 * Parses SQL CREATE TABLE statements into a structured database schema representation.
 */
export function parseSqlDdl(sql: string): ParsedSchema {
  const tables: SqlTable[] = [];
  const relationships: SqlRelationship[] = [];

  if (!sql || typeof sql !== 'string') {
    return { tables, relationships };
  }

  // Normalize comments and spacing
  const cleaned = sql
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim();

  // Regex to match CREATE TABLE statements
  const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:["`]?(\w+)["`]?\.)?["`]?(\w+)["`]?\s*\(([\s\S]*?)\)(?:;|\s*$)/gi;
  let match: RegExpExecArray | null;

  while ((match = createTableRegex.exec(cleaned)) !== null) {
    const tableName = match[2] || match[1];
    const body = match[3];

    const columns: SqlColumn[] = [];
    const primaryKeys: string[] = [];

    // Split lines by comma, taking care of parentheses
    const lines = splitSqlLines(body);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Check for standalone PRIMARY KEY (col1, col2)
      const pkMatch = trimmed.match(/^PRIMARY\s+KEY\s*\(([^)]+)\)/i);
      if (pkMatch) {
        const pkCols = pkMatch[1].split(',').map((c) => c.replace(/["`]/g, '').trim());
        primaryKeys.push(...pkCols);
        continue;
      }

      // Check for standalone FOREIGN KEY (col) REFERENCES target (targetCol)
      const fkMatch = trimmed.match(/^FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+["`]?(\w+)["`]?\s*\(([^)]+)\)/i);
      if (fkMatch) {
        const fromCol = fkMatch[1].replace(/["`]/g, '').trim();
        const toTab = fkMatch[2].replace(/["`]/g, '').trim();
        const toCol = fkMatch[3].replace(/["`]/g, '').trim();

        relationships.push({
          fromTable: tableName,
          toTable: toTab,
          fromColumn: fromCol,
          toColumn: toCol,
          type: 'one-to-many',
        });
        continue;
      }

      // Check for CONSTRAINT fk
      const constraintFkMatch = trimmed.match(/^CONSTRAINT\s+["`]?\w+["`]?\s+FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+["`]?(\w+)["`]?\s*\(([^)]+)\)/i);
      if (constraintFkMatch) {
        const fromCol = constraintFkMatch[1].replace(/["`]/g, '').trim();
        const toTab = constraintFkMatch[2].replace(/["`]/g, '').trim();
        const toCol = constraintFkMatch[3].replace(/["`]/g, '').trim();

        relationships.push({
          fromTable: tableName,
          toTable: toTab,
          fromColumn: fromCol,
          toColumn: toCol,
          type: 'one-to-many',
        });
        continue;
      }

      // Column Definition
      const colParts = trimmed.match(/^["`]?(\w+)["`]?\s+([A-Za-z0-9_]+(?:\s*\([^)]+\))?)([\s\S]*)$/i);
      if (colParts) {
        const colName = colParts[1];
        const colType = colParts[2].toUpperCase();
        const colRest = colParts[3] || '';

        const isPrimary = /PRIMARY\s+KEY/i.test(colRest);
        const isNullable = !/NOT\s+NULL/i.test(colRest) && !isPrimary;

        let isForeign = false;
        let foreignTable: string | undefined;
        let foreignColumn: string | undefined;

        // Inline REFERENCES
        const inlineRef = colRest.match(/REFERENCES\s+["`]?(\w+)["`]?\s*\(([^)]+)\)/i);
        if (inlineRef) {
          isForeign = true;
          foreignTable = inlineRef[1];
          foreignColumn = inlineRef[2].replace(/["`]/g, '').trim();

          relationships.push({
            fromTable: tableName,
            toTable: foreignTable,
            fromColumn: colName,
            toColumn: foreignColumn,
            type: 'one-to-many',
          });
        }

        if (isPrimary) {
          primaryKeys.push(colName);
        }

        columns.push({
          name: colName,
          type: colType,
          isPrimary,
          isNullable,
          isForeign,
          foreignTable,
          foreignColumn,
        });
      }
    }

    // Apply primary keys found in constraints
    columns.forEach((c) => {
      if (primaryKeys.includes(c.name)) {
        c.isPrimary = true;
        c.isNullable = false;
      }
    });

    // Mark foreign keys from standalone constraints
    relationships.forEach((rel) => {
      if (rel.fromTable === tableName) {
        const col = columns.find((c) => c.name === rel.fromColumn);
        if (col) {
          col.isForeign = true;
          col.foreignTable = rel.toTable;
          col.foreignColumn = rel.toColumn;
        }
      }
    });

    tables.push({
      name: tableName,
      columns,
      primaryKeys,
    });
  }

  return { tables, relationships };
}

/**
 * Splits lines by commas, ignoring commas inside parentheses.
 */
function splitSqlLines(sql: string): string[] {
  const result: string[] = [];
  let current = '';
  let depth = 0;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    if (char === '(') depth++;
    else if (char === ')') depth--;

    if (char === ',' && depth === 0) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    result.push(current);
  }

  return result;
}

/**
 * Generates Mermaid.js Entity-Relationship (ER) diagram string.
 */
export function generateMermaidErDiagram(schema: ParsedSchema): string {
  if (schema.tables.length === 0) {
    return 'erDiagram\n  SCHEMA_EMPTY {\n    string message "No tables found in SQL DDL"\n  }';
  }

  let mermaid = 'erDiagram\n';

  // 1. Relationships
  for (const rel of schema.relationships) {
    mermaid += `  ${rel.toTable} ||--o{ ${rel.fromTable} : "has"\n`;
  }

  // 2. Tables & Fields
  for (const table of schema.tables) {
    mermaid += `  ${table.name} {\n`;
    for (const col of table.columns) {
      const typeSanitized = col.type.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      const keySuffix = col.isPrimary ? 'PK' : col.isForeign ? 'FK' : '';
      mermaid += `    ${typeSanitized || 'string'} ${col.name} ${keySuffix}\n`;
    }
    mermaid += '  }\n';
  }

  return mermaid;
}

/**
 * Maps SQL data types to TypeScript types.
 */
function mapSqlTypeToTs(sqlType: string): string {
  const t = sqlType.toUpperCase();
  if (t.includes('INT') || t.includes('SERIAL') || t.includes('FLOAT') || t.includes('DOUBLE') || t.includes('DECIMAL') || t.includes('NUMERIC') || t.includes('REAL')) {
    return 'number';
  }
  if (t.includes('BOOL')) {
    return 'boolean';
  }
  if (t.includes('JSON')) {
    return 'Record<string, any>';
  }
  if (t.includes('DATE') || t.includes('TIME')) {
    return 'Date | string';
  }
  return 'string';
}

/**
 * Generates TypeScript interface definitions from SQL DDL schema.
 */
export function generateTypeScriptInterfaces(schema: ParsedSchema): string {
  if (schema.tables.length === 0) {
    return '// No tables defined in schema';
  }

  let ts = `/**\n * Auto-generated TypeScript Interfaces from SQL Schema\n * Generated by DevSuite.dev\n */\n\n`;

  for (const table of schema.tables) {
    const interfaceName = capitalize(table.name);
    ts += `export interface ${interfaceName} {\n`;
    for (const col of table.columns) {
      const tsType = mapSqlTypeToTs(col.type);
      const optional = col.isNullable ? '?' : '';
      ts += `  ${col.name}${optional}: ${tsType};\n`;
    }
    ts += '}\n\n';
  }

  return ts.trim();
}

/**
 * Generates mock JSON data for each table in the schema.
 */
export function generateMockJson(schema: ParsedSchema): string {
  const result: Record<string, any[]> = {};

  for (const table of schema.tables) {
    const mockRecord: Record<string, any> = {};
    for (const col of table.columns) {
      const type = mapSqlTypeToTs(col.type);
      if (col.isPrimary) {
        mockRecord[col.name] = type === 'number' ? 1 : 'uuid-1001-abcd';
      } else if (type === 'number') {
        mockRecord[col.name] = 42;
      } else if (type === 'boolean') {
        mockRecord[col.name] = true;
      } else if (type === 'Date | string') {
        mockRecord[col.name] = new Date().toISOString();
      } else if (type === 'Record<string, any>') {
        mockRecord[col.name] = { key: 'value' };
      } else {
        mockRecord[col.name] = `Sample ${col.name}`;
      }
    }
    result[table.name] = [mockRecord];
  }

  return JSON.stringify(result, null, 2);
}

function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}
