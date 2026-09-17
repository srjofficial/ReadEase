import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { CookieOptions } from 'express';
import { env } from '../../config/env';
import { UserRole, UserStatus } from '../../models/user.model';

export interface JwtAccessPayload {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  type: 'access';
}

export interface JwtRefreshPayload {
  sub: string;
  jti: string; // Unique token identifier for tracking
  type: 'refresh';
}

export const REFRESH_COOKIE_NAME = 'readease_refresh_token';

/**
 * 7-day cookie options: httpOnly, secure in production, sameSite=strict
 */
export const getRefreshCookieOptions = (): CookieOptions => {
  const isProduction = env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict', // Strict cross-site boundary protection
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    path: '/api' // Restricted to API paths
  };
};

export class TokenService {
  /**
   * Generates a short-lived (15 min) JWT access token
   */
  static generateAccessToken(user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    status: UserStatus;
  }): string {
    const payload: JwtAccessPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      type: 'access'
    };

    const options: SignOptions = {
      expiresIn: env.JWT_EXPIRES_IN as NonNullable<SignOptions['expiresIn']>,
      issuer: 'readease-auth'
    };

    return jwt.sign(payload, env.JWT_SECRET, options);
  }

  /**
   * Generates a long-lived (7 days) JWT refresh token with unique jti
   */
  static generateRefreshToken(userId: string): { token: string; jti: string } {
    const jti = crypto.randomUUID();
    const payload: JwtRefreshPayload = {
      sub: userId,
      jti,
      type: 'refresh'
    };

    const options: SignOptions = {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as NonNullable<SignOptions['expiresIn']>,
      issuer: 'readease-auth'
    };

    const token = jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
    return { token, jti };
  }

  /**
   * Cryptographically hashes a token using SHA-256 for safe DB storage
   */
  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Verifies an access token
   */
  static verifyAccessToken(token: string): JwtAccessPayload {
    return jwt.verify(token, env.JWT_SECRET, {
      issuer: 'readease-auth'
    }) as JwtAccessPayload;
  }

  /**
   * Verifies a refresh token
   */
  static verifyRefreshToken(token: string): JwtRefreshPayload {
    return jwt.verify(token, env.JWT_REFRESH_SECRET, {
      issuer: 'readease-auth'
    }) as JwtRefreshPayload;
  }
}
