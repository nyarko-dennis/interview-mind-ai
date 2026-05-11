import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { DB_TOKEN } from '../db/db.module';
import type { Db } from '../db';
import { users } from '../db/schema';

export interface JwtPayload {
  sub: string;
  email: string;
  name?: string;
  iat: number;
  exp: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @Inject(DB_TOKEN) private readonly db: Db,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('AUTH_SECRET'),
      algorithms: ['HS256'],
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    if (!payload.sub) throw new UnauthorizedException();
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, payload.email),
    });
    if (!user) throw new UnauthorizedException('User not found');
    return { id: user.id, email: user.email, name: user.displayName ?? undefined };
  }
}
