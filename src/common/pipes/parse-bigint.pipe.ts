import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

/**
 * Validates a BIGINT id route param. Kept as a string (pg returns int8 as
 * string), so ids above Number.MAX_SAFE_INTEGER are never rounded.
 */
@Injectable()
export class ParseBigIntPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!/^\d+$/.test(value)) {
      throw new BadRequestException(
        'Validation failed (numeric id is expected)',
      );
    }
    return value;
  }
}
