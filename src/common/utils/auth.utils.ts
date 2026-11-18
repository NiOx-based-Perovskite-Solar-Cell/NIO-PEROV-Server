import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { SignOptions } from 'jsonwebtoken';
import { AppLogger } from 'src/common/logger/app-logger.service';
import { JwtPayload } from 'src/common/interface/payload.interface';

const logger = new AppLogger();

/**
 * Hash password with bcrypt + custom salt from env
 * Flow: password + SALTNUMBER → bcrypt.hash()
 */
export async function hashPassword(password: string): Promise<string> {
  const customSalt = process.env.SALTNUMBER || '';
  const saltedPassword = password + customSalt;
  const bcryptRounds = 10;

  logger.debug('Hashing password with custom salt...', 'AUTH UTIL');

  const hash = await bcrypt.hash(saltedPassword, bcryptRounds);

  logger.debug('Password hashed with custom salt successfully', 'AUTH UTIL');

  return hash;
}

/**
 * Verify password against hashed password
 * Flow: password + SALTNUMBER → bcrypt.compare()
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  const customSalt = process.env.SALTNUMBER || '';
  const saltedPassword = password + customSalt;

  logger.debug('Verifying password with custom salt...', 'AUTH UTIL');

  const isValid = await bcrypt.compare(saltedPassword, hashedPassword);

  logger.debug(`Verification result `, 'AUTH UTIL', {
    isValid: isValid ? 'MATCH' : 'NO MATCH',
  });

  return isValid;
}

/**
 * Generate JWT Token
 */
export function generateJwtToken(
  payload: object,
  expiresIn: string | number = '24h',
): string {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  const options: SignOptions = {
    expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
  };
  return jwt.sign(payload, secret, options);
}

/**
 * Verify JWT Token
 */
export function verifyJwtToken(token: string): any {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  return jwt.verify(token, secret);
}

/**
 * user_sys_id of the logged-in user (set by AuthMiddleware), if any
 */
export function getRequestUserId(req: {
  user?: JwtPayload;
}): string | undefined {
  const user = req.user;
  return user && 'user_id' in user ? user.user_id : undefined;
}
