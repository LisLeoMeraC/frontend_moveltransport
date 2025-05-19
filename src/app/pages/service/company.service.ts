import { Injectable, signal } from '@angular/core';
import { Company, CompanyResponse, CompanyType, IdentificationType } from '../models/company';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CompanyService {

  private readonly baseUrl = environment.apiUrl;
  private companies = signal<Company[]>([]);
  private loading = signal<boolean>(false);
  private error = signal<string | null>(null);

  // Exponemos las señales como señales de solo lectura
  readonly companiesList = this.companies.asReadonly();
  readonly isLoading = this.loading.asReadonly();
  readonly hasError = this.error.asReadonly();

  constructor(private http: HttpClient) { }

  loadCompanies() {
    this.loading.set(true);
    this.error.set(null);

    this.http.get<CompanyResponse>(`${this.baseUrl}/Company`)
      .pipe(
        tap({
          next: (response) => {
            this.companies.set(response.data);
            this.loading.set(false);
          },
          error: (err) => {
            this.error.set(err.message || 'Error al cargar las compañías');
            this.loading.set(false);
          }
        })
      )
      .subscribe();
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
