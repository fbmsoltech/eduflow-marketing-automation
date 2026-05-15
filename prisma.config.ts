import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

const databaseUrl =
  process.env['DATABASE_URL'] ?? 'postgresql://eduflow:eduflow@localhost:5432/eduflow';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: databaseUrl,
  },
});
