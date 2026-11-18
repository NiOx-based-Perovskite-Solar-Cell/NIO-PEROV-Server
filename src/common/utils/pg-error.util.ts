import {
  BadRequestException,
  ConflictException,
  HttpException,
} from '@nestjs/common';

export const PG_UNIQUE_VIOLATION = '23505';
export const PG_FOREIGN_KEY_VIOLATION = '23503';
export const PG_CHECK_VIOLATION = '23514';

export function getPgErrorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

/**
 * Map a Postgres constraint error to an HTTP error, or null if it is not one
 * (the caller then logs it and throws 500).
 */
export function toPgHttpException(
  error: unknown,
  label: string,
  action: 'create' | 'update' | 'delete',
): HttpException | null {
  const code = getPgErrorCode(error);

  if (code === PG_UNIQUE_VIOLATION) {
    return new ConflictException(`${label} already exists`);
  }

  if (code === PG_FOREIGN_KEY_VIOLATION) {
    // delete -> row is still referenced; create/update -> referenced row missing
    return action === 'delete'
      ? new ConflictException(`${label} is still referenced by other records`)
      : new BadRequestException('Related record not found');
  }

  if (code === PG_CHECK_VIOLATION) {
    return new BadRequestException(`Invalid value for ${label}`);
  }

  return null;
}
