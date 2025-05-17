import { Injectable } from '@angular/core';
import { CompanyType, IdentificationType } from '../models/company';

@Injectable({
  providedIn: 'root'
})
export class CompanyService {

  constructor() { }


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
