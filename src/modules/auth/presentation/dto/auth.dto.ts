import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { IsStrongPassword } from '../../../../common/validation/is-strong-password.decorator';

export class LoginDto {
  @ApiProperty({ example: 'maria@example.com' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'Str0ng!Pass' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password!: string;
}

export class RefreshDto {
  @ApiProperty({ description: 'The opaque refresh token (`<id>.<secret>`).' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class LogoutDto {
  @ApiProperty({ description: 'The refresh token to revoke.' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'maria@example.com' })
  @IsEmail()
  @MaxLength(254)
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'The password-reset token (`<id>.<secret>`).' })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsStrongPassword()
  newPassword!: string;
}

export class TokensResponse {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: string;

  @ApiProperty({
    example: 900,
    description: 'Access token lifetime in seconds.',
  })
  expiresIn!: number;
}

export class MessageResponse {
  @ApiProperty({
    example: 'If the account exists, a reset link has been sent.',
  })
  message!: string;
}
