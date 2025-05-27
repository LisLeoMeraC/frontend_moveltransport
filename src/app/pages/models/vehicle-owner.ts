import { IdentificationType } from "./company";

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
    subject: {
        id: string;
        identification: string;
        identificationType: IdentificationType;
        name: string;
        createdAt: string;
        address?: string;
        phone?: string;
        email?: string;
    };
}