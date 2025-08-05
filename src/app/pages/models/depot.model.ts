export interface DepotData {
    id?: number;
    name: string;
    address: string;
    phone?: string;
    email?: string;
    remarks?: string;
}

export interface DepotResponse {
    id: number;
    name: string;
    address: string;
    phone: string;
    email: string;
    remarks: string;
}
