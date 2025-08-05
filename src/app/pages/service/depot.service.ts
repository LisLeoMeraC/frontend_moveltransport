import { Injectable, signal } from '@angular/core';
import { BaseHttpService } from './base-http.service';
import { DepotData, DepotResponse } from '../models/depot.model';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, finalize, Observable, tap } from 'rxjs';
import { ApiResponse } from '../models/shared.model';

@Injectable({
    providedIn: 'root'
})
export class DepotService extends BaseHttpService<DepotResponse> {
    private readonly baseUrl = environment.apiUrl;
    private depots = signal<DepotResponse[]>([]);
    readonly depotList = this.depots.asReadonly();

    constructor(private http: HttpClient) {
        super();
    }

    getDepots(page: number, limit: number, term?: string): Observable<ApiResponse<DepotResponse[]>> {
        this.loading.set(true);
        this.clearError();

        let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());
        if (term) {
            params = params.set('term', term);
        }

        return this.http.get<ApiResponse<DepotResponse[]>>(`${this.baseUrl}/depot/search`, { params }).pipe(
            tap((response) => {
                if (this.handleApiResponse(response)) {
                    this.depots.set(response.data || []);
                    if (response.pagination) this.setPagination(response.pagination);
                }
            }),
            catchError(this.handleHttpError<ApiResponse<DepotResponse[]>>('Error al obtener los registros de depósitos')),
            finalize(() => this.loading.set(false))
        );
    }

    registerDepot(depotData: DepotData): Observable<ApiResponse<DepotResponse>> {
        this.loading.set(true);
        this.clearError();
        return this.http.post<ApiResponse<DepotResponse>>(`${this.baseUrl}/depot`, depotData).pipe(
            tap((response) => this.handleApiResponse(response)),
            catchError(this.handleHttpError<ApiResponse<DepotResponse>>('Error al registrar el depósito')),
            finalize(() => this.loading.set(false))
        );
    }

    updateDepot(id: string, depotData: DepotData): Observable<ApiResponse<DepotResponse>> {
        this.loading.set(true);
        this.clearError();
        return this.http.put<ApiResponse<DepotResponse>>(`${this.baseUrl}/depot/${id}`, depotData).pipe(
            tap((response) => this.handleApiResponse(response)),
            catchError(this.handleHttpError<ApiResponse<DepotResponse>>('Error al actualizar el depósito')),
            finalize(() => this.loading.set(false))
        );
    }
}
