export interface CepAddress {
  cep: string;
  street: string;
  district: string;
  city: string;
  state: string;
}

/** Port for resolving a Brazilian postal code (CEP) into an address. */
export interface CepLookupPort {
  lookup(cep: string): Promise<CepAddress | null>;
}

export const CEP_LOOKUP = Symbol('CEP_LOOKUP');

/** Normalises a CEP to 8 digits, or returns null if it is not a valid CEP. */
export function normalizeCep(cep: string): string | null {
  const digits = cep.replace(/\D/g, '');
  return /^\d{8}$/.test(digits) ? digits : null;
}
