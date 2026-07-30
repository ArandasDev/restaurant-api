import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../../common/decorators/public.decorator';
import { ErrorResponse } from '../../../common/http/error-response';
import { AuthService } from '../application/auth.service';
import {
  ForgotPasswordDto,
  LoginDto,
  LogoutDto,
  MessageResponse,
  RefreshDto,
  ResetPasswordDto,
  TokensResponse,
} from './dto/auth.dto';

// Stricter, brute-force-resistant limits for authentication endpoints.
const AUTH_THROTTLE = {
  default: {
    limit: parseInt(process.env.AUTH_THROTTLE_LIMIT ?? '10', 10),
    ttl: parseInt(process.env.AUTH_THROTTLE_TTL ?? '60', 10) * 1000,
  },
};

@ApiTags('auth')
@ApiTooManyRequestsResponse({
  type: ErrorResponse,
  description: 'Rate limited',
})
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate a user within a tenant' })
  @ApiHeader({
    name: 'X-Tenant-Slug',
    required: true,
    description: 'Slug of the restaurant (tenant) to authenticate against.',
  })
  @ApiOkResponse({ type: TokensResponse })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  login(@Body() dto: LoginDto, @Ip() ip: string): Promise<TokensResponse> {
    return this.toResponse(this.authService.login(dto.email, dto.password, ip));
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a refresh token for a new token pair' })
  @ApiOkResponse({ type: TokensResponse })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  refresh(@Body() dto: RefreshDto): Promise<TokensResponse> {
    return this.toResponse(this.authService.refresh(dto.refreshToken));
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a refresh token (logout)' })
  async logout(@Body() dto: LogoutDto): Promise<void> {
    await this.authService.logout(dto.refreshToken);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('forgot-password')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Request a password reset link' })
  @ApiHeader({ name: 'X-Tenant-Slug', required: true })
  @ApiCreatedResponse({ type: MessageResponse })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Ip() ip: string,
  ): Promise<MessageResponse> {
    await this.authService.forgotPassword(dto.email, ip);
    return {
      message: 'If the account exists, a reset link has been sent.',
    };
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset a password using a reset token' })
  @ApiOkResponse({ type: MessageResponse })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Ip() ip: string,
  ): Promise<MessageResponse> {
    await this.authService.resetPassword(dto.token, dto.newPassword, ip);
    return { message: 'Password has been reset successfully.' };
  }

  private async toResponse(
    tokens: Promise<{
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    }>,
  ): Promise<TokensResponse> {
    const { accessToken, refreshToken, expiresIn } = await tokens;
    return { accessToken, refreshToken, tokenType: 'Bearer', expiresIn };
  }
}
