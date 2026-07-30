import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiHeader,
  ApiNoContentResponse,
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
import { ConsumerService } from '../application/consumer.service';
import {
  ConsumerResponse,
  RegisterConsumerDto,
  UpdateConsumerDto,
} from './dto/consumer.dto';

@ApiTags('consumers')
@Controller('consumers')
export class ConsumersController {
  constructor(private readonly consumers: ConsumerService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Register a consumer at a restaurant (tenant)' })
  @ApiHeader({ name: 'X-Tenant-Slug', required: true })
  @ApiCreatedResponse({ type: ConsumerResponse })
  @ApiConflictResponse({
    type: ErrorResponse,
    description: 'Email already taken',
  })
  async register(@Body() dto: RegisterConsumerDto): Promise<ConsumerResponse> {
    const consumer = await this.consumers.register(dto);
    return ConsumerResponse.fromEntity(consumer);
  }

  @Roles(Role.CONSUMER)
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Get the current consumer profile' })
  @ApiOkResponse({ type: ConsumerResponse })
  async getMe(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ConsumerResponse> {
    const consumer = await this.consumers.getProfile(user.userId);
    return ConsumerResponse.fromEntity(consumer);
  }

  @Roles(Role.CONSUMER)
  @ApiBearerAuth()
  @Patch('me')
  @ApiOperation({ summary: 'Update the current consumer profile' })
  @ApiOkResponse({ type: ConsumerResponse })
  async updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateConsumerDto,
  ): Promise<ConsumerResponse> {
    const consumer = await this.consumers.updateProfile(user.userId, dto);
    return ConsumerResponse.fromEntity(consumer);
  }

  @Roles(Role.CONSUMER)
  @ApiBearerAuth()
  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete (deactivate) the current consumer account' })
  @ApiNoContentResponse()
  async deleteMe(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.consumers.deleteAccount(user.userId);
  }
}
