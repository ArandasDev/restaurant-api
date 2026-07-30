import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Matches, MaxLength, MinLength } from 'class-validator';

/**
 * Password policy (Security First): 8–128 chars with at least one lowercase,
 * one uppercase, one digit and one special character. Applied consistently to every
 * password field so the rules live in one place (DRY).
 */
export function IsStrongPassword(): PropertyDecorator {
  return applyDecorators(
    ApiProperty({
      example: 'Str0ng!Pass',
      minLength: 8,
      maxLength: 128,
      description:
        'At least one lowercase, one uppercase, one digit and one special character.',
    }),
    MinLength(8, { message: 'password must be at least 8 characters' }),
    MaxLength(128, { message: 'password must be at most 128 characters' }),
    Matches(/[a-z]/, { message: 'password must contain a lowercase letter' }),
    Matches(/[A-Z]/, { message: 'password must contain an uppercase letter' }),
    Matches(/\d/, { message: 'password must contain a digit' }),
    Matches(/[^A-Za-z0-9]/, {
      message: 'password must contain a special character',
    }),
  );
}
