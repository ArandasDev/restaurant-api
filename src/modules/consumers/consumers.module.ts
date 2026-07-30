import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AddressService } from './application/address.service';
import { ConsumerService } from './application/consumer.service';
import { ADDRESS_REPOSITORY } from './domain/address.repository';
import { CEP_LOOKUP } from './domain/cep-lookup.port';
import { CONSUMER_REPOSITORY } from './domain/consumer.repository';
import { PrismaAddressRepository } from './infrastructure/prisma-address.repository';
import { PrismaConsumerRepository } from './infrastructure/prisma-consumer.repository';
import { ViaCepAdapter } from './infrastructure/viacep.adapter';
import { AddressesController } from './presentation/addresses.controller';
import { ConsumersController } from './presentation/consumers.controller';

@Module({
  imports: [UsersModule],
  controllers: [ConsumersController, AddressesController],
  providers: [
    ConsumerService,
    AddressService,
    { provide: CONSUMER_REPOSITORY, useClass: PrismaConsumerRepository },
    { provide: ADDRESS_REPOSITORY, useClass: PrismaAddressRepository },
    { provide: CEP_LOOKUP, useClass: ViaCepAdapter },
  ],
})
export class ConsumersModule {}
