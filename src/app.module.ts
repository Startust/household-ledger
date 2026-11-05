import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Config } from './config.js';
import { Database } from './database.js';
import { AuthController, AuthGuard, AuthService } from './auth.js';
import { LedgerController, BankController, SystemController } from './controllers.js';
import { LedgerService, DigestService } from './ledger.js';
import { BankService } from './bank.js';
import { PlaidClient, TokenVault } from './plaid.js';
import { SyncService } from './sync.js';
import { ExportController, ExportService } from './exports.js';

@Module({
  controllers: [
    AuthController,
    LedgerController,
    BankController,
    SystemController,
    ExportController,
  ],
  providers: [
    Config,
    Database,
    AuthService,
    LedgerService,
    DigestService,
    BankService,
    PlaidClient,
    TokenVault,
    SyncService,
    ExportService,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
