import { Injectable, signal } from '@angular/core';
import { ApiResponse, CompanyData, CompanyResponse, CompanyType, IdentificationType, Pagination } from '../models/company';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { MessageService } from 'primeng/api';
@Injectable({
    providedIn: 'root'
})
export class CompanyService {
    private readonly baseUrl = environment.apiUrl;
    private companies = signal<CompanyResponse[]>([]);
    private loading = signal<boolean>(false);
    private error = signal<string | null>(null);

    private pagination = signal<Pagination>({
        currentPage: 1,
        pageSize: 5,
        totalPages: 1,
        totalRecords: 0
    });

    readonly companiesList = this.companies.asReadonly();
    readonly isLoading = this.loading.asReadonly();
    readonly hasError = this.error.asReadonly();
    readonly paginationData = this.pagination.asReadonly();

    constructor(
        private http: HttpClient,
        private messageService: MessageService
    ) {}

    //metodo para registrar compañia
    registerCompany(companyData: CompanyData): Observable<ApiResponse<CompanyResponse>> {
        this.loading.set(true);
        this.error.set(null);
        return this.http.post<ApiResponse<CompanyResponse>>(`${this.baseUrl}/company`, companyData).pipe(
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

    //metodo para eliminar compañia
    deleteCompany(id: string): Observable<ApiResponse<any>> {
        this.loading.set(true);
        this.error.set(null);

        return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/company/${id}`).pipe(
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

    //metodo para cargar compañias

    loadCompanies(status: boolean, page: number = 1, limit: number = 5, type?: string): Observable<ApiResponse<CompanyResponse[]>> {
        this.loading.set(status);
        this.error.set(null);

        let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());

        if (type) {
            params = params.set('type', type);
        }

        return this.http.get<ApiResponse<CompanyResponse[]>>(`${this.baseUrl}/company/enabled`, { params }).pipe(
            tap({
                next: (response) => {
                    if (response.statusCode >= 200 && response.statusCode < 300) {
                        this.companies.set(response.data || []);
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

    //metodo para editar compañia
    updateCompany(id: string, companyData: CompanyData): Observable<ApiResponse<CompanyResponse>> {
        this.loading.set(true);
        this.error.set(null);

        return this.http.put<ApiResponse<CompanyResponse>>(`${this.baseUrl}/company/${id}`, companyData).pipe(
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

    searchCompanies(term: string, page: number = 1, limit: number = 10, type?: string): Observable<ApiResponse<CompanyResponse[]>> {
        this.loading.set(true);
        this.error.set(null);

        let params = new HttpParams().set('term', term).set('page', page.toString()).set('limit', limit.toString());

        if (type) {
            params = params.set('type', type);
        }

        return this.http.get<ApiResponse<CompanyResponse[]>>(`${this.baseUrl}/company/search`, { params }).pipe(
            tap({
                next: (response) => {
                    if (response.statusCode >= 200 && response.statusCode < 300) {
                        this.companies.set(response.data || []);
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

    searchByIdentification(identification: string): Observable<ApiResponse<any>> {
        return this.http.get<ApiResponse<any>>(`${this.baseUrl}/company/identification/${identification}`).pipe(
            tap({
                next: (response) => {
                    if (response.statusCode !== 200) {
                        const errorMessage = this.formatErrorMessage(response);
                        this.error.set(errorMessage);
                    }
                    this.loading.set(false);
                },
                error: (err) => {
                    const errorMessage = this.getErrorMessage(err);
                    this.error.set(errorMessage);
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

        return 'Error al cargar las compañías';
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
}
