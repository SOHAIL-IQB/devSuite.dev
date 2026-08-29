import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseSqlDdl,
  generateMermaidErDiagram,
  generateTypeScriptInterfaces,
  generateMockJson,
} from '../sql_parser.utils.ts';

describe('SQL DDL Parser & ER Diagram Generator', () => {
  const ddl = `
    CREATE TABLE users (
      id UUID PRIMARY KEY,
      username VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL,
      is_active BOOLEAN DEFAULT true
    );

    CREATE TABLE posts (
      id UUID PRIMARY KEY,
      author_id UUID REFERENCES users(id),
      title VARCHAR(255) NOT NULL,
      content TEXT,
      created_at TIMESTAMP
    );
  `;

  it('should parse tables, columns, primary keys, and foreign key relationships', () => {
    const schema = parseSqlDdl(ddl);

    assert.equal(schema.tables.length, 2);

    const usersTable = schema.tables.find((t) => t.name === 'users');
    assert.ok(usersTable);
    assert.equal(usersTable.columns.length, 4);
    assert.equal(usersTable.columns[0].name, 'id');
    assert.equal(usersTable.columns[0].isPrimary, true);
    assert.equal(usersTable.columns[1].name, 'username');
    assert.equal(usersTable.columns[1].isNullable, false);

    const postsTable = schema.tables.find((t) => t.name === 'posts');
    assert.ok(postsTable);
    const authorCol = postsTable.columns.find((c) => c.name === 'author_id');
    assert.ok(authorCol);
    assert.equal(authorCol.isForeign, true);
    assert.equal(authorCol.foreignTable, 'users');

    assert.equal(schema.relationships.length, 1);
    assert.equal(schema.relationships[0].fromTable, 'posts');
    assert.equal(schema.relationships[0].toTable, 'users');
  });

  it('should generate valid Mermaid ER diagram syntax', () => {
    const schema = parseSqlDdl(ddl);
    const mermaid = generateMermaidErDiagram(schema);

    assert.ok(mermaid.startsWith('erDiagram'));
    assert.ok(mermaid.includes('users ||--o{ posts : "has"'));
    assert.ok(mermaid.includes('users {'));
    assert.ok(mermaid.includes('UUID id PK'));
  });

  it('should generate accurate TypeScript interfaces', () => {
    const schema = parseSqlDdl(ddl);
    const ts = generateTypeScriptInterfaces(schema);

    assert.ok(ts.includes('export interface Users {'));
    assert.ok(ts.includes('id: string;'));
    assert.ok(ts.includes('is_active?: boolean;'));
    assert.ok(ts.includes('export interface Posts {'));
    assert.ok(ts.includes('created_at?: Date | string;'));
  });

  it('should generate structured mock JSON dataset', () => {
    const schema = parseSqlDdl(ddl);
    const jsonStr = generateMockJson(schema);
    const parsed = JSON.parse(jsonStr);

    assert.ok(Array.isArray(parsed.users));
    assert.equal(parsed.users.length, 1);
    assert.ok(parsed.users[0].id);
    assert.ok(parsed.users[0].username);

    assert.ok(Array.isArray(parsed.posts));
    assert.equal(parsed.posts.length, 1);
    assert.ok(parsed.posts[0].id);
  });
});
