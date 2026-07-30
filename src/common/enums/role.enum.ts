/**
 * RBAC roles. Kept as a framework-agnostic enum in the domain space; the Prisma
 * `Role` enum mirrors these exact string values so persistence and domain agree.
 */
export enum Role {
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
  TENANT_ADMIN = 'TENANT_ADMIN',
  MANAGER = 'MANAGER',
  CASHIER = 'CASHIER',
  ATTENDANT = 'ATTENDANT',
  COOK = 'COOK',
  CONSUMER = 'CONSUMER',
  DELIVERY = 'DELIVERY',
}

/** Roles that belong to the restaurant back-office staff. */
export const STAFF_ROLES: readonly Role[] = [
  Role.TENANT_ADMIN,
  Role.MANAGER,
  Role.CASHIER,
  Role.ATTENDANT,
  Role.COOK,
];
