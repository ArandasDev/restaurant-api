import { Role } from '../../../common/enums/role.enum';
import { TxClient } from '../../../database/prisma.service';
import { User } from './user.entity';

export interface CreateUserData {
  tenantId: string;
  email: string;
  passwordHash: string;
  role: Role;
}

/**
 * Persistence port for authentication identities. Implemented by infrastructure.
 * Methods accept an optional transaction client so callers can compose them inside
 * a tenant-scoped transaction (PrismaService.withTenant) and satisfy RLS.
 */
export interface UserRepository {
  findByEmailInTenant(
    tenantId: string,
    email: string,
    tx?: TxClient,
  ): Promise<User | null>;

  findById(id: string, tx?: TxClient): Promise<User | null>;

  create(data: CreateUserData, tx?: TxClient): Promise<User>;

  updatePassword(
    id: string,
    passwordHash: string,
    tx?: TxClient,
  ): Promise<void>;

  softDelete(id: string, tx?: TxClient): Promise<void>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
