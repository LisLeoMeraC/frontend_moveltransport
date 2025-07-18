import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { VehicleData, VehicleResponse } from '../models/vehicle.model';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, finalize, Observable, tap, throwError } from 'rxjs';
import { ApiResponse } from '../models/shared.model';
import { BaseHttpService } from './base-http.service';

@Injectable({
    providedIn: 'root'
})
export class VehicleService extends BaseHttpService<VehicleResponse> {
    private readonly baseUrl = environment.apiUrl;
    private vehicles = signal<VehicleResponse[]>([]);
    readonly vehiclesList = this.vehicles.asReadonly();

    constructor(private http: HttpClient) {
        super();
    }

    loadVehicles(page: number = 1, limit: number = 5): Observable<ApiResponse<VehicleResponse[]>> {
        this.loading.set(true);
        this.clearError();

        let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString()).set('includeCompany', 'true').set('includeDriver', 'true').set('includeOwner', 'true');

        return this.http.get<ApiResponse<VehicleResponse[]>>(`${this.baseUrl}/vehicle/enabled`, { params }).pipe(
            tap((response) => {
                if (this.handleApiResponse(response)) {
                    this.vehicles.set(response.data || []);
                    if (response.pagination) this.setPagination(response.pagination);
                }
            }),
            catchError(this.handleHttpError<ApiResponse<VehicleResponse[]>>('Error al cargar vehículos')),
            finalize(() => this.loading.set(false))
        );
    }

    registerVehicle(VehicleData: VehicleData): Observable<ApiResponse<VehicleResponse>> {
        this.loading.set(true);
        this.clearError();

        return this.http.post<ApiResponse<VehicleResponse>>(`${this.baseUrl}/vehicle`, VehicleData).pipe(
            tap((response) => this.handleApiResponse(response)),
            catchError(this.handleHttpError<ApiResponse<VehicleResponse>>('Error al registrar vehículo')),
            finalize(() => this.loading.set(false))
        );
    }

    updateVehicle(id: string, vehicleData: VehicleData): Observable<ApiResponse<VehicleResponse>> {
        this.loading.set(true);
        this.clearError();
        return this.http.put<ApiResponse<VehicleResponse>>(`${this.baseUrl}/vehicle/${id}`, vehicleData).pipe(
            tap((response) => this.handleApiResponse(response)),
            catchError(this.handleHttpError<ApiResponse<VehicleResponse>>('Error al actualizar vehículo')),
            finalize(() => this.loading.set(false))
        );
    }

    searchVehicles(query: string, page: number = 1, limit: number = 5): Observable<ApiResponse<VehicleResponse[]>> {
        this.loading.set(true);
        this.clearError();

        let params = new HttpParams().set('plate', query).set('page', page.toString()).set('limit', limit.toString());

        return this.http.get<ApiResponse<VehicleResponse[]>>(`${this.baseUrl}/vehicle/search`, { params }).pipe(
            tap((response) => {
                if (this.handleApiResponse(response)) {
                    this.vehicles.set(response.data || []);
                    if (response.pagination) this.setPagination(response.pagination);
                }
            }),
            catchError(this.handleHttpError<ApiResponse<VehicleResponse[]>>('Error al buscar vehículos')),
            finalize(() => this.loading.set(false))
        );
    }

    deleteVehicle(id: string): Observable<ApiResponse<VehicleResponse>> {
        this.loading.set(true);
        this.clearError();
        return this.http.delete<ApiResponse<VehicleResponse>>(`${this.baseUrl}/vehicle/${id}`).pipe(
            tap((response) => {
                if (this.handleApiResponse(response, 'Error al eliminar vehículo')) {
                    this.vehicles.update((vehicles) => vehicles.filter((vehicle) => vehicle.id !== id));
                }
            }),
            catchError(this.handleHttpError<ApiResponse<VehicleResponse>>('Error al eliminar vehículo')),
            finalize(() => this.loading.set(false))
        );
    }

    updateVehicleOwner(vehicleId: string, ownerId: string): Observable<ApiResponse<VehicleResponse>> {
        this.loading.set(true);
        this.clearError();

        const params = new HttpParams().set('vehicleId', vehicleId).set('ownerId', ownerId);

        return this.http.put<ApiResponse<VehicleResponse>>(`${this.baseUrl}/vehicle/update-ownership`, null, { params }).pipe(
            tap((response) => {
                if (this.handleApiResponse(response, 'Error al actualizar propietario del vehículo')) {
                    const updatedVehicles = this.vehicles().map((vehicle) => (vehicle.id === vehicleId ? { ...vehicle, ownerId } : vehicle));
                    this.vehicles.set(updatedVehicles);
                }
            }),
            catchError(this.handleHttpError<ApiResponse<VehicleResponse>>('Error al actualizar propietario del vehículo')),
            finalize(() => this.loading.set(false))
        );
    }
}
