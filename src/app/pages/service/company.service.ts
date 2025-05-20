import { Injectable, signal } from '@angular/core';
import { ApiResponse, CompanyResponse, CompanyType, IdentificationType } from '../models/company';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { MessageService } from './message.service';

@Injectable({
  providedIn: 'root'
})
export class CompanyService {

  private readonly baseUrl = environment.apiUrl;
  private companies = signal<CompanyResponse[]>([]);
  private loading = signal<boolean>(false);
  private error = signal<string | null>(null);

  // Exponemos las señales como señales de solo lectura
  readonly companiesList = this.companies.asReadonly();
  readonly isLoading = this.loading.asReadonly();
  readonly hasError = this.error.asReadonly();

  constructor(private http: HttpClient, private messageService: MessageService) { }

  loadCompanies(): void {
    this.loading.set(true);
    this.error.set(null);

    this.http.get<ApiResponse<CompanyResponse[]>>(`${this.baseUrl}/company/enabled`)
      .pipe(
        tap({
          next: (response) => {
            if (response.statusCode >= 200 && response.statusCode < 300) {
              // Éxito: actualiza datos sin mostrar mensaje
              this.companies.set(response.data || []);
            } else {
              // Error: muestra mensaje
              const errorMessage = this.formatErrorMessage(response);
              this.error.set(errorMessage);
              this.messageService.showError(errorMessage);
            }
            this.loading.set(false);
          },
          error: (err) => {
            // Error de conexión/red
            const errorMessage = this.getErrorMessage(err);
            this.error.set(errorMessage);
            this.messageService.showError(errorMessage);
            this.loading.set(false);
          }
        })
      )
      .subscribe();
  }



  registerCompany(companyData: {
    identification: string;
    identificationType: IdentificationType;
    name: string;
    address: string;
    email?: string;
    phone: string;
    type: CompanyType;
  }): Observable<ApiResponse<CompanyResponse>> {
    this.loading.set(true);
    this.error.set(null);

    return this.http.post<ApiResponse<CompanyResponse>>(`${this.baseUrl}/company`, companyData)
      .pipe(
        tap({
          next: (response) => {
            if (response.statusCode >= 200 && response.statusCode < 300) {
              // Actualiza la lista de compañías después de registrar una nueva
              this.loadCompanies();
            } else {
              const errorMessage = this.formatErrorMessage(response);
              this.error.set(errorMessage);
              this.messageService.showError(errorMessage);
            }
            this.loading.set(false);
          },
          error: (err) => {
            const errorMessage = this.getErrorMessage(err);
            this.error.set(errorMessage);
            this.messageService.showError(errorMessage);
            this.loading.set(false);
          }
        })
      );
  }




  private formatErrorMessage(response: ApiResponse<any>): string {
    // Maneja mensajes de error del backend
    if (response.error) {
      return response.error;
    }

    if (response.message) {
      return Array.isArray(response.message)
        ? response.message.join(', ')
        : response.message;
    }

    return 'Error al cargar las compañías';
  }

  private getErrorMessage(error: any): string {
    if (error.error) {
      // Error del backend con estructura ApiResponse
      if (error.error.message) {
        return Array.isArray(error.error.message)
          ? error.error.message.join(', ')
          : error.error.message;
      }
      return error.error.error || error.message || 'Error desconocido';
    }
    return error.message || 'Error al conectar con el servidor';
  }



  getIdentificationTypes(): { label: string, value: IdentificationType }[] {
    return [
      { label: 'RUC', value: IdentificationType.ruc },
      { label: 'DNI', value: IdentificationType.dni },
      { label: 'Pasaporte', value: IdentificationType.passport },
      { label: 'Otro', value: IdentificationType.other }
    ];
  }

  getCompanyTypes(): { label: string, value: CompanyType }[] {
    return [
      { label: 'Cliente', value: CompanyType.client },
      { label: 'Transportista', value: CompanyType.carrier }
    ];
  }
}
