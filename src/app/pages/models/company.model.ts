import { CompanyType, IdentificationType, SubjectInfo } from './shared.model';

export interface CompanyData {
    identification: string;
    identificationType: IdentificationType;
    name: string;
    adrress?: string;
    phone?: string;
    email?: string;
    type: CompanyType;
}

export interface CompanyResponse {
    id: string;
    subjectId: string;
    type: CompanyType;
    isEnabled: boolean;
    subject: SubjectInfo;
}

export interface CompanySearchByIdentificationResponse {
    isRegistered: boolean;
    company: CompanyResponse | null;
}
