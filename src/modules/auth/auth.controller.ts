// auth.controller.ts
import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { GoogleCallbackDto } from './dto/auth.dto';
import { AppLogger } from '../../common/logger/app-logger.service';

const STATE_COOKIE = 'nio_perov_oauth_state';
const STATE_MAX_AGE_MS = 10 * 60 * 1000;

function readCookie(req: Request, name: string): string | undefined {
  const cookies = req.headers.cookie?.split(';') ?? [];
  for (const cookie of cookies) {
    const [key, ...rest] = cookie.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly logger: AppLogger,
  ) {}

  private get frontendUrl(): string {
    return process.env.FRONTEND_URL || 'http://localhost:7100';
  }

  /**
   * Start Google login - redirects the browser to Google's consent screen
   */
  @Get('google')
  @ApiOperation({ summary: 'Redirect to Google sign-in (open in browser)' })
  @ApiResponse({ status: 302, description: 'Redirect to Google' })
  googleLogin(@Res() res: Response) {
    const state = this.authService.createOAuthState();

    res.cookie(STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.frontendUrl.startsWith('https'),
      maxAge: STATE_MAX_AGE_MS,
    });

    return res.redirect(this.authService.getGoogleAuthUrl(state));
  }

  /**
   * Google redirects here after sign-in. Login (or register on first sign-in)
   * then redirect to the client with the JWT in the URL fragment.
   */
  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({ status: 302, description: 'Redirect to client with token' })
  async googleCallback(
    @Query() dto: GoogleCallbackDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const expectedState = readCookie(req, STATE_COOKIE);
    res.clearCookie(STATE_COOKIE);

    const failRedirect = (reason: string) =>
      res.redirect(
        `${this.frontendUrl}/login?error=${encodeURIComponent(reason)}`,
      );

    if (dto.error || !dto.code) {
      return failRedirect(dto.error || 'missing_code');
    }

    if (!expectedState || expectedState !== dto.state) {
      this.logger.warn('Google callback: invalid state', 'AuthController');
      return failRedirect('invalid_state');
    }

    try {
      const { access_token } = await this.authService.loginWithGoogle(dto.code);
      // fragment (#) is never sent to servers, so the token stays out of logs
      return res.redirect(
        `${this.frontendUrl}/auth/callback#token=${encodeURIComponent(access_token)}`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'login_failed';
      this.logger.warn('Google login failed', 'AuthController', { message });
      return failRedirect(
        message === 'Account is inactive' ? 'inactive' : 'login_failed',
      );
    }
  }
}
