import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, finalize, Observable, tap } from 'rxjs';
import { DriverResponse, DriverData } from '../models/driver.model';
import { ApiResponse } from '../models/shared.model';
import { BaseHttpService } from './base-http.service';

@Injectable({
    providedIn: 'root'
})
export class DriverService extends BaseHttpService<DriverResponse> {
    private readonly baseUrl = environment.apiUrl;
    private drivers = signal<DriverResponse[]>([]);
    readonly driversList = this.drivers.asReadonly();

    constructor(
        private http: HttpClient
    ) {
        super();
    }

    loadDrivers(params?: { page?: number; limit?: number }): Observable<ApiResponse<DriverResponse[]>> {
        this.loading.set(true);
        this.clearError();
        let httpParams = new HttpParams().set('includeCompany', 'true');
        if (params?.page) httpParams = httpParams.set('page', params.page.toString());
        if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());

        return this.http.get<ApiResponse<DriverResponse[]>>(`${this.baseUrl}/driver/enabled`, { params: httpParams }).pipe(
            tap((response) => {
                if (this.handleApiResponse(response)) {
                    this.drivers.set(response.data || []);
                    if (response.pagination) this.setPagination(response.pagination);
                }
            }),
            catchError(this.handleHttpError<ApiResponse<DriverResponse[]>>('Error al cargar conductores')),
            finalize(() => this.loading.set(false))
        );
    }

    registerDriver(driverData: DriverData): Observable<ApiResponse<DriverResponse>> {
        this.loading.set(true);
        this.clearError();
        return this.http.post<ApiResponse<DriverResponse>>(`${this.baseUrl}/driver`, driverData).pipe(
            tap((response) => this.handleApiResponse(response)),
            catchError(this.handleHttpError<ApiResponse<DriverResponse>>('Error al registrar conductor')),
            finalize(() => this.loading.set(false))
        );
    }

    updateDriver(id: string, driverData: DriverData): Observable<ApiResponse<DriverResponse>> {
        this.loading.set(true);
        this.clearError();
        return this.http.put<ApiResponse<DriverResponse>>(`${this.baseUrl}/driver/${id}`, driverData).pipe(
            tap((response) => this.handleApiResponse(response)),
            catchError(this.handleHttpError<ApiResponse<DriverResponse>>('Error al actualizar conductor')),
            finalize(() => this.loading.set(false))
        );
    }

    searchDrivers(term: string, page: number = 1, limit: number = 5): Observable<ApiResponse<DriverResponse[]>> {
        this.loading.set(true);
        this.clearError();

        let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString()).set('term', term).set('includeCompany', 'true');

        return this.http.get<ApiResponse<DriverResponse[]>>(`${this.baseUrl}/driver/search`, { params }).pipe(
            tap((response) => {
                if (this.handleApiResponse(response)) {
                    this.drivers.set(response.data || []);
                    if (response.pagination) this.setPagination(response.pagination);
                }
            }),
            catchError(this.handleHttpError<ApiResponse<DriverResponse[]>>('Error al buscar conductores')),
            finalize(() => this.loading.set(false))
        );
    }


    deleteDriver(id: string): Observable<ApiResponse<DriverResponse>> {
        this.loading.set(true);
        this.clearError();

        return this.http.delete<ApiResponse<DriverResponse>>(`${this.baseUrl}/driver/${id}`).pipe(
            tap((response) => {
                if (this.handleApiResponse(response, 'Error al eliminar conductor')) {
                    const updatedDrivers = this.drivers().filter((driver) => driver.id !== id);
                    this.drivers.set(updatedDrivers);
                }
            }),
            catchError(this.handleHttpError<ApiResponse<DriverResponse>>('Error al eliminar conductor')),
            finalize(() => this.loading.set(false))
        );
    }
}
