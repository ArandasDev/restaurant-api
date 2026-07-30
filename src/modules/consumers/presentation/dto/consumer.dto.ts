import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsStrongPassword } from '../../../../common/validation/is-strong-password.decorator';
import { Consumer } from '../../domain/consumer.entity';

const PHONE_REGEX = /^\+?[0-9]{10,15}$/;
const CPF_REGEX = /^\d{11}$/;

export class RegisterConsumerDto {
  @ApiProperty({ example: 'maria@example.com' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsStrongPassword()
  password!: string;

  @ApiProperty({ example: 'Maria Silva' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({
    example: '5511999998888',
    description: '10–15 digits, optional +.',
  })
  @Matches(PHONE_REGEX, { message: 'phone must be a valid phone number' })
  phone!: string;

  @ApiPropertyOptional({ example: '12345678901', description: '11-digit CPF.' })
  @IsOptional()
  @Matches(CPF_REGEX, { message: 'cpf must contain 11 digits' })
  cpf?: string;
}

export class UpdateConsumerDto {
  @ApiPropertyOptional({ example: 'Maria S. Souza' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: '5511988887777' })
  @IsOptional()
  @Matches(PHONE_REGEX, { message: 'phone must be a valid phone number' })
  phone?: string;

  @ApiPropertyOptional({ example: '12345678901' })
  @IsOptional()
  @Matches(CPF_REGEX, { message: 'cpf must contain 11 digits' })
  cpf?: string;
}

export class ConsumerResponse {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() phone!: string;
  @ApiPropertyOptional({ nullable: true }) cpf!: string | null;
  @ApiProperty() createdAt!: Date;

  static fromEntity(consumer: Consumer): ConsumerResponse {
    return {
      id: consumer.id,
      name: consumer.name,
      phone: consumer.phone,
      cpf: consumer.cpf,
      createdAt: consumer.createdAt,
    };
  }
}
