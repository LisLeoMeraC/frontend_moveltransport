import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { VehicleOwnerData, VehicleOwnerResponse } from '../models/vehicle-owner.model';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { catchError, finalize, Observable, tap, throwError } from 'rxjs';
import { ApiResponse, IdentificationType, Pagination } from '../models/shared.model';
import { BaseHttpService } from './base-http.service';

@Injectable({
    providedIn: 'root'
})
export class VehicleOwnerService extends BaseHttpService<VehicleOwnerResponse> {
    private readonly baseUrl = environment.apiUrl;
    private vehhicleOwners = signal<VehicleOwnerResponse[]>([]);
    readonly vehicleOwnersList = this.vehhicleOwners.asReadonly();
    

    constructor(
        private http: HttpClient,
        private messageService: MessageService
    ) {
        super();
    }

   

    loadVehicleOwners(options?:{page?:number; limit?:number}): Observable<ApiResponse<VehicleOwnerResponse[]>> {
        this.loading.set(true);
        this.clearError();
        let params = new HttpParams();
        if(options?.page && options?.limit) params=params.set('page', options.page.toString()).set('limit',options.limit.toString());
        
        return this.http.get<ApiResponse<VehicleOwnerResponse[]>>(`${this.baseUrl}/vehicle-owner/enabled`, { params }).pipe(
            tap((response) => {
                if (this.handleApiResponse(response)) {
                    this.vehhicleOwners.set(response.data || []);
                    if (response.pagination) this.setPagination(response.pagination);
                }
            }),
            catchError(this.handleHttpError<ApiResponse<VehicleOwnerResponse[]>>('Error al cargar propietarios de vehículos')),
            finalize(() => this.loading.set(false))
        );
    }

    getIdentificationTypes(): { label: string; value: IdentificationType }[] {
        return [
            { label: 'RUC', value: IdentificationType.ruc },
            { label: 'DNI', value: IdentificationType.dni },
            { label: 'Pasaporte', value: IdentificationType.passport },
            { label: 'Otro', value: IdentificationType.other }
        ];
    }

    registerVehicleOwner(vehhicleOwnerData: VehicleOwnerData): Observable<ApiResponse<VehicleOwnerResponse>> {
        this.loading.set(true);
        this.clearError();
        return this.http.post<ApiResponse<VehicleOwnerResponse>>(`${this.baseUrl}/vehicle-owner`, vehhicleOwnerData).pipe(
            tap((response)=>this.handleApiResponse(response)),
            catchError(this.handleHttpError<ApiResponse<VehicleOwnerResponse>>('Error al registrar propietario')),
            finalize(() => this.loading.set(false)) 
        );
    }

    updateVehicleOwner(id: string, vehhicleOwnerData: VehicleOwnerData): Observable<ApiResponse<VehicleOwnerResponse>> {
        this.loading.set(true);
        this.clearError();
        return this.http.put<ApiResponse<VehicleOwnerResponse>>(`${this.baseUrl}/vehicle-owner/${id}`, vehhicleOwnerData).pipe(
            tap((response) => this.handleApiResponse(response)),
            catchError(this.handleHttpError<ApiResponse<VehicleOwnerResponse>>('Error al actualizar propietario')),
            finalize(() => this.loading.set(false))
        );
    }

    disableVehicleOwner(id: string): Observable<ApiResponse<VehicleOwnerResponse>> {
        this.loading.set(true);
        this.clearError();

        return this.http.put<ApiResponse<VehicleOwnerResponse>>(`${this.baseUrl}/vehicle-owner/disable/${id}`, null).pipe(
            tap((response) => {
                if (this.handleApiResponse(response, 'Error al deshabilitar propietario')) {
                    this.vehhicleOwners.update(owners => owners.filter(owner => owner.id !== id));
                }
            }),
            catchError(this.handleHttpError<ApiResponse<VehicleOwnerResponse>>('Error al deshabilitar propietario')),
            finalize(() => this.loading.set(false))
        );
    }

    enableVehicleOwner(id: string): Observable<ApiResponse<VehicleOwnerResponse>> {
        this.loading.set(true);
        this.clearError();
        return this.http.put<ApiResponse<VehicleOwnerResponse>>(`${this.baseUrl}/vehicle-owner/enable/${id}`, null).pipe(
            tap((response) => this.handleApiResponse(response, 'Error al habilitar al propietario')),
            catchError(this.handleHttpError<ApiResponse<VehicleOwnerResponse>>('Error al habilitar al propietario')),
            finalize(() => this.loading.set(false))
        );
    }

    searchByIdentification(identification: string): Observable<ApiResponse<any>> {
        return this.http.get<ApiResponse<any>>(`${this.baseUrl}/vehicle-owner/identification/${identification}`).pipe(
            tap({
                next: (response) => {
                    if (response.statusCode !== 200) {
                        const errorMessage = this.formatErrorMessage(response);
                        this.error.set(errorMessage);
                    }
                    this.loading.set(false);
                },
                error: (err) => {
                    const errorMessage = this.getErrorMessage(err);
                    this.error.set(errorMessage);
                    this.loading.set(false);
                }
            })
        );
    }

    searchVehicleOwner(term: string, page: number = 1, limit: number = 10): Observable<ApiResponse<VehicleOwnerResponse[]>> {
        this.loading.set(true);
        this.error.set(null);

        let params = new HttpParams().set('term', term).set('page', page.toString()).set('limit', limit.toString());

        return this.http.get<ApiResponse<VehicleOwnerResponse[]>>(`${this.baseUrl}/vehicle-owner/search`, { params }).pipe(
            tap({
                next: (response) => {
                    if (response.statusCode >= 200 && response.statusCode < 300) {
                        this.vehhicleOwners.set(response.data || []);
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

    deleteCompany(id: string): Observable<ApiResponse<any>> {
        this.loading.set(true);
        this.error.set(null);

        return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/vehicle-owner/${id}`).pipe(
            tap({
                next: (response) => {
                    if (response.statusCode >= 200 && response.statusCode < 300) {
                    } else {
                        const errorMessage = this.formatErrorMessage(response);
                        this.error.set(errorMessage);
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

    
}
