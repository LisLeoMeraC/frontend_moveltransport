import { Injectable, signal } from '@angular/core';
import { BaseHttpService } from './base-http.service';
import { FreightData, FreightResponse } from '../models/freight.model';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { catchError, finalize, Observable, tap } from 'rxjs';
import { ApiResponse, FreightType, FreightStatus, CargaUnitType, CargaCondition } from '../models/shared.model';

@Injectable({
    providedIn: 'root'
})
export class FreightService extends BaseHttpService<FreightResponse> {
    private readonly baseUrl = environment.apiUrl;
    private freights = signal<FreightResponse[]>([]);
    readonly freightsList = this.freights.asReadonly();
    private freight = signal<FreightResponse | null>(null);
    readonly freightItem = this.freight.asReadonly();

    constructor(
        private http: HttpClient,
        private messageService: MessageService
    ) {
        super();
    }

    loadFreights(filters?: {
        page?: number;
        limit?: number;
        clientId?: string;
        serialReference?: string;
        startDate?: string;
        endDate?: string;
        freightStatus?: string;
        freightType?: string;
        originCity?: string;
        destinationCity?: string;
    }): Observable<ApiResponse<FreightResponse[]>> {
        this.loading.set(true);
        this.clearError();

        const filterBody = {
            page: filters?.page || 1,
            limit: filters?.limit || 10,
            clientId: filters?.clientId,
            serialReference: filters?.serialReference,
            startDate: filters?.startDate,
            endDate: filters?.endDate,
            freightStatus: filters?.freightStatus,
            freightType: filters?.freightType,
            originCity: filters?.originCity,
            destinationCity: filters?.destinationCity
        };

        return this.http.post<ApiResponse<FreightResponse[]>>(`${this.baseUrl}/freight/filter`, filterBody).pipe(
            tap((response) => {
                if (this.handleApiResponse(response)) {
                    this.freights.set(response.data || []);
                    if (response.pagination) this.setPagination(response.pagination);
                }
            }),
            catchError(this.handleHttpError<ApiResponse<FreightResponse[]>>('Error al cargar fletes')),
            finalize(() => this.loading.set(false))
        );
    }

    getFreightById(id: string): Observable<ApiResponse<FreightResponse>> {
        this.loading.set(true);
        this.clearError();
        return this.http.get<ApiResponse<FreightResponse>>(`${this.baseUrl}/freight/${id}`).pipe(
            tap((response) => {
                if (this.handleApiResponse(response)) {
                    this.freight.set(response.data || null);
                }
            }),
            catchError(this.handleHttpError<ApiResponse<FreightResponse>>('Error al cargar el flete')),
            finalize(() => this.loading.set(false))
        );
    }

    registerFreight(freightData: FreightData): Observable<ApiResponse<FreightResponse>> {
        this.loading.set(true);
        this.clearError();
        return this.http.post<ApiResponse<FreightResponse>>(`${this.baseUrl}/freight`, freightData).pipe(
            tap((response) => this.handleApiResponse(response)),
            catchError(this.handleHttpError<ApiResponse<FreightResponse>>('Error al registrar el flete')),
            finalize(() => this.loading.set(false))
        );
    }

    updateFreight(id: string, freightData: Partial<FreightData>): Observable<ApiResponse<FreightResponse>> {
        this.loading.set(true);
        this.clearError();
        return this.http.put<ApiResponse<FreightResponse>>(`${this.baseUrl}/freight/${id}`, freightData).pipe(
            tap((response) => this.handleApiResponse(response)),
            catchError(this.handleHttpError<ApiResponse<FreightResponse>>('Error al actualizar el flete')),
            finalize(() => this.loading.set(false))
        );
    }

    getFreightTypes(): { label: string; value: FreightType }[] {
        return [
            { label: 'Exportación', value: FreightType.EXPORT },
            { label: 'Importación', value: FreightType.IMPORT },
            { label: 'Interno', value: FreightType.INTERNAL },
            { label: 'Rescate', value: FreightType.RESCUE }
        ];
    }

    getFreightStatuses(): { label: string; value: FreightStatus }[] {
        return [
            { label: 'Pendiente', value: FreightStatus.PENDING },
            { label: 'En Tránsito', value: FreightStatus.IN_TRANSIT },
            { label: 'Retrasado', value: FreightStatus.DELAYED },
            { label: 'Completado', value: FreightStatus.COMPLETED },
            { label: 'Cancelado', value: FreightStatus.CANCELED }
        ];
    }

    getCargoUnitTypes(): { label: string; value: CargaUnitType }[] {
        return [
            { label: 'Contenedor 20 pies', value: CargaUnitType.STANDARD_20 },
            { label: 'Contenedor 40 pies', value: CargaUnitType.STANDARD_40 },
            { label: 'Contenedor 40 pies HC', value: CargaUnitType.HIGH_CUBE_40 },
            { label: 'Volquete', value: CargaUnitType.DUMP },
            { label: 'Plataforma', value: CargaUnitType.FLATBED },
            { label: 'Tanque', value: CargaUnitType.TANK },
            { label: 'Furgón Seco', value: CargaUnitType.DRY_VAN }
        ];
    }

    getCargoConditions(): { label: string; value: CargaCondition }[] {
        return [
            { label: 'Seco', value: CargaCondition.dry },
            { label: 'Refrigerado', value: CargaCondition.refrigerated },
            { label: 'Peligroso', value: CargaCondition.hazardous }
        ];
    }
}
