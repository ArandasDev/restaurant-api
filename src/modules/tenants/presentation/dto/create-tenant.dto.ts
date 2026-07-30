import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsStrongPassword } from '../../../../common/validation/is-strong-password.decorator';

export class CreateTenantDto {
  @ApiProperty({ example: 'Pizzaria do Bairro' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({
    example: 'pizzaria-do-bairro',
    description: 'URL-safe unique identifier (lowercase, digits and hyphens).',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(63)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase alphanumeric words separated by hyphens',
  })
  slug!: string;

  @ApiProperty({ example: 'owner@pizzaria.com' })
  @IsEmail()
  @MaxLength(254)
  adminEmail!: string;

  @IsStrongPassword()
  adminPassword!: string;
}

export class TenantCreatedResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ description: 'Id of the created TENANT_ADMIN user.' })
  adminUserId!: string;
}
