import { Injectable, signal } from '@angular/core';
import { BaseHttpService } from './base-http.service';
import { FreightResponse } from '../models/freight.model';
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

    constructor(
        private http: HttpClient,
        private messageService: MessageService
    ) {
        super();
    }

    loadFreights(params?: { page?: number; limit?: number }): Observable<ApiResponse<FreightResponse[]>> {
        this.loading.set(true);
        this.clearError();

        let httpParams = new HttpParams();
        if (params?.page) httpParams = httpParams.set('page', params.page.toString());
        if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());

        return this.http.get<ApiResponse<FreightResponse[]>>(`${this.baseUrl}/freight`, { params: httpParams }).pipe(
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
