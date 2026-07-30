import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums/role.enum';
import { RolesGuard } from './roles.guard';

function contextWith(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('allows routes without required roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(contextWith(undefined))).toBe(true);
  });

  it('allows a user whose role is permitted', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.CONSUMER]);
    expect(guard.canActivate(contextWith({ role: Role.CONSUMER }))).toBe(true);
  });

  it('forbids a user whose role is not permitted', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.MANAGER]);
    expect(() =>
      guard.canActivate(contextWith({ role: Role.CONSUMER })),
    ).toThrow(ForbiddenException);
  });

  it('forbids when there is no authenticated user', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.CONSUMER]);
    expect(() => guard.canActivate(contextWith(undefined))).toThrow(
      ForbiddenException,
    );
  });
});
