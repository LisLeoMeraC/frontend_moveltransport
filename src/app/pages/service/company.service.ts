import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, finalize, Observable, tap, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';
import { CompanyResponse, CompanyData, CompanySearchByIdentificationResponse } from '../models/company.model';
import { IdentificationType, CompanyType, Pagination, ApiResponse } from '../models/shared.model';
import { BaseHttpService } from './base-http.service';
@Injectable({
    providedIn: 'root'
})
export class CompanyService extends BaseHttpService<CompanyResponse> {
    private readonly baseUrl = environment.apiUrl;
    private companies = signal<CompanyResponse[]>([]);
    readonly companiesList = this.companies.asReadonly();

    constructor(
        private http: HttpClient,
        private messageService: MessageService
    ) {
        super();
    }

    loadCompanies(params: { status: boolean; page?: number; limit?: number; type?: string }): Observable<ApiResponse<CompanyResponse[]>> {
        const { status, ...restParams } = params;
        this.loading.set(status);
        this.clearError();

        let httpParams = new HttpParams();
        if (params.page) httpParams = httpParams.set('page', params.page.toString());
        if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
        if (params.type) httpParams = httpParams.set('type', params.type);

        return this.http.get<ApiResponse<CompanyResponse[]>>(`${this.baseUrl}/company/enabled`, { params: httpParams }).pipe(
            tap((response) => {
                if (this.handleApiResponse(response)) {
                    this.companies.set(response.data || []);
                    if (response.pagination) this.setPagination(response.pagination);
                }
            }),
            catchError(this.handleHttpError<ApiResponse<CompanyResponse[]>>('Error al cargar compañías')),
            finalize(() => this.loading.set(false))
        );
    }

    registerCompany(companyData: CompanyData): Observable<ApiResponse<CompanyResponse>> {
        this.loading.set(true);
        this.clearError();

        return this.http.post<ApiResponse<CompanyResponse>>(`${this.baseUrl}/company`, companyData).pipe(
            tap((response) => this.handleApiResponse(response)),
            catchError(this.handleHttpError<ApiResponse<CompanyResponse>>('Error al registrar compañía')),
            finalize(() => this.loading.set(false))
        );
    }

    updateCompany(id: string, companyData: CompanyData): Observable<ApiResponse<CompanyResponse>> {
        this.loading.set(true);
        this.error.set(null);

        return this.http.put<ApiResponse<CompanyResponse>>(`${this.baseUrl}/company/${id}`, companyData).pipe(
            tap((response) => this.handleApiResponse(response)),
            catchError(this.handleHttpError<ApiResponse<CompanyResponse>>('Error al actualizar compañía')),
            finalize(() => this.loading.set(false))
        );
    }

    disableCompany(id: string): Observable<ApiResponse<CompanyResponse>> {
        this.loading.set(true);
        this.error.set(null);
        return this.http.put<ApiResponse<CompanyResponse>>(`${this.baseUrl}/company/disable/${id}`, null).pipe(
            tap((response) => {
                if (this.handleApiResponse(response, 'Error al deshabilitar compañía')) {
                    const updatedCompanies = this.companies().filter((company) => company.id !== id);
                    this.companies.set(updatedCompanies);
                }
            }),
            catchError(this.handleHttpError<ApiResponse<CompanyResponse>>('Error al deshabilitar compañía')),
            finalize(() => this.loading.set(false))
        );
    }

    deleteCompany(id: string): Observable<ApiResponse<CompanyResponse>> {
        this.loading.set(true);
        this.error.set(null);

        return this.http.delete<ApiResponse<CompanyResponse>>(`${this.baseUrl}/company/${id}`).pipe(
            tap((response) => this.handleApiResponse(response)),
            catchError(this.handleHttpError<ApiResponse<any>>('Error al eliminar compañía')),
            finalize(() => this.loading.set(false))
        );
    }

    searchCompanies(term: string, page: number = 1, limit: number = 10, type?: string): Observable<ApiResponse<CompanyResponse[]>> {
        this.loading.set(true);
        this.error.set(null);

        let params = new HttpParams().set('term', term).set('page', page.toString()).set('limit', limit.toString());
        if (type) {
            params = params.set('type', type);
        }

        return this.http.get<ApiResponse<CompanyResponse[]>>(`${this.baseUrl}/company/search`, { params }).pipe(
            tap((response) => {
                if (this.handleApiResponse(response)) {
                    this.companies.set(response.data || []);
                    if (response.pagination) {
                        this.pagination.set(response.pagination);
                    }
                }
            }),
            catchError(this.handleHttpError<ApiResponse<CompanyResponse[]>>('Error al buscar compañías')),
            finalize(() => this.loading.set(false))
        );
    }

    searchByIdentification(identification: string): Observable<ApiResponse<CompanySearchByIdentificationResponse>> {
        this.loading.set(true);
        this.error.set(null);

        return this.http.get<ApiResponse<CompanySearchByIdentificationResponse>>(`${this.baseUrl}/company/identification/${identification}`).pipe(
            tap((response) => this.handleApiResponse(response)),
            catchError(this.handleHttpError<ApiResponse<any>>('Error al buscar identificación')),
            finalize(() => this.loading.set(false))
        );
    }

    getIdentificationTypes(): { label: string; value: IdentificationType }[] {
        return [
            { label: 'RUC', value: IdentificationType.ruc },
            { label: 'DNI', value: IdentificationType.dni },
            { label: 'Pasaporte', value: IdentificationType.passport },
            { label: 'Otro', value: IdentificationType.other }
        ];
    }

    getCompanyTypes(): { label: string; value: CompanyType }[] {
        return [
            { label: 'Cliente', value: CompanyType.client },
            { label: 'Transportista', value: CompanyType.carrier },
            { label: 'Ambos', value: CompanyType.both }
        ];
    }

    enableCompany(id: string): Observable<ApiResponse<CompanyResponse>> {
        this.loading.set(true);
        this.error.set(null);

        return this.http.put<ApiResponse<CompanyResponse>>(`${this.baseUrl}/company/enable/${id}`, null).pipe(
            tap((response) => this.handleApiResponse(response, 'Error al habilitar compañía')),
            catchError(this.handleHttpError<ApiResponse<CompanyResponse>>('Error al habilitar compañía')),
            finalize(() => this.loading.set(false))
        );
    }
}
