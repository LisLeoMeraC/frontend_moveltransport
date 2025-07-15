import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ApiResponse, Pagination, RouteResponse } from '../models/routess';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { catchError, finalize, Observable, tap, throwError } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class RouteService {
    private readonly baseUrl = environment.apiUrl;
    private routes = signal<RouteResponse[]>([]);
    private loading = signal<boolean>(false);
    private error = signal<string | null>(null);

    private pagination = signal<Pagination>({
        currentPage: 1,
        pageSize: 5,
        totalPages: 1,
        totalRecords: 0
    });

    readonly routesList = this.routes.asReadonly();
    readonly isLoading = this.loading.asReadonly();
    readonly hasError = this.error.asReadonly();
    readonly paginationData = this.pagination.asReadonly();

    constructor(
        private http:HttpClient,
        private messageService: MessageService
    ) {}

    private setError(message: string) {
        this.error.set(message);
    }

    loadRoutes(page: number, limit: number): Observable<ApiResponse<RouteResponse[]>> {
        this.loading.set(true);
        this.error.set(null);
        let params = new HttpParams();
        return this.http.get<ApiResponse<RouteResponse[]>>(`${this.baseUrl}/route`, { params }).pipe(
            tap((response) => {
                if (this.handleApiResponse(response)) {
                    this.routes.set(response.data || []);

                    if (response.pagination) {
                        this.pagination.set(response.pagination);
                    }
                }
            }),
            catchError(this.handleHttpError<ApiResponse<RouteResponse[]>>('Error al cargar las rutas')),
            finalize(() => this.loading.set(false))
        );
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

    private formatErrorMessage(response: ApiResponse<any>): string {
        let message = 'Error inesperado';
        if (response.error) {
            message = response.error;
        } else if (response.message) {
            message = Array.isArray(response.message) ? response.message.join(', ') : response.message;
        }
        return this.translateFieldNames(message);
    }

    private handleHttpError<T>(contextMsg = 'Error'): (error: any) => Observable<T> {
        return (error: any) => {
            const message = this.getErrorMessage(error) || contextMsg;
            this.setError(message);
            this.loading.set(false);
            return throwError(() => error);
        };
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
}
