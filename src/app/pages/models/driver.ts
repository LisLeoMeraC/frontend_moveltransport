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


export interface DriverData{
  id:string;
  license:string;
  name:string;
  alias?: string;
  phone?: string;
  companyId:string
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

