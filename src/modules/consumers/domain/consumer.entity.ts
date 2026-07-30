export interface Consumer {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  phone: string;
  cpf: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface Address {
  id: string;
  tenantId: string;
  consumerId: string;
  label: string;
  cep: string;
  street: string;
  number: string;
  complement: string | null;
  district: string;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}
