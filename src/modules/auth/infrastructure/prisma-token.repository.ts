import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  CreateTokenData,
  PasswordResetTokenRepository,
  RefreshTokenRepository,
  StoredRefreshToken,
  StoredResetToken,
} from '../domain/token.repository';

@Injectable()
export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateTokenData): Promise<void> {
    await this.prisma.refreshToken.create({ data });
  }

  findById(id: string): Promise<StoredRefreshToken | null> {
    return this.prisma.refreshToken.findUnique({ where: { id } });
  }

  async revoke(id: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

@Injectable()
export class PrismaPasswordResetTokenRepository implements PasswordResetTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateTokenData): Promise<void> {
    await this.prisma.passwordResetToken.create({ data });
  }

  findById(id: string): Promise<StoredResetToken | null> {
    return this.prisma.passwordResetToken.findUnique({ where: { id } });
  }

  async markUsed(id: string): Promise<void> {
    await this.prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async invalidateAllForUser(userId: string): Promise<void> {
    await this.prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });
  }
}
