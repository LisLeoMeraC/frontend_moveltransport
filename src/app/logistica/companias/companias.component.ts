import { CommonModule } from '@angular/common';
import { Component, effect, inject, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { Dropdown, DropdownModule } from 'primeng/dropdown';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { Table, TableModule } from 'primeng/table';
import { Toolbar, ToolbarModule } from 'primeng/toolbar';
import { CompanyService } from '../../pages/service/company.service';
import { MessageService } from 'primeng/api';
import { IdentificationType } from '../../pages/models/company';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-companias',
  standalone: true,
  imports: [CommonModule, ToolbarModule, TableModule, InputTextModule, IconFieldModule, InputIconModule, ButtonModule, ReactiveFormsModule,
    DialogModule, DropdownModule, DropdownModule, ToastModule],
  templateUrl: './companias.component.html',
  styleUrl: './companias.component.scss',
  providers: [MessageService]
})
export class CompaniasComponent implements OnInit {

  showNumberOnlyWarning = false;
  dialogCompany: boolean = false;
  registerFormCompany: FormGroup;

  private companyService = inject(CompanyService);
  private messageService = inject(MessageService);

  companies = this.companyService.companiesList;
  isLoading = this.companyService.isLoading;
  hasError = this.companyService.hasError;

  identificationTypes = this.companyService.getIdentificationTypes();
  companyTypes = this.companyService.getCompanyTypes();

  constructor(private fb: FormBuilder) {
    this.registerFormCompany = this.fb.group({
      tipoIdentificacion: [null, Validators.required],
      identificacion: ['', Validators.required, Validators.maxLength(13), this.validarIdentificacion.bind(this)],
      nombre: [null, Validators.required],
      direccion: [null, Validators.required],
      telefono: [null, Validators.required],
      email: [null, Validators.email],
    });

    this.registerFormCompany.get('tipoIdentificacion')?.valueChanges.subscribe(() => {
      this.registerFormCompany.get('identificacion')?.reset();
      this.showNumberOnlyWarning = false;
    });
  }

  ngOnInit(): void {

    this.loadCompanies();

    // Escuchamos cambios en el error
    effect(() => {
      const error = this.hasError();
      if (error) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error
        });
      }
    });
  }

  loadCompanies() {
    this.companyService.loadCompanies();
  }


  validarIdentificacion(control: AbstractControl): ValidationErrors | null {
    const tipoIdentificacion = this.registerFormCompany?.get('tipoIdentificacion')?.value;
    const value = control.value;

    if (!value) return null;

    if (tipoIdentificacion === IdentificationType.passport) {
      return null;
    }
    const onlyNumbers = /^\d+$/.test(value);
    return onlyNumbers ? null : { onlyNumbers: true };
  }

  onKeyPressIdentificacion(event: KeyboardEvent) {
    const tipoIdentificacion = this.registerFormCompany.get('tipoIdentificacion')?.value;

    if (tipoIdentificacion &&
      [IdentificationType.ruc, IdentificationType.dni].includes(tipoIdentificacion)) {
      const pattern = /[0-9]/;
      const inputChar = String.fromCharCode(event.charCode);

      if (!pattern.test(inputChar)) {
        this.showNumberOnlyWarning = true;
        setTimeout(() => this.showNumberOnlyWarning = false, 2000);
        event.preventDefault();
      }
    }
  }


  openDialogCompany() {
    this.registerFormCompany.reset();
    this.dialogCompany = true;
  }

  closeDialogCompany() {

    this.dialogCompany = false;
  }

  onSubmitCompany() { }





}
