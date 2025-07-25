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

export interface ClientRateResponse {
    id: string;
    routeId: string;
    clientId: string;
    rate: number;
    route: {
        origin: Location;
        destination: Location;
        distanceInKm: number;
        clientRate: number;
        carrierRate: number;
    };
}

export type CreateRouteData = Omit<RouteData, 'id'>;

export type UpdateRouteData = Pick<RouteData, 'distanceInKm' | 'clientRate' | 'carrierRate'>;
