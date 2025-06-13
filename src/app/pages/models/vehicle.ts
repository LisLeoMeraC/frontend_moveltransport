export interface ApiResponse<T> 
  {
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

export interface VehicleData{
    id: string;
    plate: string;
    brand: string;
    color?: string;
    companyId: string;
    ownerId: string;
    defaultDriverId?: string;    
}

export interface VehicleResponse {
    id: string;
    plate: string;
    brand: string;
    color?: string;
    companyId: string;
    ownerId: string;
    defaultDriverId?: string;    
    isEnabled: boolean;
}