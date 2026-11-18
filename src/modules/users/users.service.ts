// users.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UserSys } from '../auth/entities/user-sys.entity';
import { SearchUserSysDto, UpdateUserDto } from './dto/users.dto';
import { AppLogger } from '../../common/logger/app-logger.service';

// Whitelist of sortable columns to prevent SQL injection via sort_by
const SORTABLE_COLUMNS = [
  'user_sys_id',
  'email',
  'first_name',
  'last_name',
  'role_id',
  'flag_valid',
  'created_at',
];

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserSys)
    private userSysRepo: Repository<UserSys>,
    private dataSource: DataSource,
    private readonly logger: AppLogger,
  ) {}

  /**
   * Search users with filters and pagination
   */
  async search(dto: SearchUserSysDto) {
    const hasInput =
      dto.user_sys_id ||
      dto.email ||
      dto.role_id ||
      dto.role_name ||
      dto.keyword ||
      typeof dto.flag_valid === 'boolean';

    if (!hasInput) {
      throw new BadRequestException('No value input!');
    }

    let query = `
      SELECT u.*, r.role_name, COUNT(*) OVER() as total_count
      FROM user_sys u
      LEFT JOIN role r ON r.role_id = u.role_id
      WHERE 1=1
    `;

    const values: unknown[] = [];
    let index = 1;

    if (dto.user_sys_id) {
      query += ` AND u.user_sys_id = $${index++}`;
      values.push(dto.user_sys_id);
    }

    if (dto.email) {
      query += ` AND u.email = $${index++}`;
      values.push(dto.email);
    }

    if (dto.role_id) {
      query += ` AND u.role_id = $${index++}`;
      values.push(dto.role_id);
    }

    if (dto.role_name) {
      query += ` AND r.role_name = $${index++}`;
      values.push(dto.role_name);
    }

    if (typeof dto.flag_valid === 'boolean') {
      query += ` AND u.flag_valid = $${index++}`;
      values.push(dto.flag_valid);
    }

    if (dto.keyword) {
      query += ` AND (u.email ILIKE $${index} OR u.first_name ILIKE $${index} OR u.last_name ILIKE $${index})`;
      values.push(`%${dto.keyword}%`);
      index++;
    }

    // Sort - column name whitelisted, never interpolated from raw user input
    if (dto.sort_by && SORTABLE_COLUMNS.includes(dto.sort_by)) {
      const order = dto.sort_order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      query += ` ORDER BY u.${dto.sort_by} ${order}`;
    }

    // Pagination
    if (dto.limit) {
      query += ` LIMIT $${index++}`;
      values.push(dto.limit);
    }

    if (dto.offset) {
      query += ` OFFSET $${index++}`;
      values.push(dto.offset);
    }

    try {
      const result: UserSys[] = await this.dataSource.query(query, values);
      return { success: true, data: result };
    } catch (error: unknown) {
      this.logger.error('Error searching users:', 'UsersService', error);
      throw new InternalServerErrorException('Server Error');
    }
  }

  /**
   * Get user by ID
   */
  async findById(id: string) {
    const user = await this.userSysRepo.findOne({
      where: { user_sys_id: id },
      relations: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return { success: true, data: user };
  }

  /**
   * Update a user by ID
   */
  async update(id: string, dto: UpdateUserDto) {
    const existingUser = await this.userSysRepo.findOne({
      where: { user_sys_id: id },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    if (dto.email) {
      const conflictUser = await this.userSysRepo.findOne({
        where: { email: dto.email },
      });

      if (conflictUser && conflictUser.user_sys_id !== id) {
        throw new ConflictException('Email already in use');
      }
    }

    try {
      const updateData: Partial<UserSys> = {};

      if (dto.email !== undefined) updateData.email = dto.email;
      if (dto.first_name !== undefined) updateData.first_name = dto.first_name;
      if (dto.last_name !== undefined) updateData.last_name = dto.last_name;
      if (dto.role_id !== undefined) updateData.role_id = dto.role_id;
      if (dto.flag_valid !== undefined) updateData.flag_valid = dto.flag_valid;

      await this.userSysRepo.update({ user_sys_id: id }, updateData);

      const updatedUser = await this.userSysRepo.findOne({
        where: { user_sys_id: id },
        relations: { role: true },
      });

      this.logger.debug('User updated', 'UsersService', { user_sys_id: id });

      return {
        success: true,
        message: 'User updated successfully',
        data: updatedUser,
      };
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: unknown }).code === '23505'
      ) {
        throw new ConflictException('Email already in use');
      }
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: unknown }).code === '23503'
      ) {
        throw new BadRequestException('Role not found');
      }
      this.logger.error('Error updating user:', 'UsersService', error);
      throw new InternalServerErrorException('Server Error');
    }
  }

  /**
   * Delete a user by ID (user_identity rows are removed by ON DELETE CASCADE)
   */
  async delete(id: string) {
    const existingUser = await this.userSysRepo.findOne({
      where: { user_sys_id: id },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    await this.userSysRepo.delete({ user_sys_id: id });

    this.logger.debug('User deleted', 'UsersService', { user_sys_id: id });

    return {
      success: true,
      message: 'User deleted successfully',
      data: existingUser,
    };
  }
}
