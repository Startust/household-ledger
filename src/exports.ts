import {
  Controller,
  Get,
  Injectable,
  Query,
  Req,
  StreamableFile,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ApiCookieAuth, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Database } from './database.js';
import type { Principal } from './auth.js';
import { ExportQuery } from './dto.js';
import { localClock, transactionInclude, transactionWhere } from './ledger.js';
import { renderCsv, renderPdf } from './export-renderer.js';

export const EXPORT_LIMIT = 5000;

@Injectable()
export class ExportService {
  constructor(private readonly db: Database) {}

  async data(user: Principal, query: ExportQuery) {
    const [home, rows] = await this.db.$transaction(
      [
        this.db.household.findUniqueOrThrow({
          where: { id: user.household_id },
          select: {
            name: true,
            timezone: true,
            bank: { select: { account_name: true, mask: true, provider: true } },
          },
        }),
        this.db.ledgerTransaction.findMany({
          where: transactionWhere(user, query),
          include: transactionInclude,
          orderBy: [{ date: 'desc' }, { first_seen_at: 'desc' }, { id: 'asc' }],
          take: EXPORT_LIMIT + 1,
        }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    if (rows.length > EXPORT_LIMIT)
      throw new UnprocessableEntityException(
        'Export limit: 5,000 transactions. Choose a month or narrow your filters.',
      );
    return { home, rows, query, createdAt: new Date() };
  }

  async file(user: Principal, query: ExportQuery) {
    const data = await this.data(user, query);
    const stamp = query.month ?? localClock(data.createdAt, data.home.timezone).text;
    const filename = `home-ledger-${query.month ? '' : 'transactions-'}${stamp}.${query.format}`;
    const body = query.format === 'pdf' ? await renderPdf(data) : renderCsv(data);
    return new StreamableFile(body, {
      type: query.format === 'pdf' ? 'application/pdf' : 'text/csv; charset=utf-8',
      disposition: `attachment; filename="${filename}"`,
      length: body.length,
    });
  }
}

export type ExportData = Awaited<ReturnType<ExportService['data']>>;

@ApiTags('exports')
@ApiCookieAuth('ledger.sid')
@Controller('api/exports')
export class ExportController {
  constructor(private readonly exports: ExportService) {}
  @Get('transactions')
  @ApiProduces('text/csv', 'application/pdf')
  download(@Req() req: Request, @Query() query: ExportQuery) {
    return this.exports.file(req.principal, query);
  }
}
