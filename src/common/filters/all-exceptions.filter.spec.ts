import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
} from '@nestjs/common';
import { ConflictError } from '../errors/domain-error';
import { AllExceptionsFilter } from './all-exceptions.filter';

function hostFor(url = '/api/v1/x'): {
  host: ArgumentsHost;
  json: jest.Mock;
  status: jest.Mock;
} {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ url }),
    }),
  } as unknown as ArgumentsHost;
  return { host, json, status };
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  it('maps a DomainError to its code and status', () => {
    const { host, json, status } = hostFor();
    filter.catch(new ConflictError('SLUG_TAKEN', 'taken'), host);
    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'SLUG_TAKEN', statusCode: 409 }),
    );
  });

  it('maps validation-style HttpException messages to a fields detail', () => {
    const { host, json } = hostFor();
    filter.catch(
      new BadRequestException({ message: ['email must be valid'] }),
      host,
    );
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'BAD_REQUEST',
        details: { fields: ['email must be valid'] },
      }),
    );
  });

  it('maps a generic HttpException', () => {
    const { host, status } = hostFor();
    filter.catch(new HttpException('nope', 403), host);
    expect(status).toHaveBeenCalledWith(403);
  });

  it('hides internals for unknown errors as a 500', () => {
    const { host, json, status } = hostFor();
    filter.catch(new Error('secret db detail'), host);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'INTERNAL_SERVER_ERROR' }),
    );
    const payload = json.mock.calls[0][0];
    expect(JSON.stringify(payload)).not.toContain('secret db detail');
  });
});
