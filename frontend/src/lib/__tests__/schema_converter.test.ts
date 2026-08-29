import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  convertSqlToPrisma,
  convertSqlToDrizzle,
  convertPrismaToSql,
} from '../schema_converter.utils.ts';

describe('Database Schema & Migration Converter', () => {
  const sqlDdl = `
    CREATE TABLE users (
      id UUID PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP
    );
  `;

  it('should convert SQL DDL to Prisma schema format', () => {
    const prisma = convertSqlToPrisma(sqlDdl);

    assert.ok(prisma.includes('model Users {'));
    assert.ok(prisma.includes('id'));
    assert.ok(prisma.includes('@id'));
    assert.ok(prisma.includes('@default(uuid())'));
    assert.ok(prisma.includes('email'));
    assert.ok(prisma.includes('String'));
    assert.ok(prisma.includes('is_active'));
    assert.ok(prisma.includes('Boolean?'));
    assert.ok(prisma.includes('created_at'));
    assert.ok(prisma.includes('DateTime?'));
  });

  it('should convert SQL DDL to Drizzle ORM schema format', () => {
    const drizzle = convertSqlToDrizzle(sqlDdl);

    assert.ok(drizzle.includes("export const users = pgTable('users', {"));
    assert.ok(drizzle.includes("uuid('id').primaryKey()"));
    assert.ok(drizzle.includes("varchar('email').notNull()"));
    assert.ok(drizzle.includes("boolean('is_active')"));
  });

  it('should convert Prisma Schema to SQL DDL CREATE TABLE statements', () => {
    const prismaInput = `
      model Organization {
        id        String   @id
        name      String
        is_active Boolean?

        @@map("organizations")
      }
    `;

    const generatedSql = convertPrismaToSql(prismaInput);
    assert.ok(generatedSql.includes('CREATE TABLE organizations ('));
    assert.ok(generatedSql.includes('id UUID PRIMARY KEY'));
    assert.ok(generatedSql.includes('name VARCHAR(255) NOT NULL'));
    assert.ok(generatedSql.includes('is_active BOOLEAN'));
  });
});
