import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Address } from '../../domain/consumer.entity';

export class CreateAddressDto {
  @ApiProperty({ example: 'Casa' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  label!: string;

  @ApiProperty({
    example: '01001-000',
    description: 'CEP (8 digits, mask optional).',
  })
  @Matches(/^\d{5}-?\d{3}$/, { message: 'cep must be a valid Brazilian CEP' })
  cep!: string;

  @ApiProperty({ example: '123' })
  @IsString()
  @MaxLength(20)
  number!: string;

  @ApiPropertyOptional({
    example: 'Praça da Sé',
    description: 'Filled from CEP if omitted.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  street?: string;

  @ApiPropertyOptional({ example: 'Apto 42' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  complement?: string;

  @ApiPropertyOptional({ example: 'Sé' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  district?: string;

  @ApiPropertyOptional({ example: 'São Paulo' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @ApiPropertyOptional({ example: 'SP', description: '2-letter state (UF).' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  state?: string;

  @ApiPropertyOptional({ example: -23.5505, description: 'GPS latitude.' })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({ example: -46.6333, description: 'GPS longitude.' })
  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Set as the primary address.',
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class UpdateAddressDto {
  @ApiPropertyOptional({ example: 'Trabalho' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  label?: string;

  @ApiPropertyOptional({ example: '01310-100' })
  @IsOptional()
  @Matches(/^\d{5}-?\d{3}$/, { message: 'cep must be a valid Brazilian CEP' })
  cep?: string;

  @ApiPropertyOptional({ example: '456' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  number?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  street?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  complement?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  district?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 2)
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsLongitude()
  longitude?: number;
}

export class AddressResponse {
  @ApiProperty() id!: string;
  @ApiProperty() label!: string;
  @ApiProperty() cep!: string;
  @ApiProperty() street!: string;
  @ApiProperty() number!: string;
  @ApiPropertyOptional({ nullable: true }) complement!: string | null;
  @ApiProperty() district!: string;
  @ApiProperty() city!: string;
  @ApiProperty() state!: string;
  @ApiPropertyOptional({ nullable: true }) latitude!: number | null;
  @ApiPropertyOptional({ nullable: true }) longitude!: number | null;
  @ApiProperty() isPrimary!: boolean;

  static fromEntity(address: Address): AddressResponse {
    return {
      id: address.id,
      label: address.label,
      cep: address.cep,
      street: address.street,
      number: address.number,
      complement: address.complement,
      district: address.district,
      city: address.city,
      state: address.state,
      latitude: address.latitude,
      longitude: address.longitude,
      isPrimary: address.isPrimary,
    };
  }
}

export class CepResponse {
  @ApiProperty() cep!: string;
  @ApiProperty() street!: string;
  @ApiProperty() district!: string;
  @ApiProperty() city!: string;
  @ApiProperty() state!: string;
}
