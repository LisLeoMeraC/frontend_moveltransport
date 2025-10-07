import { FreightStatus, FreightType, CargaUnitType, CargaCondition } from './shared.model';

export interface FreightData {
    id: string;
    clientId: string;
    createdAt: string;
    freightStatus: FreightStatus;
    paymentStatus: string;
    type: FreightType;
    serialReference: string;
    requestedDate: string;
    requestedUnits: number;
    cargoUnitType: CargaUnitType;
    cargoCondition: CargaCondition;
    originId: string;
    originReference: string;
    destinationId: string;
    destinationReference: string;
    originDepotId: string;
    destinationDepotId: string;
    remarks: string;
}

export interface FreightResponse extends FreightData {}
