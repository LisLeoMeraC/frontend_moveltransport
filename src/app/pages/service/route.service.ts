import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { catchError, finalize, Observable, tap, throwError } from 'rxjs';
import { RouteResponse } from '../models/routess.model';
import { ApiResponse, Pagination } from '../models/shared.model';
import { BaseHttpService } from './base-http.service';

@Injectable({
    providedIn: 'root'
})
export class RouteService extends BaseHttpService<RouteResponse> {
    private readonly baseUrl = environment.apiUrl;
    private routes = signal<RouteResponse[]>([]);
    readonly routesList = this.routes.asReadonly();

    constructor(
        private http: HttpClient,
        private messageService: MessageService
    ) {
        super();
    }

    loadRoutes(page: number, limit: number): Observable<ApiResponse<RouteResponse[]>> {
        this.loading.set(true);
        this.clearError;
        let params = new HttpParams();
        if (page) params = params.set('page', page.toString());
        if (limit) params = params.set('limit', limit.toString());

        return this.http.get<ApiResponse<RouteResponse[]>>(`${this.baseUrl}/route`, { params }).pipe(
            tap((response) => {
                if (this.handleApiResponse(response)) {
                    this.routes.set(response.data || []);
                    if (response.pagination) this.setPagination(response.pagination);
                }
            }),
            catchError(this.handleHttpError<ApiResponse<RouteResponse[]>>('Error al cargar rutas')),
            finalize(() => this.loading.set(false))
        );
    }
}
