export interface ApiResponse<T> {
    statusCode: number;
    message: string[];
    pagination?: Pagination;
    error?: string;
    data?: T;
}

export interface Pagination {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalRecords: number;
}

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

export interface RouteResponse {
  id: string;
  distanceInKm: number;
  clientRate: number;
  carrierRate: number;
  originId: string;
  destinationId: string;
  origin: Location;
  destination: Location;
}