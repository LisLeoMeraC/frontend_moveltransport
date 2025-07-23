export interface DriverData {
    id: string;
    license: string;
    name: string;
    alias?: string;
    phone?: string;
    companyId: string;
}

export interface DriverResponse {
    id: string;
    licenseNumber: string;
    name: string;
    alias: string;
    phone: string;
    companyId: string;
    isEnabled: boolean;
}
