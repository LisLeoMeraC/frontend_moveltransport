import { CommonModule } from '@angular/common';
import { Component, effect, inject, OnInit, signal, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { CompanyService } from '../../pages/service/company.service';
import { MessageService } from 'primeng/api';
import { CompanyResponse, IdentificationType } from '../../pages/models/company';
import { ToastModule } from 'primeng/toast';
import { MatPaginator, MatPaginatorIntl, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { getSpanishPaginatorIntl } from '../../config/getSpanishPaginatorIntl';
import { SelectButtonModule } from 'primeng/selectbutton';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { ToolbarModule } from 'primeng/toolbar';
import { TableModule } from 'primeng/table';
import { DropdownModule } from 'primeng/dropdown';

@Component({
    selector: 'app-company',
    standalone: true,
    imports: [
        CommonModule,
        ToolbarModule,
        TableModule,
        InputTextModule,
        IconFieldModule,
        InputIconModule,
        ButtonModule,
        ReactiveFormsModule,
        DialogModule,
        DropdownModule,
        ToastModule,
        MatPaginatorModule,
        MatProgressSpinnerModule,
        SelectButtonModule,
        FormsModule
    ],
    templateUrl: './company.component.html',
    styleUrl: './company.component.scss',
    providers: [MessageService, { provide: MatPaginatorIntl, useValue: getSpanishPaginatorIntl() }]
})
export class CompanyComponent implements OnInit {
    showNumberOnlyWarning = false;
    dialogCompany: boolean = false;
    registerFormCompany: FormGroup;

    private companyService = inject(CompanyService);
    private destroy$ = new Subject<void>();
    private searchSubject = new Subject<string>();

    companies = this.companyService.companiesList;
    isLoading = this.companyService.isLoading;
    hasError = this.companyService.hasError;
    pagination = this.companyService.paginationData;
    pageSize = signal(5);

    selectedType: string | undefined;

    hasSearchedIdentification: boolean = false;

    //Para editarr una compañia
    editMode = false;
    companyId: string | null = null;

    //Para buscar compañias
    searchTerm: string = '';

    //Para eliminar compañia
    dialogDeleteCompany: boolean = false;
    companyToDelete: CompanyResponse | null = null;

    isSubmitted = true;
    isDeleting = false;

    identificationTypes = this.companyService.getIdentificationTypes();
    companyTypes = this.companyService.getCompanyTypes();

    @ViewChild(MatPaginator) paginator!: MatPaginator;

    constructor(
        private fb: FormBuilder,
        private messageService: MessageService
    ) {
        this.registerFormCompany = this.fb.group({
            type: ['', Validators.required],
            identificationType: ['', Validators.required],
            identification: ['', [Validators.required, Validators.maxLength(13), this.validarIdentificacion.bind(this)]],
            name: ['', Validators.required],
            address: [''],
            phone: [''],
            email: ['', Validators.email]
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
            this.showNumberOnlyWarning = false;
        });

        this.searchSubject.pipe(takeUntil(this.destroy$), debounceTime(2000), distinctUntilChanged()).subscribe((term) => {
            if (term.trim() === '') {
                this.loadCompanies(1, this.pageSize(), this.selectedType);
            } else {
                this.searchCompanies(term, 1, this.pageSize(), this.selectedType);
            }
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
            const newPage = event.pageSize !== this.pagination().pageSize ? 1 : event.pageIndex + 1;
            if (this.searchTerm.trim() === '') {
                this.loadCompanies(newPage, event.pageSize, this.selectedType);
            } else {
                this.searchCompanies(this.searchTerm, newPage, event.pageSize, this.selectedType);
            }
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    onSearchChange(): void {
        // Resetear siempre a la primera página al cambiar el término de búsqueda
        this.searchSubject.next(this.searchTerm);
    }

    searchCompanies(term: string, page: number = 1, limit: number = this.pageSize(), type?: string): void {
        this.companyService.searchCompanies(term, page, limit, type).subscribe(() => {
            if (this.paginator) {
                // Resetear el paginador solo si es una nueva búsqueda (página 1)
                if (page === 1) {
                    this.paginator.pageIndex = 0;
                }
                // Actualizar el tamaño de página si es diferente
                if (limit !== this.paginator.pageSize) {
                    this.paginator.pageSize = limit;
                }
            }
        });
    }

    confirmDeleteCompany(company: CompanyResponse): void {
        this.companyToDelete = company;
        this.dialogDeleteCompany = true;
    }

    deleteCompany(): void {
        if (!this.companyToDelete) return;
        this.isDeleting = true;

        this.companyService.deleteCompany(this.companyToDelete.id).subscribe({
            next: (response) => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: 'Compañía eliminada correctamente',
                    life: 5000
                });
                this.isDeleting = false;

                // Recargar la lista de compañías
                if (this.searchTerm.trim() === '') {
                    this.loadCompanies(this.pagination().currentPage, this.pageSize(), this.selectedType);
                } else {
                    this.searchCompanies(this.searchTerm, this.pagination().currentPage, this.pageSize(), this.selectedType);
                }
            },
            error: (err) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudo eliminar la compañía',
                    life: 5000
                });
            },
            complete: () => {
                this.dialogDeleteCompany = false;
                this.isDeleting = false;
                this.companyToDelete = null;
            }
        });
    }

    loadCompanies(page: number = 1, limit: number = this.pageSize(), type?: string): void {
        this.companyService.loadCompanies(true, page, limit, type).subscribe(() => {
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

        if (identificationType && [IdentificationType.ruc, IdentificationType.dni].includes(identificationType)) {
            const pattern = /[0-9]/;
            const inputChar = String.fromCharCode(event.charCode);

            if (!pattern.test(inputChar)) {
                this.showNumberOnlyWarning = true;
                setTimeout(() => (this.showNumberOnlyWarning = false), 2000);
                event.preventDefault();
            }
        }
    }

    onSubmitCompany() {
        if (!this.hasSearchedIdentification) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Advertencia',
                detail: 'Por favor busque si existe un registro con ese número de cédula antes de continuar',
                life: 5000
            });
            return;
        }

        console.log(JSON.stringify(this.registerFormCompany.value, null, 2));
        console.log('value:', this.registerFormCompany.value);
        console.log('rawValue:', this.registerFormCompany.getRawValue());

        // Validar el formulario antes de continuar
        if (!this.checkFormValidity()) {
            return;
        }

        this.isSubmitted = true;
        const formValue = this.registerFormCompany.getRawValue();

        // Datos comunes a ambas operaciones
        let companyData: any = {
            name: formValue.name,
            address: formValue.address || null,
            email: formValue.email || null,
            phone: formValue.phone || null,
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

        // Siempre ejecutar la operación, aunque los datos no hayan cambiado
        const operation = this.editMode && this.companyId ? this.companyService.updateCompany(this.companyId, companyData) : this.companyService.registerCompany(companyData);
        this.dialogCompany = false;
        operation.subscribe({
            next: () => {
                this.registerFormCompany.reset();
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: this.editMode ? 'Compañía actualizada correctamente' : 'Compañía registrada correctamente',
                    life: 5000
                });
                this.editMode = false;
                this.companyId = null;
                this.loadCompanies();
                this.isSubmitted = false;
            },
            error: (err) => {
                console.error('Error en el componente:', err);
                this.isSubmitted = false;
            }
        });
    }

    openDialogCompany(company?: CompanyResponse) {
        this.registerFormCompany.reset();
        this.editMode = !!company;
        this.companyId = company?.id || null;
        this.isSubmitted = false;

        this.habilitarControles(this.editMode);
        this.registerFormCompany.get('identification')?.disable();
        this.registerFormCompany.get('identificationType')?.disable();
        if (!this.editMode) {
            this.registerFormCompany.get('identification')?.enable();
        }

        if (company) {
            const formData = {
                type: company.type,
                identificationType: company.subject.identificationType,
                identification: company.subject.identification.trim(),
                name: company.subject.name,
                address: company.subject.address,
                phone: company.subject.phone,
                email: company.subject.email || null
            };

            setTimeout(() => {
                this.registerFormCompany.patchValue(formData, { emitEvent: false });
            });
        }

        this.dialogCompany = true;
    }

    closeDialogCompany() {
        this.dialogCompany = false;
    }

    buscarIdentificacion() {
        this.hasSearchedIdentification = false;
        const identification = this.registerFormCompany.get('identification')?.value;

        if (!identification) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Advertencia',
                detail: 'Por favor ingrese un número de identificación',
                life: 5000
            });
            return;
        }

        this.companyService.searchByIdentification(identification).subscribe({
            next: (response) => {
                this.hasSearchedIdentification = true;

                if (response.statusCode === 200 && response.data) {
                    // Caso 1: Ya está registrado como compañía (isRegistered: true)
                    if (response.data.isRegistered) {
                        this.messageService.add({
                            severity: 'info',
                            summary: 'Información',
                            detail: 'Ya está registrada como compañía',
                            life: 5000
                        });
                        this.dialogCompany = false;
                    }
                    // Caso 2: No está registrado como compañía, pero existe como persona (company no es null)
                    else if (response.data.company) {
                        this.patchFormWithOwnerData(response.data.company);
                        this.messageService.add({
                            severity: 'warn',
                            summary: 'Advertencia',
                            detail: 'No está registrado como compañía, por favor elija el tipo de compañía',
                            life: 5000
                        });
                        this.habilitarControles(false);
                        this.registerFormCompany.get('type')?.enable();
                    }
                    // Caso 3: No existe ningún registro (company: null)
                    else {
                        this.messageService.add({
                            severity: 'info',
                            summary: 'Información',
                            detail: 'No se encontró un registro con esta identificación. Puede registrar uno nuevo.',
                            life: 5000
                        });

                        // Guardamos el valor actual de identificación antes de resetear
                        const currentIdentification = this.registerFormCompany.get('identification')?.value;
                        const currentIdentificationType = this.registerFormCompany.get('identificationType')?.value;

                        // Reseteamos el formulario pero preservamos identificación
                        this.registerFormCompany.reset();

                        // Restauramos la identificación
                        this.registerFormCompany.patchValue({
                            identification: currentIdentification,
                            identificationType: currentIdentificationType
                        });

                        this.habilitarControles(true); // Habilitamos todos los controles
                        this.editMode = false;
                        this.companyId = null;
                    }
                } else {
                    // Respuesta inesperada del servidor
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Respuesta inesperada del servidor',
                        life: 5000
                    });
                    this.habilitarControles(true);
                }
            },
            error: (err) => {
                this.hasSearchedIdentification = false;
                console.error('Error al buscar:', err);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Ocurrió un error al buscar la compañía',
                    life: 5000
                });
            }
        });
    }

    private patchFormWithOwnerData(data: any) {
        const formData = {
            identificationType: data.subject.identificationType,
            identification: data.subject.identification?.trim(),
            name: data.subject.name,
            address: data.subject.address,
            phone: data.subject.phone,
            email: data.subject.email || null,
            type: data.type || null
        };

        this.registerFormCompany.patchValue(formData, { emitEvent: false });
    }

    habilitarControles(estado: boolean) {
        if (estado === true) {
            this.registerFormCompany.get('identification')?.enable();
            this.registerFormCompany.get('identificationType')?.enable();
            this.registerFormCompany.get('type')?.enable();
            this.registerFormCompany.get('name')?.enable();
            this.registerFormCompany.get('address')?.enable();
            this.registerFormCompany.get('phone')?.enable();
            this.registerFormCompany.get('email')?.enable();
        } else {
            this.registerFormCompany.get('identification')?.disable();
            this.registerFormCompany.get('identificationType')?.disable();
            this.registerFormCompany.get('type')?.disable();
            this.registerFormCompany.get('name')?.disable();
            this.registerFormCompany.get('address')?.disable();
            this.registerFormCompany.get('phone')?.disable();
            this.registerFormCompany.get('email')?.disable();
        }
    }

    limpiarIdentificacion() {
        this.registerFormCompany.reset();
        this.habilitarControles(false);
        this.registerFormCompany.get('identification')?.enable();
    }

    checkFormValidity(): boolean {
        const requiredFields = ['type', 'identificationType', 'identification', 'name'];
        let isValid = true;
        let invalidFields = [];

        // Verificar solo los campos requeridos
        requiredFields.forEach((field) => {
            const control = this.registerFormCompany.get(field);
            if (control && control.invalid) {
                control.markAsTouched();
                isValid = false;
                invalidFields.push(field);
            }
        });

        // Verificar campos con otras validaciones
        const phoneControl = this.registerFormCompany.get('phone');
        if (phoneControl && phoneControl.invalid) {
            phoneControl.markAsTouched();
            isValid = false;
            invalidFields.push('teléfono (máx. 13 caracteres)');
        }

        const emailControl = this.registerFormCompany.get('email');
        if (emailControl && emailControl.invalid) {
            emailControl.markAsTouched();
            isValid = false;
            invalidFields.push('email (formato inválido)');
        }

        if (!isValid) {
            const errorMessage = invalidFields.length > 1 ? `Corrija los siguientes campos: ${invalidFields.join(', ')}` : `Corrija el campo: ${invalidFields[0]}`;

            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: errorMessage,
                life: 5000
            });
        }

        return isValid;
    }
}
