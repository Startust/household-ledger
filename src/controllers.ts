import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  RawBodyRequest,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { LedgerService, DigestService } from './ledger.js';
import { BankService } from './bank.js';
import { Database } from './database.js';
import { PlaidClient } from './plaid.js';
import { SyncService } from './sync.js';
import { Public } from './auth.js';
import {
  CategoryCreateDto,
  CategoryPatchDto,
  ExchangeDto,
  HouseholdPatchDto,
  PageQuery,
  SelectAccountDto,
  SummaryQuery,
  TransactionPatchDto,
  TransactionQuery,
} from './dto.js';

@ApiTags('ledger')
@ApiCookieAuth('ledger.sid')
@Controller('api')
export class LedgerController {
  constructor(
    private readonly ledger: LedgerService,
    private readonly digests: DigestService,
  ) {}
  @Get('household') household(@Req() req: Request) {
    return this.ledger.household(req.principal);
  }
  @Patch('household') patchHousehold(@Req() req: Request, @Body() body: HouseholdPatchDto) {
    return this.ledger.updateHousehold(req.principal, body);
  }
  @Get('categories') categories(@Req() req: Request) {
    return this.ledger.categories(req.principal);
  }
  @Post('categories') createCategory(@Req() req: Request, @Body() body: CategoryCreateDto) {
    return this.ledger.createCategory(req.principal, body.name);
  }
  @Get('categories/:id') category(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    return this.ledger.category(req.principal, id);
  }
  @Patch('categories/:id') patchCategory(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CategoryPatchDto,
  ) {
    return this.ledger.updateCategory(req.principal, id, body);
  }
  @Get('transactions') transactions(@Req() req: Request, @Query() query: TransactionQuery) {
    return this.ledger.transactions(req.principal, query);
  }
  @Get('transactions/:id') transaction(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ledger.transaction(req.principal, id);
  }
  @Patch('transactions/:id') patchTransaction(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: TransactionPatchDto,
  ) {
    return this.ledger.edit(req.principal, id, body);
  }
  @Get('transactions/:id/history') history(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ledger.history(req.principal, id);
  }
  @Get('summary') summary(@Req() req: Request, @Query() query: SummaryQuery) {
    return this.ledger.summary(req.principal, query.month);
  }
  @Get('digests') listDigests(@Req() req: Request, @Query() query: PageQuery) {
    return this.digests.list(req.principal, query.page);
  }
  @Get('digests/:id') getDigest(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    return this.digests.get(req.principal, id);
  }
  @Post('digests/:id/read') @HttpCode(200) readDigest(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.digests.markRead(req.principal, id);
  }
}

@ApiTags('bank')
@ApiCookieAuth('ledger.sid')
@Controller('api/bank')
export class BankController {
  constructor(private readonly bank: BankService) {}
  @Get() get(@Req() req: Request) {
    return this.bank.get(req.principal.household_id);
  }
  @Post('link-token') @HttpCode(200) link(@Req() req: Request) {
    return this.bank.linkToken(req.principal.household_id);
  }
  @Post('exchange') exchange(@Req() req: Request, @Body() body: ExchangeDto) {
    return this.bank.exchange(req.principal.household_id, body.public_token, body.account_id);
  }
  @Get('accounts') accounts(@Req() req: Request) {
    return this.bank.accounts(req.principal.household_id);
  }
  @Post('select-account') @HttpCode(200) select(
    @Req() req: Request,
    @Body() body: SelectAccountDto,
  ) {
    return this.bank.selectAccount(req.principal.household_id, body.account_id);
  }
  @Post('sync') @HttpCode(202) sync(@Req() req: Request) {
    return this.bank.requestSync(req.principal.household_id);
  }
  @Post('reauth-complete') @HttpCode(202) reauth(@Req() req: Request) {
    return this.bank.reauth(req.principal.household_id);
  }
}

@ApiTags('system')
@Controller()
export class SystemController {
  constructor(
    private readonly db: Database,
    private readonly plaid: PlaidClient,
    private readonly sync: SyncService,
  ) {}
  @Public() @Get('health/live') live() {
    return { status: 'ok', service: 'household-ledger-nestjs' };
  }
  @Public() @Get('health/ready') async ready() {
    try {
      await this.db.$queryRaw`SELECT 1`;
      return { status: 'ok', service: 'household-ledger-nestjs' };
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }
  }
  @Public()
  @Post('webhooks/plaid')
  @HttpCode(200)
  async webhook(@Req() req: RawBodyRequest<Request>) {
    const raw = req.rawBody;
    if (!raw || !(await this.plaid.verifyWebhook(raw, req.get('Plaid-Verification') ?? '')))
      throw new UnauthorizedException('Invalid webhook signature');
    const body = req.body as { item_id?: unknown };
    if (typeof body?.item_id === 'string') {
      const bank = await this.db.bankConnection.findUnique({ where: { item_id: body.item_id } });
      if (bank?.provider === 'plaid') await this.sync.request(bank.id);
    }
    return { received: true };
  }
}
