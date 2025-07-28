import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { catchError, finalize, Observable, tap, throwError } from 'rxjs';
import { CityResponse, ClientRateResponse, CreateRouteData, ProvinceResponse, RateClientData, RouteResponse, UpdateRouteData } from '../models/routess.model';
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

    private destinationCitiesPage = 1;
    private destinationCitiesPageSize = 10;
    private isScrolling = signal(false);

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
        // this.loading.set(true);
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
        // this.loading.set(true);
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
        //this.loading.set(true);
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
    registerRoute(routeData: CreateRouteData): Observable<ApiResponse<RouteResponse>> {
        this.clearError();
        this.loading.set(true);
        return this.http.post<ApiResponse<RouteResponse>>(`${this.baseUrl}/route`, routeData).pipe(
            tap((response) => this.handleApiResponse(response)),
            catchError(this.handleHttpError<ApiResponse<RouteResponse>>('Error al registrar ruta')),
            finalize(() => this.loading.set(false))
        );
    }

    updateRoute(id: string, routeData: UpdateRouteData): Observable<ApiResponse<RouteResponse>> {
        this.loading.set(true);
        this.clearError();
        return this.http.put<ApiResponse<RouteResponse>>(`${this.baseUrl}/route/${id}`, routeData).pipe(
            tap((response) => this.handleApiResponse(response)),
            catchError(this.handleHttpError<ApiResponse<RouteResponse>>('Error al actualizar ruta')),
            finalize(() => this.loading.set(false))
        );
    }

    searchRoute(page: number = 1, limit: number = 10, origin?: string, destination?: string): Observable<ApiResponse<RouteResponse[]>> {
        this.loading.set(true);
        this.clearError();

        let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());
        if (origin !== undefined) {
            params = params.set('origin', origin);
        }
        if (destination !== undefined) {
            params = params.set('destination', destination);
        }

        return this.http.get<ApiResponse<RouteResponse[]>>(`${this.baseUrl}/route/search`, { params }).pipe(
            tap((response) => {
                if (this.handleApiResponse(response)) {
                    this.routes.set(response.data || []);
                    if (response.pagination) this.setPagination(response.pagination);
                }
            }),
            catchError(this.handleHttpError<ApiResponse<RouteResponse[]>>('Error al buscar rutas')),
            finalize(() => this.loading.set(false))
        );
    }

    getRoutesClientRates(page: number = 1, limit: number = 10, origin?: string, destination?: string, companyId: string = ''): Observable<ApiResponse<RouteResponse[]>> {
        this.loading.set(true);
        this.clearError();

        let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString()).set('companyId', companyId);
        if (origin) {
            params = params.set('origin', origin);
        }
        if (destination) {
            params = params.set('destination', destination);
        }

        return this.http.get<ApiResponse<RouteResponse[]>>(`${this.baseUrl}/route-client-rate/filter-by-cities`, { params }).pipe(
            tap((response) => {
                if (this.handleApiResponse(response)) {
                    this.routes.set(response.data || []);
                    if (response.pagination) this.setPagination(response.pagination);
                }
            }),
            catchError(this.handleHttpError<ApiResponse<RouteResponse[]>>('Error al obtener tarifas de cliente')),
            finalize(() => this.loading.set(false))
        );
    }
    resetRoutes() {
        this.routes.set([]); // Modificamos la señal privada
    }

    deleteRouteClientRate(id: string): Observable<ApiResponse<RouteResponse>> {
        this.loading.set(true);
        this.clearError();

        return this.http.delete<ApiResponse<RouteResponse>>(`${this.baseUrl}/route-client-rate/${id}`).pipe(
            tap((response) => {
                if (this.handleApiResponse(response, 'Error al eliminar tarifa de cliente')) {
                    const updatedRoutes = this.routes().filter((route) => route.id !== id);
                    this.routes.set(updatedRoutes);
                }
            }),
            catchError(this.handleHttpError<ApiResponse<RouteResponse>>('Error al eliminar tarifa de cliente')),
            finalize(() => this.loading.set(false))
        );
    }

    //Verificar si existe una rurta
    findRouteByCities(originId: string, destinationId: string): Observable<ApiResponse<RouteResponse>> {
        // this.loading.set(true);
        this.clearError();

        const params = new HttpParams().set('originId', originId).set('destinationId', destinationId);

        return this.http.get<ApiResponse<RouteResponse>>(`${this.baseUrl}/route/find-by-cities`, { params }).pipe(
            tap((response) => this.handleApiResponse(response)),
            catchError(this.handleHttpError<ApiResponse<RouteResponse>>('Error al buscar ruta')),
            finalize(() => this.loading.set(false))
        );
    }

    //registrar nueva tarifa
    registerRouteClientRate(rateClient: RateClientData): Observable<ApiResponse<ClientRateResponse>> {
        this.clearError();
        this.loading.set(true);
        return this.http.post<ApiResponse<ClientRateResponse>>(`${this.baseUrl}/route-client-rate`, rateClient).pipe(
            tap((response) => this.handleApiResponse(response)),
            catchError(this.handleHttpError<ApiResponse<ClientRateResponse>>('Error al registrar tarifa de cliente')),
            finalize(() => this.loading.set(false))
        )
    }
}
