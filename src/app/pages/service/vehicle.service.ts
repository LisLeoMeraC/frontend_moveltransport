import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { VehicleData, VehicleResponse } from '../models/vehicle';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { Observable, tap } from 'rxjs';
import { ApiResponse } from '../models/company';

@Injectable({
    providedIn: 'root'
})
export class VehicleService {
    private readonly baseUrl = environment.apiUrl;
    private vehicles = signal<VehicleResponse[]>([]);
    private loading = signal<boolean>(false);
    private error = signal<string | null>(null);

    private pagination = signal<{ currentPage: number; pageSize: number; totalPages: number; totalRecords: number }>({
        currentPage: 1,
        pageSize: 5,
        totalPages: 1,
        totalRecords: 0
    });

    readonly vehiclesList = this.vehicles.asReadonly();
    readonly isLoading = this.loading.asReadonly();
    readonly hasError = this.error.asReadonly();
    readonly paginationData = this.pagination.asReadonly();

    constructor(
        private http: HttpClient,
        private messageService: MessageService
    ) {}

    loadVehicles(page: number = 1, limit: number = 5): Observable<ApiResponse<VehicleResponse[]>> {
        this.loading.set(true);
        this.error.set(null);

        let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString()).set('includeCompany', 'true').set('includeDriver', 'true').set('includeOwner', 'true');

        return this.http.get<ApiResponse<VehicleResponse[]>>(`${this.baseUrl}/vehicle/enabled`, { params }).pipe(
            tap({
                next: (response) => {
                    if (response.statusCode >= 200 && response.statusCode < 300) {
                        this.vehicles.set(response.data || []);
                        if (response.pagination) {
                            this.pagination.set(response.pagination);
                        }
                    } else {
                        const errorMessage = this.formatErrorMessage(response);
                        this.error.set(errorMessage);
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: errorMessage,
                            life: 5000
                        });
                    }
                    this.loading.set(false);
                },
                error: (err) => {
                    const errorMessage = this.getErrorMessage(err);
                    this.error.set(errorMessage);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: errorMessage,
                        life: 5000
                    });
                    this.loading.set(false);
                }
            })
        );
    }

    registerVehicle(VehicleData: VehicleData): Observable<ApiResponse<VehicleResponse>> {
        this.loading.set(true);
        this.error.set(null);

        return this.http.post<ApiResponse<VehicleResponse>>(`${this.baseUrl}/vehicle`, VehicleData).pipe(
            tap({
                next: (response) => {
                    if (response.statusCode >= 200 && response.statusCode < 300) {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Éxito',
                            detail: 'Vehículo registrado correctamente',
                            life: 5000
                        });
                    } else {
                        const errorMessage = this.formatErrorMessage(response);
                        this.error.set(errorMessage);
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: errorMessage,
                            life: 5000
                        });
                    }
                    this.loading.set(false);
                },
                error: (err) => {
                    const errorMessage = this.getErrorMessage(err);
                    this.error.set(errorMessage);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: errorMessage,
                        life: 5000
                    });
                    this.loading.set(false);
                }
            })
        );
    }

    updateVehicle(id:string, vehicleData:VehicleData):Observable<ApiResponse<VehicleResponse>>{
        this.loading.set(true);
        this.error.set(null);

        return this.http.put<ApiResponse<VehicleResponse>>(`${this.baseUrl}/vehicle/${id}`, vehicleData).pipe(
            tap({
                next:(response)=>{
                    if(response.statusCode>=200 && response.statusCode<300 ){
                    }
                    else {
                        const errorMessage = this.formatErrorMessage(response);
                        this.error.set(errorMessage);
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: errorMessage,
                            life: 5000
                        });
                    }
                    this.loading.set(false);
                },
                error: (err) => {
                    const errorMessage = this.getErrorMessage(err);
                    this.error.set(errorMessage);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: errorMessage,
                        life: 5000
                    });
                    this.loading.set(false);
                }
               })
        );
    }

    searchVehicles(query: string, page: number = 1, limit: number = 5): Observable<ApiResponse<VehicleResponse[]>> {
        this.loading.set(true); 
        this.error.set(null);

        // Cambia 'query' por 'plate' para coincidir con la API
        let params = new HttpParams()
            .set('plate', query)
            .set('page', page.toString())
            .set('limit', limit.toString());

        return this.http.get<ApiResponse<VehicleResponse[]>>(`${this.baseUrl}/vehicle/search`, { params }).pipe(
            tap({
                next: (response) => {
                    if (response.statusCode >= 200 && response.statusCode < 300) {
                        this.vehicles.set(response.data || []);
                        if (response.pagination) {
                            this.pagination.set(response.pagination);
                        }
                    } else {
                        const errorMessage = this.formatErrorMessage(response);
                        this.error.set(errorMessage);
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: errorMessage,
                            life: 5000
                        });
                    }
                    this.loading.set(false);
                },
                error: (err) => {
                    const errorMessage = this.getErrorMessage(err);
                    this.error.set(errorMessage);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: errorMessage,
                        life: 5000
                    });
                    this.loading.set(false);
                }
            })
        );
    }

    private formatErrorMessage(response: ApiResponse<any>): string {
        if (response.error) {
            return response.error;
        }

        if (response.message) {
            return Array.isArray(response.message) ? response.message.join(', ') : response.message;
        }

        return 'Error al cargar los conductores';
    }

    private getErrorMessage(error: any): string {
        if (error.error) {
            if (error.error.message) {
                return Array.isArray(error.error.message) ? error.error.message.join(', ') : error.error.message;
            }
            return error.error.error || error.message || 'Error desconocido';
        }
        return error.message || 'Error al conectar con el servidor';
    }

    
}
