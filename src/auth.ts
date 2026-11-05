import {
  BadRequestException,
  Body,
  CanActivate,
  Controller,
  ExecutionContext,
  ForbiddenException,
  Get,
  Injectable,
  Post,
  Req,
  Res,
  SetMetadata,
  HttpCode,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiTags } from '@nestjs/swagger';
import { createHash } from 'node:crypto';
import { hash, verify, argon2id } from 'argon2';
import { csrfSync } from 'csrf-sync';
import type { Request, Response } from 'express';
import { Database, lockHome } from './database.js';
import { LoginDto, PasswordChangeDto } from './dto.js';

export type Principal = { id: string; username: string; household_id: string };
declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}
declare global {
  namespace Express {
    interface Request {
      principal: Principal;
    }
  }
}

export const Public = () => SetMetadata('public', true);
export const csrf = csrfSync({
  getTokenFromRequest: (req) => req.headers['x-csrftoken'] as string,
});

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly db: Database,
    private readonly reflector: Reflector,
  ) {}
  async canActivate(context: ExecutionContext) {
    if (
      this.reflector.getAllAndOverride<boolean>('public', [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const req = context.switchToHttp().getRequest<Request>();
    const user = req.session?.userId
      ? await this.db.user.findUnique({ where: { id: req.session.userId } })
      : null;
    if (!user?.active) throw new ForbiddenException('Please sign in to your household account.');
    req.principal = { id: user.id, username: user.username, household_id: user.household_id };
    return true;
  }
}

export async function passwordHash(password: string, username: string) {
  if (
    password.length < 12 ||
    password.length > 256 ||
    /^\d+$/.test(password) ||
    password.toLowerCase().includes(username.toLowerCase())
  )
    throw new BadRequestException('Use 12–256 characters, not only digits or your username.');
  return hash(password, { type: argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
}

@Injectable()
export class AuthService {
  private dummy = hash('dummy-password-never-valid', {
    type: argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
  constructor(private readonly db: Database) {}

  async authenticate(username: string, password: string, peer: string) {
    for (const [raw, limit] of [
      [`user:${username.toLowerCase()}`, 10],
      [`peer:${peer}`, 100],
    ] as const) {
      const key = createHash('sha256').update(raw).digest('hex');
      const allowed = await this.db.$transaction(async (tx) => {
        await tx.loginAttempt.upsert({ where: { key }, create: { key }, update: {} });
        await tx.$queryRaw`SELECT key FROM "LoginAttempt" WHERE key = ${key} FOR UPDATE`;
        const row = await tx.loginAttempt.findUniqueOrThrow({ where: { key } });
        const reset = row.window_start.getTime() < Date.now() - 900000;
        const attempts = reset ? 0 : row.attempts;
        if (attempts >= limit) return false;
        await tx.loginAttempt.update({
          where: { key },
          data: { attempts: attempts + 1, ...(reset ? { window_start: new Date() } : {}) },
        });
        return true;
      });
      if (!allowed) {
        const { HttpException } = await import('@nestjs/common');
        throw new HttpException(
          { detail: 'Too many sign-in attempts. Try again in 15 minutes.' },
          429,
        );
      }
    }
    const user = await this.db.user.findUnique({ where: { username } });
    const valid = await verify(user?.password_hash ?? (await this.dummy), password);
    if (!valid || !user?.active)
      throw new ForbiddenException('That username or password is not correct.');
    return { id: user.id, username: user.username, household_id: user.household_id };
  }

  async addMember(householdId: string, username: string, password: string) {
    if (!/^[\p{L}\p{N}_@.+-]{1,64}$/u.test(username))
      throw new BadRequestException('Invalid username format.');
    const encrypted = await passwordHash(password, username);
    return this.db.$transaction(async (tx) => {
      await lockHome(tx, householdId);
      if ((await tx.user.count({ where: { household_id: householdId } })) >= 2)
        throw new BadRequestException('Each household supports at most two members.');
      return tx.user.create({
        data: { username, password_hash: encrypted, household_id: householdId },
      });
    });
  }

  async changePassword(user: Principal, current: string, next: string, peer: string) {
    await this.authenticate(user.username, current, peer);
    const encrypted = await passwordHash(next, user.username);
    await this.db.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { password_hash: encrypted } });
      await tx.$executeRaw`DELETE FROM session WHERE sess->>'userId' = ${user.id}`;
    });
  }
}

@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Public()
  @Get('csrf')
  token(@Req() req: Request) {
    return { csrfToken: csrf.generateToken(req) };
  }

  @Public()
  @Post('login')
  async login(@Body() input: LoginDto, @Req() req: Request) {
    const user = await this.auth.authenticate(
      input.username,
      input.password,
      req.ip ?? req.socket.remoteAddress ?? 'unknown',
    );
    await new Promise<void>((resolve, reject) =>
      req.session.regenerate((error) => (error ? reject(error) : resolve())),
    );
    req.session.userId = user.id;
    const token = csrf.generateToken(req, true);
    await new Promise<void>((resolve, reject) =>
      req.session.save((error) => (error ? reject(error) : resolve())),
    );
    return { ...user, csrfToken: token };
  }
  @Get('me') me(@Req() req: Request) {
    return req.principal;
  }
  @Post('password')
  @HttpCode(200)
  async password(
    @Body() input: PasswordChangeDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.changePassword(
      req.principal,
      input.current_password,
      input.new_password,
      req.ip ?? 'unknown',
    );
    await new Promise<void>((resolve, reject) =>
      req.session.destroy((error) => (error ? reject(error) : resolve())),
    );
    res.clearCookie('ledger.sid', { path: '/' });
    return { changed: true, login_required: true };
  }
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await new Promise<void>((resolve, reject) =>
      req.session.destroy((error) => (error ? reject(error) : resolve())),
    );
    res.clearCookie('ledger.sid', { path: '/' });
    return { logged_out: true };
  }
}
