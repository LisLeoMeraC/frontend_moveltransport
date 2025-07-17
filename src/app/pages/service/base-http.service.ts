import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { Pagination, ApiResponse } from '../models/shared.model';

@Injectable({
    providedIn: 'root'
})
export abstract class BaseHttpService<T> {
    protected loading = signal<boolean>(false);
    protected error = signal<string | null>(null);
    protected pagination = signal<Pagination>({
        currentPage: 1,
        pageSize: 5,
        totalPages: 1,
        totalRecords: 0
    });

    readonly isLoading = this.loading.asReadonly();
    readonly hasError = this.error.asReadonly();
    readonly paginationData = this.pagination.asReadonly();

    protected setError(message: string) {
        this.error.set(message);
    }

    protected clearError() {
        this.error.set(null);
    }

    protected setPagination(pagination: Pagination) {
        this.pagination.set(pagination);
    }

    protected handleApiResponse(response: ApiResponse<any>, fallbackError: string = 'Error'): boolean {
        if (response.statusCode < 200 || response.statusCode >= 300) {
            const message = this.formatErrorMessage(response) || fallbackError;
            this.setError(message);
            this.loading.set(false);
            return false;
        }
        return true;
    }

    protected handleHttpError<U>(contextMsg = 'Error'): (error: HttpErrorResponse) => Observable<U> {
        return (error: HttpErrorResponse) => {
            const message = this.getErrorMessage(error) || contextMsg;
            this.setError(message);
            this.loading.set(false);
            return throwError(() => error);
        };
    }

    protected formatErrorMessage(response: ApiResponse<any>): string {
        let message = 'Error inesperado';
        if (response.error) {
            message = response.error;
        } else if (response.message) {
            message = Array.isArray(response.message) ? response.message.join(', ') : response.message;
        }
        return this.translateFieldNames(message);
    }

    protected getErrorMessage(error: any): string {
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

    translateFieldNames(message: string): string {
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
