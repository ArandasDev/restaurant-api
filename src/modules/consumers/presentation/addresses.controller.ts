import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { ErrorResponse } from '../../../common/http/error-response';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user';
import { AddressService } from '../application/address.service';
import {
  AddressResponse,
  CepResponse,
  CreateAddressDto,
  UpdateAddressDto,
} from './dto/address.dto';

@ApiTags('addresses')
@Controller()
export class AddressesController {
  constructor(private readonly addresses: AddressService) {}

  @Public()
  @Get('addresses/cep/:cep')
  @ApiOperation({ summary: 'Validate and look up a CEP' })
  @ApiOkResponse({ type: CepResponse })
  @ApiNotFoundResponse({ type: ErrorResponse })
  lookupCep(@Param('cep') cep: string): Promise<CepResponse> {
    return this.addresses.lookupCep(cep);
  }

  @Roles(Role.CONSUMER)
  @ApiBearerAuth()
  @Get('consumers/me/addresses')
  @ApiOperation({ summary: "List the consumer's addresses" })
  @ApiOkResponse({ type: [AddressResponse] })
  async list(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AddressResponse[]> {
    const addresses = await this.addresses.list(user.userId);
    return addresses.map(AddressResponse.fromEntity);
  }

  @Roles(Role.CONSUMER)
  @ApiBearerAuth()
  @Post('consumers/me/addresses')
  @ApiOperation({ summary: 'Add an address (enriched from CEP when possible)' })
  @ApiOkResponse({ type: AddressResponse })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAddressDto,
  ): Promise<AddressResponse> {
    const address = await this.addresses.create(user.userId, dto);
    return AddressResponse.fromEntity(address);
  }

  @Roles(Role.CONSUMER)
  @ApiBearerAuth()
  @Patch('consumers/me/addresses/:id')
  @ApiOperation({ summary: 'Update an address' })
  @ApiOkResponse({ type: AddressResponse })
  @ApiNotFoundResponse({ type: ErrorResponse })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddressDto,
  ): Promise<AddressResponse> {
    const address = await this.addresses.update(user.userId, id, dto);
    return AddressResponse.fromEntity(address);
  }

  @Roles(Role.CONSUMER)
  @ApiBearerAuth()
  @Patch('consumers/me/addresses/:id/primary')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set an address as primary' })
  @ApiNoContentResponse()
  async setPrimary(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.addresses.setPrimary(user.userId, id);
  }

  @Roles(Role.CONSUMER)
  @ApiBearerAuth()
  @Delete('consumers/me/addresses/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an address' })
  @ApiNoContentResponse()
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.addresses.remove(user.userId, id);
  }
}
