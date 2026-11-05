import PDFDocument from 'pdfkit';
import { UnprocessableEntityException } from '@nestjs/common';
import { resolve } from 'node:path';
import type { ExportData } from './exports.js';

const colors = {
  paper: '#f5f4ed',
  ivory: '#faf9f5',
  ink: '#242620',
  blue: '#1b365d',
  muted: '#6b6a64',
  line: '#deddd3',
};
const flowNames = { expense: 'Expense', income: 'Income', refund: 'Refund', transfer: 'Transfer' };
export function decimal(cents: bigint) {
  const amount = cents < 0n ? -cents : cents;
  return `${cents < 0n ? '-' : ''}${amount / 100n}.${String(amount % 100n).padStart(2, '0')}`;
}
function money(cents: bigint) {
  const [whole, fraction] = decimal(cents).split('.');
  return (
    (whole.startsWith('-') ? '-$' : '$') +
    whole.replace('-', '').replace(/\B(?=(\d{3})+(?!\d))/g, ',') +
    '.' +
    fraction
  );
}
function csvText(value: string) {
  // Formula prefixes can follow whitespace, control characters or a BOM.
  const safe =
    /^[\s\u0000-\u001f\u007f]*[=+@-]/u.test(value) || /^[\t\r\n]/.test(value) ? "'" + value : value;
  return '"' + safe.replaceAll('"', '""') + '"';
}
export function renderCsv(data: ExportData) {
  const header = [
    'Date',
    'Merchant',
    'Description',
    'Money out (USD)',
    'Money in (USD)',
    'Type',
    'Category',
    'Status',
    'Review status',
    'Reviewed by',
    'Note',
    'Transaction ID',
  ];
  const lines = [header.map(csvText).join(',')];
  for (const row of data.rows) {
    lines.push(
      [
        csvText(row.date.toISOString().slice(0, 10)),
        csvText(row.merchant || row.name),
        csvText(row.name),
        row.amount_cents >= 0n ? decimal(row.amount_cents) : '',
        row.amount_cents < 0n ? decimal(-row.amount_cents) : '',
        csvText(flowNames[row.flow]),
        csvText(row.category?.name ?? 'Uncategorized'),
        csvText(row.pending ? 'Pending' : 'Posted'),
        csvText(row.pending ? 'Not available' : row.reviewed ? 'Reviewed' : 'To review'),
        csvText(row.pending ? '' : (row.reviewed_by?.username ?? '')),
        csvText(row.note),
        csvText(row.id),
      ].join(','),
    );
  }
  return Buffer.from('\uFEFF' + lines.join('\r\n') + '\r\n', 'utf8');
}

export function exportTotals(data: ExportData) {
  let income = 0n,
    spending = 0n,
    refunds = 0n;
  let pending = 0,
    transfers = 0;
  for (const row of data.rows) {
    if (row.pending) {
      pending++;
      continue;
    }
    if (row.flow === 'transfer') {
      transfers++;
      continue;
    }
    if (row.flow === 'income') income -= row.amount_cents;
    else if (row.flow === 'refund') refunds -= row.amount_cents;
    else spending += row.amount_cents;
  }
  return { income, spending, refunds, net: spending - refunds, pending, transfers };
}

function scopeText(data: ExportData) {
  const q = data.query;
  const scope = [
    q.month
      ? new Intl.DateTimeFormat('en-US', {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        }).format(new Date(q.month + '-01T00:00:00Z'))
      : 'All dates',
    ...(q.pending ? [q.pending === 'true' ? 'Pending' : 'Posted'] : []),
    ...(q.reviewed ? [q.reviewed === 'true' ? 'Reviewed' : 'To review'] : []),
    ...(q.uncategorized ? [q.uncategorized === 'true' ? 'Uncategorized' : 'Categorized'] : []),
    ...(q.search ? [`Search: "${compact(q.search)}"`] : []),
  ];
  return scope.join(' / ');
}
const compact = (value: string) => value.replace(/\s+/gu, ' ').trim();

