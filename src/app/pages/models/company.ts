export enum IdentificationType {
  ruc = 'ruc',
  dni = 'dni',
  passport = 'passport',
  other = 'other'
}

export enum CompanyType {
  client = 'client',
  carrier = 'carrier'
}


export interface CompanyResponse {
  statusCode: number;
  message: string;
  data: Company[];
}

export interface Company {
  id: string;
  subjectId: string;
  type: CompanyType;
  isEnabled: boolean;
  subject: {
    id: string;
    identification: string;
    identificationType: IdentificationType;
    name: string;
    createdAt: string;
    address: string;
    phone: string;
    email?: string;
  };
}
