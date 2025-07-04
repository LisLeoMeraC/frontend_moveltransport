import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { VehicleOwnerData, VehicleOwnerResponse } from '../models/vehicle-owner';
import { ApiResponse, IdentificationType, Pagination } from '../models/company';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { catchError, finalize, Observable, tap, throwError } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class VehicleOwnerService {
    private readonly baseUrl = environment.apiUrl;
    private vehhicleOwners = signal<VehicleOwnerResponse[]>([]);
    private loading = signal<boolean>(false);
    private error = signal<string | null>(null);

    private pagination = signal<Pagination>({
        currentPage: 1,
        pageSize: 5,
        totalPages: 1,
        totalRecords: 0
    });

    readonly vehicleOwnersList = this.vehhicleOwners.asReadonly();
    readonly isLoading = this.loading.asReadonly();
    readonly hasError = this.error.asReadonly();
    readonly paginationData = this.pagination.asReadonly();

    constructor(
        private http: HttpClient,
        private messageService: MessageService
    ) {}

    private setError(message: string) {
        this.error.set(message);
    }

    loadVehicleOwners(options?:{page?:number; limit?:number}): Observable<ApiResponse<VehicleOwnerResponse[]>> {
        this.loading.set(true);
        this.error.set(null);

         let params = new HttpParams();
         if(options?.page && options?.limit){
            params=params.set('page', options.page.toString()).set('limit',options.limit.toString());
         }

        return this.http.get<ApiResponse<VehicleOwnerResponse[]>>(`${this.baseUrl}/vehicle-owner/enabled`, { params }).pipe(
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

    private formatErrorMessage(response: ApiResponse<any>): string {
        if (response.error) {
            return response.error;
        }

        if (response.message) {
            return Array.isArray(response.message) ? response.message.join(', ') : response.message;
        }

        return 'Error al cargar las compañías';
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
        this.error.set(null);
        return this.http.post<ApiResponse<VehicleOwnerResponse>>(`${this.baseUrl}/vehicle-owner`, vehhicleOwnerData).pipe(
            tap({
                next: (response) => {
                    if (response.statusCode >= 200 && response.statusCode < 300) {
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

    updateVehicleOwner(id: string, vehhicleOwnerData: VehicleOwnerData): Observable<ApiResponse<VehicleOwnerResponse>> {
        this.loading.set(true);
        this.error.set(null);

        return this.http.put<ApiResponse<VehicleOwnerResponse>>(`${this.baseUrl}/vehicle-owner/${id}`, vehhicleOwnerData).pipe(
            tap({
                next: (response) => {
                    if (response.statusCode >= 200 && response.statusCode < 300) {
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

    disableVehicleOwner(id: string): Observable<ApiResponse<VehicleOwnerResponse>> {
        this.loading.set(true);
        this.error.set(null);

        return this.http.put<ApiResponse<VehicleOwnerResponse>>(`${this.baseUrl}/vehicle-owner/disable/${id}`, null).pipe(
            tap((response) => {
                if (this.handleApiResponse(response, 'Error al deshabilitar el propietario')) {
                    //Para actualizar la lista
                    const updatedVehicleOwners = this.vehhicleOwners().filter((vehicleOwner) => vehicleOwner.id !== id);
                    this.vehhicleOwners.set(updatedVehicleOwners);
                }
            }),
            catchError(this.handleHttpError<ApiResponse<VehicleOwnerResponse>>('Error al deshabilitar propietario')),
            finalize(() => this.loading.set(false))
        );
    }

    enableVehicleOwner(id: string): Observable<ApiResponse<VehicleOwnerResponse>> {
        this.loading.set(true);
        this.error.set(null);

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

    private handleApiResponse<T>(response: ApiResponse<T>, fallbackError: string = 'Error'): boolean {
        if (response.statusCode < 200 || response.statusCode >= 300) {
            const message = this.formatErrorMessage(response) || fallbackError;
            this.setError(message);
            this.loading.set(false);
            return false;
        }
        return true;
    }

    private handleHttpError<T>(contextMsg = 'Error'): (error: any) => Observable<T> {
        return (error: any) => {
            const message = this.getErrorMessage(error) || contextMsg;
            this.setError(message);
            this.loading.set(false);
            return throwError(() => error);
        };
    }
}
