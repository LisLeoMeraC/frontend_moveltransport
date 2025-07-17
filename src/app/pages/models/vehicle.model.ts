
export interface VehicleData {
  id: string;
  plate: string;
  brand: string;
  year?: number;
  model?: string;
  color?: string;
  companyId: string;
  ownerId: string;
  defaultDriverId?: string;
}

export interface VehicleResponse extends VehicleData {
  isEnabled: boolean;
}
