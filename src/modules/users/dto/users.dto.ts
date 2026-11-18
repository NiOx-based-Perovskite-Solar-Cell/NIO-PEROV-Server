// users.dto.ts
import {
  IsString,
  IsOptional,
  IsEmail,
  IsBoolean,
  IsInt,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

/**
 * DTO for searching users with filters and pagination
 */
export class SearchUserSysDto {
  @ApiPropertyOptional({ description: 'User Sys ID', example: '1' })
  @IsOptional()
  @IsString()
  user_sys_id?: string;

  @ApiPropertyOptional({ description: 'Email', example: 'user@example.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Role ID', example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  role_id?: number;

  @ApiPropertyOptional({ description: 'Role name', example: 'user' })
  @IsOptional()
  @IsString()
  role_name?: string;

  @ApiPropertyOptional({ description: 'Valid flag', example: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  flag_valid?: boolean;

  @ApiPropertyOptional({
    description: 'Keyword search for email, first_name, last_name',
    example: 'john',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'created_at',
    enum: [
      'user_sys_id',
      'email',
      'first_name',
      'last_name',
      'role_id',
      'flag_valid',
      'created_at',
    ],
  })
  @IsOptional()
  @IsString()
  sort_by?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'DESC',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsString()
  sort_order?: 'ASC' | 'DESC';

  @ApiPropertyOptional({ description: 'Limit', example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;

  @ApiPropertyOptional({ description: 'Offset', example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  offset?: number;
}

/**
 * DTO for updating a user
 */
export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'Email', example: 'user@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'First name', example: 'John' })
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiPropertyOptional({ description: 'Last name', example: 'Doe' })
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiPropertyOptional({ description: 'Role ID', example: 5 })
  @IsOptional()
  @IsInt()
  role_id?: number;

  @ApiPropertyOptional({ description: 'Valid flag', example: true })
  @IsOptional()
  @IsBoolean()
  flag_valid?: boolean;
}
