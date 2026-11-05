import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from './generated/prisma/client.js';
import { Config } from './config.js';

export type Tx = Prisma.TransactionClient;

@Injectable()
export class Database extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(config: Config) {
    super({
      adapter: new PrismaPg({
        connectionString: config.values.databaseUrl,
        max: 8,
        connectionTimeoutMillis: 5000,
      }),
      transactionOptions: { maxWait: 10000, timeout: 120000 },
    });
  }
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}

export async function lockHome(tx: Tx, id: string) {
  await tx.$queryRaw`SELECT id FROM "Household" WHERE id = ${id}::uuid FOR UPDATE`;
}
export async function lockBank(tx: Tx, id: string) {
  await tx.$queryRaw`SELECT id FROM "BankConnection" WHERE id = ${id}::uuid FOR UPDATE`;
}
export async function lockTransaction(tx: Tx, id: string) {
  await tx.$queryRaw`SELECT id FROM "LedgerTransaction" WHERE id = ${id}::uuid FOR UPDATE`;
}
