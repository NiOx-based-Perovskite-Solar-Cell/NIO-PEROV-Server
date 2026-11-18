import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsNumberString } from 'class-validator';

/**
 * BIGINT id field in a DTO. Accepts 12 or '12' and keeps it as a string,
 * matching how pg returns int8 columns.
 */
export const IsBigIntId = () =>
  applyDecorators(
    Transform(({ value }) =>
      typeof value === 'number' ? String(value) : (value as unknown),
    ),
    IsNumberString({ no_symbols: true }),
  );
