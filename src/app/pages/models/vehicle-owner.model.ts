import { IdentificationType, SubjectInfo } from './shared.model';

export interface VehicleOwnerData {
    identification: string;
    identificationType: IdentificationType;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
}

export interface VehicleOwnerResponse {
    id: string;
    subjectId: string;
    isEnabled: boolean;
    subject: SubjectInfo;
}

export interface OwnerSearchByIdentificationResponse {
    isRegistered: boolean;
    vehicleOwner: VehicleOwnerResponse | null;
}
