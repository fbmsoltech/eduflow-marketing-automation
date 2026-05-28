import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { existsSync } from 'node:fs';

const DEFAULT_DATABASE_URL = 'postgresql://eduflow:eduflow@localhost:5432/eduflow';

function resolveDatabaseUrl(): string {
  if (!process.env['DATABASE_URL'] && existsSync('.env')) {
    process.loadEnvFile('.env');
  }

  return process.env['DATABASE_URL'] ?? DEFAULT_DATABASE_URL;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      adapter: new PrismaPg({
        connectionString: resolveDatabaseUrl(),
      }),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
