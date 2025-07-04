import { Injectable, signal } from '@angular/core';
import { ApiResponse, CompanyData, CompanyResponse, CompanyType, IdentificationType, Pagination } from '../models/company';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, finalize, Observable, tap, throwError } from 'rxjs';
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

    private setError(message: string) {
        this.error.set(message);
    }

    private handleHttpError<T>(contextMsg = 'Error'): (error: any) => Observable<T> {
        return (error: any) => {
            const message = this.getErrorMessage(error) || contextMsg;
            this.setError(message);
            this.loading.set(false);
            return throwError(() => error);
        };
    }

    private handleApiResponse<T>(response: ApiResponse<T>, fallbackError: string = 'Error'): boolean {
        if (response.statusCode < 200 || response.statusCode >= 300) {
            const message = this.formatErrorMessage(response) || fallbackError;
            this.setError(message);
            this.loading.set(false);
            return false;
        }
        return true;
    }

    registerCompany(companyData: CompanyData): Observable<ApiResponse<CompanyResponse>> {
        this.loading.set(true);
        this.error.set(null);

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

        // No necesitamos enviar body ya que la API solo requiere el ID en la URL
        return this.http.put<ApiResponse<CompanyResponse>>(`${this.baseUrl}/company/disable/${id}`, null).pipe(
            tap((response) => {
                if (this.handleApiResponse(response, 'Error al deshabilitar compañía')) {
                    // Opcional: Actualizar la lista local si es necesario
                    const updatedCompanies = this.companies().filter((company) => company.id !== id);
                    this.companies.set(updatedCompanies);
                }
            }),
            catchError(this.handleHttpError<ApiResponse<CompanyResponse>>('Error al deshabilitar compañía')),
            finalize(() => this.loading.set(false))
        );
    }

    deleteCompany(id: string): Observable<ApiResponse<any>> {
        this.loading.set(true);
        this.error.set(null);

        return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/company/${id}`).pipe(
            tap((response) => this.handleApiResponse(response)),
            catchError(this.handleHttpError<ApiResponse<any>>('Error al eliminar compañía')),
            finalize(() => this.loading.set(false))
        );
    }

    loadCompanies(options: { status: boolean; page?: number; limit?: number; type?: string }): Observable<ApiResponse<CompanyResponse[]>> {
        const { status, page, limit, type } = options;

        this.loading.set(status);
        this.error.set(null);

        let params = new HttpParams();

        // Si se especifica paginación, se añade
        if (page && limit) {
            params = params.set('page', page.toString()).set('limit', limit.toString());
        }

        // Si se especifica el tipo, se añade
        if (type) {
            params = params.set('type', type);
        }

        return this.http.get<ApiResponse<CompanyResponse[]>>(`${this.baseUrl}/company/enabled`, { params }).pipe(
            tap((response) => {
                if (this.handleApiResponse(response)) {
                    this.companies.set(response.data || []);

                    if (response.pagination) {
                        this.pagination.set(response.pagination);
                    }
                }
            }),
            catchError(this.handleHttpError<ApiResponse<CompanyResponse[]>>('Error al cargar compañías')),
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

    searchByIdentification(identification: string): Observable<ApiResponse<any>> {
        this.loading.set(true);
        this.error.set(null);

        return this.http.get<ApiResponse<any>>(`${this.baseUrl}/company/identification/${identification}`).pipe(
            tap((response) => this.handleApiResponse(response)),
            catchError(this.handleHttpError<ApiResponse<any>>('Error al buscar identificación')),
            finalize(() => this.loading.set(false))
        );
    }

    private formatErrorMessage(response: ApiResponse<any>): string {
        let message = 'Error inesperado';
        if (response.error) {
            message = response.error;
        } else if (response.message) {
            message = Array.isArray(response.message) ? response.message.join(', ') : response.message;
        }
        return this.translateFieldNames(message);
    }

    private getErrorMessage(error: any): string {
        let message = 'Error desconocido';
        if (error.error) {
            if (error.error.message) {
                message = Array.isArray(error.error.message) ? error.error.message.join(', ') : error.error.message;
            } else {
                message = error.error.error || error.message || message;
            }
        } else {
            message = error.message || 'Error al conectar con el servidor';
        }
        return this.translateFieldNames(message);
    }

    public translateFieldNames(message: string): string {
        const fieldTranslations: { [key: string]: string } = {
            name: 'Nombre',
            address: 'Dirección',
            email: 'Correo electrónico',
            phone: 'Teléfono',
            identificationType: 'Tipo de identificación',
            identification: 'Identificación',
            type: 'Tipo de compañía',
            status: 'Estado'
        };

        Object.keys(fieldTranslations).forEach((key) => {
            const regex = new RegExp(`\\b${key}\\b`, 'gi');
            message = message.replace(regex, fieldTranslations[key]);
        });

        return message;
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
