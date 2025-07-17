
export interface RouteData {
  id: string;
  distanceInKm: number;
  clientRate?: number;
  carrierRate?: number;
  originId: string;
  destinationId: string;
}

export interface Location {
  id: string;
  name: string;
  provinceId: string;
}

export interface RouteResponse extends RouteData {
  clientRate: number;
  carrierRate: number;
  origin: Location;
  destination: Location;
}
