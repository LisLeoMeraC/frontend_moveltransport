import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { catchError, finalize, Observable, tap, throwError } from 'rxjs';
import { CityResponse, ProvinceResponse, RouteData, RouteResponse } from '../models/routess.model';
import { ApiResponse, Pagination } from '../models/shared.model';
import { BaseHttpService } from './base-http.service';

@Injectable({
    providedIn: 'root'
})
export class RouteService extends BaseHttpService<RouteResponse> {
    private readonly baseUrl = environment.apiUrl;
    private routes = signal<RouteResponse[]>([]);
    readonly routesList = this.routes.asReadonly();
    private provinces = signal<ProvinceResponse[]>([]);
    readonly provinceList = this.provinces.asReadonly();

    private originCities = signal<CityResponse[]>([]);
    readonly originCityList = this.originCities.asReadonly();

    private destinationCities = signal<CityResponse[]>([]);
    readonly destinationCitiesList = this.destinationCities.asReadonly();

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

    loadProvinces(params?: { page?: number; limit?: number }): Observable<ApiResponse<ProvinceResponse[]>> {
        this.loading.set(false);
        this.clearError();
        let httpParams = new HttpParams();
        if (params?.page) httpParams = httpParams.set('page', params.page.toString());
        if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());

        return this.http.get<ApiResponse<ProvinceResponse[]>>(`${this.baseUrl}/province`, { params: httpParams }).pipe(
            tap((response) => {
                if (this.handleApiResponse(response)) {
                    this.provinces.set(response.data || []);
                    if (response.pagination) this.setPagination(response.pagination);
                }
            }),
            catchError(this.handleHttpError<ApiResponse<ProvinceResponse[]>>('Error al cargar provincias')),
            finalize(() => this.loading.set(false))
        );
    }

    loadCitiesForProvinceOrigin(provinceId: string, params?: { page?: number; limit?: number }): Observable<ApiResponse<CityResponse[]>> {
        this.loading.set(false);
        this.clearError();

        let httpParams = new HttpParams().set('provinceId', provinceId);
        if (params?.page) httpParams = httpParams.set('page', params.page.toString());
        if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());

        return this.http.get<ApiResponse<CityResponse[]>>(`${this.baseUrl}/city/by-province`, { params: httpParams }).pipe(
            tap((response) => {
                if (this.handleApiResponse(response)) {
                    this.originCities.set(response.data || []);
                    //if (response.pagination) this.setPagination(response.pagination);
                }
            }),
            catchError(this.handleHttpError<ApiResponse<CityResponse[]>>('Error al cargar ciudades')),
            finalize(() => this.loading.set(false))
        );
    }

    loadCitiesForProvinceDestination(provinceId: string, params?: { page?: number; limit?: number }): Observable<ApiResponse<CityResponse[]>> {
        this.loading.set(false);
        this.clearError();

        let httpParams = new HttpParams().set('provinceId', provinceId);
        if (params?.page) httpParams = httpParams.set('page', params.page.toString());
        if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());

        return this.http.get<ApiResponse<CityResponse[]>>(`${this.baseUrl}/city/by-province`, { params: httpParams }).pipe(
            tap((response) => {
                if (this.handleApiResponse(response)) {
                    this.destinationCities.set(response.data || []);
                    //if (response.pagination) this.setPagination(response.pagination);
                }
            }),
            catchError(this.handleHttpError<ApiResponse<CityResponse[]>>('Error al cargar ciudades')),
            finalize(() => this.loading.set(false))
        );
    }

    clearCitiesOrigin(): void {
        this.originCities.set([]);
    }

    clearCitiesDestination(): void {
        this.destinationCities.set([]);
    }
    registerRoute(routeData: RouteData): Observable<ApiResponse<RouteResponse>> {
        //this.loading.set(true);
        this.clearError();
        return this.http.post<ApiResponse<RouteResponse>>(`${this.baseUrl}/route`, routeData).pipe(
            tap((response) => this.handleApiResponse(response)),
            catchError(this.handleHttpError<ApiResponse<RouteResponse>>('Error al registrar ruta')),
            finalize(() => this.loading.set(false))
        );
    }

    updateRoute(id: string, routeData: RouteData): Observable<ApiResponse<RouteResponse>> {
        this.loading.set(true);
        this.clearError();
        return this.http.put<ApiResponse<RouteResponse>>(`${this.baseUrl}/route/${id}`, routeData).pipe(
            tap((response) => this.handleApiResponse(response)),
            catchError(this.handleHttpError<ApiResponse<RouteResponse>>('Error al actualizar ruta')),
            finalize(() => this.loading.set(false))
        );
    }
}
