import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServicesConfig } from '../../../config/configuration';
import {
  CepAddress,
  CepLookupPort,
  normalizeCep,
} from '../domain/cep-lookup.port';

interface ViaCepResponse {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean | string;
}

/**
 * ViaCEP-backed CEP lookup. Network/timeout failures resolve to null (the caller
 * treats CEP as unresolved rather than failing the whole request); malformed CEPs
 * short-circuit without a network call.
 */
@Injectable()
export class ViaCepAdapter implements CepLookupPort {
  private readonly logger = new Logger(ViaCepAdapter.name);
  private readonly baseUrl: string;

  constructor(configService: ConfigService) {
    this.baseUrl =
      configService.getOrThrow<ServicesConfig>('services').viaCepBaseUrl;
  }

  async lookup(cep: string): Promise<CepAddress | null> {
    const normalized = normalizeCep(cep);
    if (!normalized) {
      return null;
    }
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const response = await fetch(`${this.baseUrl}/${normalized}/json/`, {
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      if (!response.ok) {
        return null;
      }
      const data = (await response.json()) as ViaCepResponse;
      if (data.erro || !data.localidade) {
        return null;
      }
      return {
        cep: normalized,
        street: data.logradouro ?? '',
        district: data.bairro ?? '',
        city: data.localidade ?? '',
        state: data.uf ?? '',
      };
    } catch (error) {
      this.logger.warn({ err: error, cep: normalized }, 'CEP lookup failed');
      return null;
    }
  }
}
