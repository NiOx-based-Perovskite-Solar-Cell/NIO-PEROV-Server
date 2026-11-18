// auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { UserSys } from './entities/user-sys.entity';
import { UserIdentity } from './entities/user-identity.entity';
import { Role } from './entities/role.entity';
import { generateJwtToken } from '../../common/utils/auth.utils';
import { UserJwtPayload } from '../../common/interface/payload.interface';
import { AppLogger } from '../../common/logger/app-logger.service';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

const GOOGLE_PROVIDER = 'google';

// Every newly registered user starts with this role
const DEFAULT_ROLE = 'user';

interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  given_name?: string;
  family_name?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserSys)
    private userSysRepo: Repository<UserSys>,
    private dataSource: DataSource,
    private readonly logger: AppLogger,
  ) {}

  /**
   * Redirect URI registered in Google Cloud Console
   */
  private get googleCallbackUrl(): string {
    return (
      process.env.GOOGLE_CALLBACK_URL ||
      `${process.env.BACKEND_URL || 'http://localhost:7200'}/auth/google/callback`
    );
  }

  /**
   * Random value for the OAuth `state` param (CSRF protection)
   */
  createOAuthState(): string {
    return randomBytes(24).toString('hex');
  }

  /**
   * Build the Google consent screen URL
   */
  getGoogleAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      redirect_uri: this.googleCallbackUrl,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    });
    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange the authorization code, find or create the user, and issue a JWT
   */
  async loginWithGoogle(code: string) {
    const googleUser = await this.fetchGoogleUser(code);

    if (!googleUser.email_verified) {
      this.logger.warn(
        'Google login failed: email not verified',
        'AuthService',
        {
          email: googleUser.email,
        },
      );
      throw new UnauthorizedException('Google email is not verified');
    }

    const user = await this.findOrCreateGoogleUser(googleUser);

    if (user.flag_valid === false) {
      this.logger.warn('Login failed: inactive account', 'AuthService', {
        email: user.email,
      });
      throw new UnauthorizedException('Account is inactive');
    }

    const role = user.role;
    const payload: Omit<UserJwtPayload, 'iat' | 'exp'> = {
      type: 'user',
      user_id: String(user.user_sys_id),
      email: user.email,
      first_name: user.first_name ?? '',
      last_name: user.last_name ?? '',
      role_id: user.role_id,
      role: role?.role_name ?? '',
      access: role?.flag_valid === false ? {} : (role?.access ?? {}),
    };

    const access_token = generateJwtToken(
      payload,
      process.env.TOKEN_EXPIRES_IN || '30d',
    );

    this.logger.debug('Google login successful', 'AuthService', {
      email: user.email,
    });

    return { access_token, user };
  }

  private async fetchGoogleUser(code: string): Promise<GoogleUserInfo> {
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID ?? '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
        redirect_uri: this.googleCallbackUrl,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      this.logger.warn('Google token exchange failed', 'AuthService', {
        status: tokenRes.status,
        body: await tokenRes.text(),
      });
      throw new UnauthorizedException('Google authentication failed');
    }

    const { access_token } = (await tokenRes.json()) as {
      access_token: string;
    };

    const userRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userRes.ok) {
      this.logger.warn('Google userinfo request failed', 'AuthService', {
        status: userRes.status,
      });
      throw new UnauthorizedException('Google authentication failed');
    }

    return (await userRes.json()) as GoogleUserInfo;
  }

  /**
   * Look up user_identity by Google `sub`. First login creates user_sys
   * (role = DEFAULT_ROLE) or links to an existing user_sys with the same email.
   */
  private async findOrCreateGoogleUser(
    googleUser: GoogleUserInfo,
  ): Promise<UserSys> {
    const email = googleUser.email.toLowerCase();

    const userId = await this.dataSource.transaction(async (manager) => {
      const identity = await manager.findOne(UserIdentity, {
        where: { provider: GOOGLE_PROVIDER, provider_user_id: googleUser.sub },
      });

      if (identity) {
        return identity.user_sys_id;
      }

      let user = await manager.findOne(UserSys, { where: { email } });

      if (!user) {
        const defaultRole = await manager.findOne(Role, {
          where: { role_name: DEFAULT_ROLE },
        });

        if (!defaultRole) {
          this.logger.error(
            `Default role '${DEFAULT_ROLE}' not found`,
            'AuthService',
          );
          throw new InternalServerErrorException('Server Error');
        }

        user = await manager.save(
          manager.create(UserSys, {
            email,
            first_name: googleUser.given_name ?? null,
            last_name: googleUser.family_name ?? null,
            role_id: defaultRole.role_id,
            flag_valid: true,
          }),
        );

        this.logger.debug('Register successful', 'AuthService', { email });
      }

      await manager.save(
        manager.create(UserIdentity, {
          user_sys_id: user.user_sys_id,
          email,
          provider: GOOGLE_PROVIDER,
          provider_user_id: googleUser.sub,
          role_id: user.role_id,
        }),
      );

      return user.user_sys_id;
    });

    const user = await this.userSysRepo.findOne({
      where: { user_sys_id: userId },
      relations: { role: true },
    });

    if (!user) {
      throw new InternalServerErrorException('Server Error');
    }

    return user;
  }
}
