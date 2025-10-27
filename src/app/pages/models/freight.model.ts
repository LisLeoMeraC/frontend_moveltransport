import { FreightStatus, FreightType, CargaUnitType, CargaCondition } from './shared.model';

export interface FreightData {
    id: string;
    clientId: string; //
    createdAt: string;
    freightStatus: FreightStatus;
    paymentStatus: string;
    type: FreightType; //
    serialReference?: string; //
    requestedDate: string; //
    requestedUnits: number; //
    cargoUnitType: CargaUnitType; //
    cargoCondition: CargaCondition; //
    cargoDescription?: string; //
    originId: string; //
    originReference?: string; //
    destinationId: string; //
    destinationReference?: string; //
    originDepotId?: string; //
    destinationDepotId?: string; //
    remarks?: string; //
}

export interface FreightResponse extends FreightData {
    client?: {
        id: string;
        subject?: {
            name: string;
        };
    };
    origin?: {
        id: string;
        name: string;
        provinceId?: string;
    };
    destination?: {
        id: string;
        name: string;
        provinceId?: string;
    };
    originDepot?: {
        id: string;
        name: string;
    };
    destinationDepot?: {
        id: string;
        name: string;
    };
}
