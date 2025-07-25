// Enums
export enum IdentificationType {
  ruc = 'ruc',
  dni = 'dni',
  passport = 'passport',
  other = 'other'
}

export enum CompanyType {
  client = 'client',
  carrier = 'carrier',
  both = 'both'
}

// Interfaces comunes
export interface ApiResponse<T> {
  statusCode: number;
  message: string[];
  pagination?: Pagination;
  error?: string;
  data?: T;
}

export interface Pagination {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalRecords: number;
}

export interface SubjectInfo {
  id: string;
  identification: string;
  identificationType: IdentificationType;
  name: string;
  createdAt: string;
  address?: string;
  phone?: string;
  email?: string;
}
