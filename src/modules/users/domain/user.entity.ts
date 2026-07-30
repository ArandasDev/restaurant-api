import { Role } from '../../../common/enums/role.enum';

export type UserStatus = 'ACTIVE' | 'BLOCKED';

/** Domain view of an authentication identity (framework/persistence agnostic). */
export interface User {
  id: string;
  tenantId: string | null;
  email: string;
  passwordHash: string;
  role: Role;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
