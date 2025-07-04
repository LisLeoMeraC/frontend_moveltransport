import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ApiResponse, DriverData, DriverResponse } from '../models/driver';
import { Pagination } from '../models/company';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { Observable, tap } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class DriverService {
    private readonly baseUrl = environment.apiUrl;
    private drivers = signal<DriverResponse[]>([]);
    private loading = signal<boolean>(false);
    private error = signal<string | null>(null);

    private pagination = signal<Pagination>({
        currentPage: 1,
        pageSize: 5,
        totalPages: 1,
        totalRecords: 0
    });

    readonly driversList = this.drivers.asReadonly();
    readonly isLoading = this.loading.asReadonly();
    readonly hasError = this.error.asReadonly();
    readonly paginationData = this.pagination.asReadonly();

    constructor(
        private http: HttpClient,
        private messageService: MessageService
    ) {}

    loadDrivers(options?: { page?: number; limit?: number }): Observable<ApiResponse<DriverResponse[]>> {
    this.loading.set(true);
    this.error.set(null);

    let params = new HttpParams().set('includeCompany', 'true');

    if (options?.page && options?.limit) {
        params = params.set('page', options.page.toString()).set('limit', options.limit.toString());
    }

    return this.http.get<ApiResponse<DriverResponse[]>>(`${this.baseUrl}/driver/enabled`, { params }).pipe(
        tap({
            next: (response) => {
                if (response.statusCode >= 200 && response.statusCode < 300) {
                    this.drivers.set(response.data || []);

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

    registerDriver(driverData: DriverData): Observable<ApiResponse<DriverResponse>> {
        this.loading.set(true);
        this.error.set(null);
        return this.http.post<ApiResponse<DriverResponse>>(`${this.baseUrl}/driver`, driverData).pipe(
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

    updateDriver(id: string, driverData: DriverData): Observable<ApiResponse<DriverResponse>> {
        this.loading.set(true);
        this.error.set(null);

        return this.http.put<ApiResponse<DriverResponse>>(`${this.baseUrl}/driver/${id}`, driverData).pipe(
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
    searchDrivers(term: string, page: number = 1, limit: number = 5): Observable<ApiResponse<DriverResponse[]>> {
        this.loading.set(true);
        this.error.set(null);

        let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString()).set('term', term).set('includeCompany', 'true');

        return this.http.get<ApiResponse<DriverResponse[]>>(`${this.baseUrl}/driver/search`, { params }).pipe(
            tap({
                next: (response) => {
                    if (response.statusCode >= 200 && response.statusCode < 300) {
                        this.drivers.set(response.data || []);
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

    // Añade este método en tu servicio
    

    deleteDriver(id: string): Observable<ApiResponse<any>> {
        this.loading.set(true);
        this.error.set(null);

        return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/driver/${id}`).pipe(
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
