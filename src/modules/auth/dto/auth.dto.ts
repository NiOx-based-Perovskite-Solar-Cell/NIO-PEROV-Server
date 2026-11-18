// auth.dto.ts
import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Query params Google sends back to /auth/google/callback
 */
export class GoogleCallbackDto {
  @ApiPropertyOptional({ description: 'Authorization code from Google' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ description: 'CSRF state issued by /auth/google' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({
    description: 'Error from Google (e.g. access_denied)',
  })
  @IsOptional()
  @IsString()
  error?: string;
}
