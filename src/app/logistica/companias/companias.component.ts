import { CommonModule } from '@angular/common';
import { Component, effect, inject, OnInit, signal, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, FormsModule } from '@angular/forms';
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
import { CompanyResponse, IdentificationType } from '../../pages/models/company';
import { ToastModule } from 'primeng/toast';
import { MatPaginator, MatPaginatorIntl, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { getSpanishPaginatorIntl } from '../../config/getSpanishPaginatorIntl';
import { SelectButtonModule } from 'primeng/selectbutton';

@Component({
  selector: 'app-companias',
  standalone: true,
  imports: [CommonModule, ToolbarModule, TableModule, InputTextModule, IconFieldModule, InputIconModule, ButtonModule, ReactiveFormsModule,
    DialogModule, DropdownModule, DropdownModule, ToastModule, MatPaginatorModule, MatProgressSpinnerModule, SelectButtonModule, FormsModule],
  templateUrl: './companias.component.html',
  styleUrl: './companias.component.scss',
  providers: [
    MessageService,
    { provide: MatPaginatorIntl, useValue: getSpanishPaginatorIntl() }
  ]
})
export class CompaniasComponent implements OnInit {

  showNumberOnlyWarning = false;
  dialogCompany: boolean = false;
  registerFormCompany: FormGroup;

  private companyService = inject(CompanyService);

  companies = this.companyService.companiesList;
  isLoading = this.companyService.isLoading;
  hasError = this.companyService.hasError;
  pagination = this.companyService.paginationData;
  pageSize = signal(5);

  selectedType: string | undefined;

  //Para editarr una compañia
  editMode = false;
  companyId: string | null = null;


  identificationTypes = this.companyService.getIdentificationTypes();
  companyTypes = this.companyService.getCompanyTypes();

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private fb: FormBuilder, private messageService: MessageService,) {
    this.registerFormCompany = this.fb.group({
      type: [null, Validators.required],
      identificationType: [null, Validators.required],
      identification: ['', [Validators.required, Validators.maxLength(13), this.validarIdentificacion.bind(this)]],
      name: [null, Validators.required],
      address: [null, Validators.required],
      phone: [null, [Validators.required, Validators.maxLength(10)]],
      email: [null, Validators.email],
    });


    effect(() => {
      const error = this.hasError();
      if (error) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error,
          life: 5000
        });
      }
    });

    this.registerFormCompany.get('identificationType')?.valueChanges.subscribe(() => {
      this.registerFormCompany.get('identification')?.reset();
      this.showNumberOnlyWarning = false;
    });
  }

  ngOnInit(): void {
    this.loadCompanies();

  }

  typeCompany: any[] = [
    { name: 'Cliente', value: 'client' },
    { name: 'Transportista', value: 'carrier' },
    { name: 'Ambos', value: 'both' }
  ];

  ngAfterViewInit(): void {
    this.paginator.page.subscribe((event) => {
      this.pageSize.set(event.pageSize);
      const newPage = event.pageSize !== this.pagination().pageSize
        ? 1 : event.pageIndex + 1;
      this.loadCompanies(newPage, event.pageSize, this.selectedType);
    });
  }

  loadCompanies(page: number = 1, limit: number = this.pageSize(), type?: string): void {
    this.companyService.loadCompanies(page, limit, type).subscribe(() => {
      if (this.paginator) {
        this.paginator.pageIndex = page - 1;
        this.paginator.pageSize = limit;
      }
    });
  }

  onTypeChange(event: any) {
    if (event && event.value !== undefined) {
      this.selectedType = event.value;
      this.loadCompanies(1, this.pageSize(), event.value);
    }
  }



  validarIdentificacion(control: AbstractControl): ValidationErrors | null {
    const tipoIdentificacion = this.registerFormCompany?.get('identificationType')?.value;
    const value = control.value;

    if (!value) return null;

    if (tipoIdentificacion === IdentificationType.passport) {
      return null;
    }

    const onlyNumbers = /^\d+$/.test(value);
    return onlyNumbers ? null : { onlyNumbers: true };
  }


  onKeyPressIdentificacion(event: KeyboardEvent) {
    const identificationType = this.registerFormCompany.get('identificationType')?.value;

    if (identificationType &&
      [IdentificationType.ruc, IdentificationType.dni].includes(identificationType)) {
      const pattern = /[0-9]/;
      const inputChar = String.fromCharCode(event.charCode);

      if (!pattern.test(inputChar)) {
        this.showNumberOnlyWarning = true;
        setTimeout(() => this.showNumberOnlyWarning = false, 2000);
        event.preventDefault();
      }
    }
  }

  onSubmitCompany() {
    if (this.registerFormCompany.invalid) {
      this.registerFormCompany.markAllAsTouched();
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Por favor complete todos los campos requeridos',
        life: 5000,
      });
      return;
    }

    const formValue = this.registerFormCompany.value;

    // Datos comunes a ambas operaciones
    let companyData: any = {
      name: formValue.name,
      address: formValue.address,
      email: formValue.email || undefined,
      phone: formValue.phone,
      type: formValue.type
    };

    // Solo incluir identificación si NO estamos en modo edición
    if (!this.editMode) {
      companyData = {
        ...companyData,
        identification: formValue.identification?.trim(),
        identificationType: formValue.identificationType
      };
    }


    const operation = this.editMode && this.companyId
      ? this.companyService.updateCompany(this.companyId, companyData)
      : this.companyService.registerCompany(companyData);

    operation.subscribe({
      next: () => {
        this.dialogCompany = false;
        this.registerFormCompany.reset();
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: this.editMode
            ? 'Compañía actualizada correctamente'
            : 'Compañía registrada correctamente',
          life: 5000,
        });
        this.editMode = false;
        this.companyId = null;
        this.loadCompanies();
      },
      error: (err) => {
        console.error('Error en el componente:', err);
      }
    });
  }

  openDialogCompany(company?: CompanyResponse) {
    this.registerFormCompany.reset();
    this.editMode = !!company;
    this.companyId = company?.id || null;

    if (company) {
      console.log('Datos de la compañía recibidos para edición:', JSON.stringify(company, null, 2));

      const formData = {
        type: company.type,
        identificationType: company.subject.identificationType,
        identification: company.subject.identification.trim(),
        name: company.subject.name,
        address: company.subject.address,
        phone: company.subject.phone,
        email: company.subject.email || null
      };

      console.log('Datos que se asignarán al formulario:', JSON.stringify(formData, null, 2));

      setTimeout(() => {
        this.registerFormCompany.patchValue(formData, { emitEvent: false });

        
        
        // Verificar los valores actuales del formulario después del patch
        console.log('Valores actuales del formulario:', JSON.stringify(this.registerFormCompany.value, null, 2));
      });
    }

    this.dialogCompany = true;
  }

  closeDialogCompany() {
    this.dialogCompany = false;
  }


}
