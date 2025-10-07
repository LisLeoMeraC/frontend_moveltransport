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

export enum CargaCondition {
    dry = 'dry',
    refrigerated = 'refrigerated',
    hazardous = 'hazardous'
}

export enum CargaUnitType {
    STANDARD_20 = 'SD20',
    STANDARD_40 = 'SD40',
    HIGH_CUBE_40 = 'HC40',
    DUMP = 'DUMP',
    FLATBED = 'FLTB',
    TANK = 'TANK',
    DRY_VAN = 'DRYV'
}

export enum FreightStatus {
    PENDING = 'pending',
    IN_TRANSIT = 'in_transit',
    DELAYED = 'delayed',
    COMPLETED = 'completed',
    CANCELED = 'canceled'
}

export enum FreightType {
    EXPORT = 'export',
    IMPORT = 'import',
    INTERNAL = 'internal',
    RESCUE = 'rescue'
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
