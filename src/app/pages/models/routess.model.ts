export interface RouteData {
    id: string;
    distanceInKm: number;
    clientRate?: number;
    carrierRate?: number;
    originId?: string;
    destinationId?: string;
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

export interface ProvinceResponse {
    id: string;
    name: string;
}

export interface CityResponse {
    id: string;
    name: string;
    provinceId: string;
}

export interface RateClientData {
    id?: string;
    rate: number;
    originId: string;
    destinationId: string;
    clientId: string;
    distanceInKm: number;
}

export interface ClientRateResponse {
    id: string;
    routeId: string;
    clientId: string;
    rate: number;
    route: RouteResponse;
}

export type CreateRouteData = Omit<RouteData, 'id'>;

export type CreateRateClientData = Omit<RateClientData, 'id'>;

export type UpdateRouteData = Pick<RouteData, 'distanceInKm' | 'clientRate' | 'carrierRate'>;

export type UpdateRateClientData = Pick<RateClientData, 'rate'>;