export async function renderPdf(data: ExportData): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 42,
    bufferPages: true,
    autoFirstPage: false,
    info: {
      Title: 'Home Ledger - Transactions',
      Author: 'Home Ledger',
      CreationDate: data.createdAt,
    },
  });
  const chunks: Buffer[] = [];
  const result = new Promise<Buffer>((resolveResult, reject) => {
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolveResult(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  doc.registerFont('Body', resolve('assets/fonts/NotoSansCJKsc-Regular.otf'));
  const width = 511.28,
    right = 553.28,
    bottom = 780;
  const text = (
    value: string,
    x: number,
    y: number,
    w: number,
    size = 9,
    color = colors.ink,
    align: 'left' | 'right' = 'left',
  ) => {
    doc
      .font('Body')
      .fontSize(size)
      .fillColor(color)
      .text(value, x, y, { width: w, align, lineGap: 2 });
  };
  const height = (value: string, w: number, size = 9) =>
    doc.font('Body').fontSize(size).heightOfString(value, { width: w, lineGap: 2 });
  const numberSize = (value: string, w: number, preferred: number) => {
    const measured = doc.font('Body').fontSize(preferred).widthOfString(value);
    return Math.min(preferred, (preferred * w) / Math.max(measured, 1));
  };
  const rule = (y: number) =>
    doc.moveTo(42, y).lineTo(right, y).lineWidth(0.5).strokeColor(colors.line).stroke();
  const addPage = () => {
    doc.addPage();
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(colors.ivory);
  };
  const tableHead = (y: number) => {
    text('Date', 42, y, 62, 8, colors.muted);
    text('Transaction', 116, y, 250, 8, colors.muted);
    text('Status', 384, y, 72, 8, colors.muted);
    text('Amount (USD)', 464, y, 89, 8, colors.muted, 'right');
    rule(y + 22);
    return y + 32;
  };
  try {
    addPage();
    doc
      .font('Times-Roman')
      .fontSize(26)
      .fillColor(colors.blue)
      .text('Home Ledger', 42, 37, { width });
    let y = 77;
    const household = compact(data.home.name);
    text(household, 42, y, width, 11);
    y += height(household, width, 11) + 5;
    const account = data.home.bank
      ? `${compact(data.home.bank.account_name)}${data.home.bank.mask ? ' / Ending ' + compact(data.home.bank.mask) : ''}${data.home.bank.provider === 'demo' ? ' / Sample data' : ''}`
      : 'No bank connected';
    text(account, 42, y, width, 8, colors.muted);
    y += height(account, width, 8) + 15;
    const scope = scopeText(data);
    text(scope, 42, y, width, 11, colors.blue);
    y += height(scope, width, 11) + 18;
    const totals = exportTotals(data);
    doc.rect(42, y, width, 62).fill(colors.paper);
    const figures = [
      ['Net spending', totals.net],
      ['Income', totals.income],
      ['Spending', totals.spending],
      ['Refunds', totals.refunds],
    ] as const;
    for (const [index, [label, value]] of figures.entries()) {
      text(label, 54 + index * 124, y + 10, 115, 8, colors.muted);
      const amount = money(value);
      text(amount, 54 + index * 124, y + 28, 115, numberSize(amount, 115, 13), colors.blue);
    }
    y += 73;
    const explanation = 'Totals cover matching posted transactions; transfers are excluded.';
    text(explanation, 42, y, width, 8, colors.muted);
    y += 22;
    text(
      `${data.rows.length} transactions / ${totals.pending} pending / ${totals.transfers} posted transfers`,
      42,
      y,
      width,
      9,
    );
    y = tableHead(y + 28);
    if (!data.rows.length) text('No matching transactions.', 42, y + 14, width, 10, colors.muted);
    for (const row of data.rows) {
      const merchant = compact(row.merchant || row.name);
      const details = `${compact(row.category?.name ?? 'Uncategorized')} / ${flowNames[row.flow]}`;
      const status = row.pending
        ? 'Pending'
        : row.reviewed
          ? 'Posted\nReviewed'
          : 'Posted\nTo review';
      const merchantHeight = height(merchant, 250, 9.5);
      const detailHeight = height(details, 250, 8);
      const description =
        row.merchant && row.name !== row.merchant ? 'Description: ' + compact(row.name) : '';
      const note = [description, row.note ? 'Note: ' + compact(row.note) : '']
        .filter(Boolean)
        .join('\n');
      const mainHeight = Math.max(merchantHeight + detailHeight + 3, height(status, 72, 8));
      const noteHeight = note ? height(note, right - 116, 8) + 7 : 0;
      const rowHeight = mainHeight + noteHeight + 18;
      if (y + rowHeight > bottom) {
        addPage();
        text('Home Ledger / Transactions', 42, 32, width, 10, colors.blue);
        y = tableHead(62);
      }
      // DTO lengths keep a complete row below a page; never silently omit a note.
      if (y + rowHeight > bottom) throw new UnprocessableExportError();
      text(row.date.toISOString().slice(0, 10), 42, y, 66, 8);
      text(merchant, 116, y, 250, 9.5);
      text(details, 116, y + merchantHeight + 3, 250, 8, colors.muted);
      text(status, 384, y, 72, 8, row.pending ? colors.muted : colors.ink);
      const amount =
        (row.amount_cents < 0n ? '+' : row.amount_cents > 0n ? '-' : '') +
        money(row.amount_cents < 0n ? -row.amount_cents : row.amount_cents);
      text(amount, 464, y, 89, numberSize(amount, 89, 10), colors.blue, 'right');
      if (note) text(note, 116, y + mainHeight + 7, right - 116, 8, colors.muted);
      y += rowHeight;
      rule(y - 8);
    }
    const pages = doc.bufferedPageRange();
    const generated = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: data.home.timezone,
    }).format(data.createdAt);
    for (let page = 0; page < pages.count; page++) {
      doc.switchToPage(page);
      doc.page.margins.bottom = 0;
      rule(797);
      text(`Generated ${generated} (${data.home.timezone})`, 42, 805, 430, 7, colors.muted);
      text(`${page + 1} / ${pages.count}`, 484, 805, 69, 7, colors.muted, 'right');
      doc.page.margins.bottom = 42;
    }
    doc.end();
  } catch (error) {
    doc.destroy(error as Error);
  }
  return result;
}

class UnprocessableExportError extends UnprocessableEntityException {
  constructor() {
    super('A transaction is too long for PDF. Export CSV to keep all text.');
  }
}
