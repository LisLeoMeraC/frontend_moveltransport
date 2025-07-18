import { CommonModule } from '@angular/common';
import { Component, effect, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { CompanyService } from '../../pages/service/company.service';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { MatPaginator, MatPaginatorIntl, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { getSpanishPaginatorIntl } from '../../config/getSpanishPaginatorIntl';
import { SelectButtonModule } from 'primeng/selectbutton';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { ToolbarModule } from 'primeng/toolbar';
import { TableModule } from 'primeng/table';
import { DropdownModule } from 'primeng/dropdown';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SplitButtonModule } from 'primeng/splitbutton';
import { Menu, MenuModule } from 'primeng/menu';
import { Paginator, PaginatorModule } from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import { CompanyResponse } from '../../pages/models/company.model';
import { IdentificationType } from '../../pages/models/shared.model';
import { BaseHttpService } from '../../pages/service/base-http.service';

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
        SelectModule,
        DialogModule,
        DropdownModule,
        ToastModule,
        MatPaginatorModule,
        MatProgressSpinnerModule,
        MenuModule,
        SelectButtonModule,
        SplitButtonModule,
        PaginatorModule,
        FormsModule,
        ConfirmDialogModule
    ],
    templateUrl: './company.component.html',
    styleUrl: './company.component.scss',
    providers: [MessageService, ConfirmationService, { provide: MatPaginatorIntl, useValue: getSpanishPaginatorIntl() }]
})
export class CompanyComponent implements OnInit, OnDestroy {
    // Formularios
    registerFormCompany: FormGroup;

    // Estados reactivos
    pageSize = signal(5);
    first = signal(0);
    isDisabling = signal(false);

    // Flags y controles de UI
    showNumberOnlyWarning = false;
    isSubmitted = true;
    hasSearchedIdentification = false;
    editMode = false;

    // Diálogos
    dialogCompany = false;
    dialogDisableCompany = false;
    dialogEnableCompany = false;

    // Selecciones actuales
    selectedType: string | undefined;
    selectedCompany?: CompanyResponse;
    companyToDisable: CompanyResponse | null = null;
    companyToEnable: CompanyResponse | null = null;
    companyId: string | null = null;

    // Datos y servicios
    private companyService = inject(CompanyService);
    private baseHttpService = inject(BaseHttpService);
    searchTerm = '';
    menuItems: MenuItem[] = [];
    companies = this.companyService.companiesList;
    isLoading = this.companyService.isLoading;
    hasError = this.companyService.hasError;
    pagination = this.companyService.paginationData;

    // Tipos
    identificationTypes = this.companyService.getIdentificationTypes();
    companyTypes = this.companyService.getCompanyTypes();
    typeCompany: any[] = [
        { name: 'Cliente', value: 'client' },
        { name: 'Transportista', value: 'carrier' },
        { name: 'Ambos', value: 'both' }
    ];

    // RxJS
    private destroy$ = new Subject<void>();
    private searchSubject = new Subject<string>();

    // ViewChild
    @ViewChild('menu') menu!: Menu;
    @ViewChild('paginator') paginator!: Paginator;

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

        // Mostrar errores globales
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

        // Reiniciar advertencia al cambiar tipo de identificación
        this.registerFormCompany.get('identificationType')?.valueChanges.subscribe(() => {
            this.showNumberOnlyWarning = false;
        });

        // Búsqueda reactiva
        this.searchSubject.pipe(takeUntil(this.destroy$), debounceTime(800), distinctUntilChanged()).subscribe((term) => {
            const page = 1;
            const size = this.pageSize();
            if (term.trim() === '') {
                this.loadCompanies(page, size, this.selectedType);
            } else {
                this.searchCompanies(term, page, size, this.selectedType);
            }
        });
    }

    // -------------------- Ciclo de vida --------------------

    ngOnInit(): void {
        this.loadCompanies();
        this.initMenuItems();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    // -------------------- Inicialización --------------------

    initMenuItems(): void {
        this.menuItems = [
            {
                label: 'Editar',
                icon: 'pi pi-pencil',
                command: () => this.selectedCompany && this.openDialogCompany(this.selectedCompany)
            },
            {
                label: 'Eliminar',
                icon: 'pi pi-trash',
                command: () => this.selectedCompany && this.confirmDisableCompany(this.selectedCompany)
            }
        ];
    }

    // -------------------- Acciones con el menú --------------------

    toggleMenu(event: Event, company: CompanyResponse): void {
        this.selectedCompany = company;
        this.menu.toggle(event);
    }

    selectCompany(company: CompanyResponse): void {
        this.selectedCompany = company;
        console.log('Compañía seleccionada:', company.id);
    }

    // -------------------- Carga y búsqueda --------------------

    loadCompanies(page: number = 1, limit: number = this.pageSize(), type?: string): void {
        this.companyService.loadCompanies({ status: true, page, limit, type }).subscribe(() => {
            if (page === 1) this.first.set(0);
        });
    }

    searchCompanies(term: string, page: number = 1, limit: number = this.pageSize(), type?: string): void {
        this.companyService.searchCompanies(term, page, limit, type).subscribe(() => {
            if (page === 1) this.first.set(0);
        });
    }

    onSearchChange(): void {
        this.searchSubject.next(this.searchTerm);
    }

    onTypeChange(event: any): void {
        const type = event?.value;
        if (type !== undefined) {
            this.selectedType = type;
            this.searchTerm.trim() === '' ? this.loadCompanies(1, this.pageSize(), type) : this.searchCompanies(this.searchTerm, 1, this.pageSize(), type);
        }
    }

    onPageChange(event: any): void {
        const page = event.page + 1;
        const rows = event.rows;
        this.pageSize.set(rows);
        this.searchTerm.trim() === '' ? this.loadCompanies(page, rows) : this.searchCompanies(this.searchTerm, page, rows);
    }

    // -------------------- Registro / Edición --------------------
    openDialogCompany(company?: CompanyResponse): void {
        this.registerFormCompany.reset();
        this.editMode = !!company;
        this.companyId = company?.id || null;
        this.isSubmitted = false;

        this.habilitarControles(this.editMode);

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
            setTimeout(() => this.registerFormCompany.patchValue(formData, { emitEvent: false }));
        }

        this.dialogCompany = true;
    }

    closeDialogCompany(): void {
        this.dialogCompany = false;
    }

    onSubmitCompany(): void {
        if (!this.hasSearchedIdentification && !this.editMode) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Advertencia',
                detail: 'Por favor busque si existe un registro con ese número de cédula antes de continuar',
                life: 5000
            });
            return;
        }

        if (!this.checkFormValidity()) return;

        this.isSubmitted = true;
        const formValue = this.registerFormCompany.getRawValue();
        let companyData: any = {
            name: formValue.name,
            address: formValue.address || null,
            email: formValue.email || null,
            phone: formValue.phone || null,
            type: formValue.type
        };

        if (!this.editMode) {
            companyData = {
                ...companyData,
                identification: formValue.identification?.trim(),
                identificationType: formValue.identificationType
            };
        }

        const operation = this.editMode && this.companyId ? this.companyService.updateCompany(this.companyId, companyData) : this.companyService.registerCompany(companyData);

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
                this.dialogCompany = false;
                this.isSubmitted = false;
                this.loadCompanies();
            },
            error: () => {
                this.isSubmitted = false;
            }
        });
    }

    // -------------------- Habilitar / Deshabilitar --------------------

    confirmDisableCompany(company: CompanyResponse): void {
        this.companyToDisable = company;
        this.dialogDisableCompany = true;
    }

    disableCompany(): void {
        if (!this.companyToDisable?.id) return;

        this.isDisabling.set(true);

        this.companyService.disableCompany(this.companyToDisable.id).subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: 'Compañía deshabilitada correctamente',
                    life: 5000
                });
                this.dialogDisableCompany = false;
                this.loadCompanies();
            },
            error: () => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudo deshabilitar la compañía',
                    life: 5000
                });
            },
            complete: () => {
                this.isDisabling.set(false);
                this.companyToDisable = null;
            }
        });
    }

    confirmEnableCompany(company: CompanyResponse): void {
        this.companyToEnable = company;
        this.dialogEnableCompany = true;
    }

    enableCompany(): void {
        if (!this.companyToEnable?.id) return;

        this.companyService.enableCompany(this.companyToEnable.id).subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: 'Compañía habilitada correctamente',
                    life: 5000
                });
                this.dialogEnableCompany = false;
                this.dialogCompany = false;
                this.loadCompanies();
            },
            error: () => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudo habilitar la compañía',
                    life: 5000
                });
            }
        });
    }

    // -------------------- Validaciones e input --------------------

    validarIdentificacion(control: AbstractControl): ValidationErrors | null {
        const tipoIdentificacion = this.registerFormCompany?.get('identificationType')?.value;
        const value = control.value;

        if (!value || tipoIdentificacion === IdentificationType.passport) return null;

        return /^\d+$/.test(value) ? null : { onlyNumbers: true };
    }

    onKeyPressIdentificacion(event: KeyboardEvent): void {
        const type = this.registerFormCompany.get('identificationType')?.value;
        const char = String.fromCharCode(event.charCode);
        if ([IdentificationType.ruc, IdentificationType.dni].includes(type) && !/[0-9]/.test(char)) {
            this.showNumberOnlyWarning = true;
            setTimeout(() => (this.showNumberOnlyWarning = false), 2000);
            event.preventDefault();
        }
    }

    checkFormValidity(): boolean {
        const required = ['type', 'identificationType', 'identification', 'name'];
        const invalidFields: string[] = [];

        required.forEach((field) => {
            const control = this.registerFormCompany.get(field);
            if (control?.invalid) {
                control.markAsTouched();
                invalidFields.push(field);
            }
        });

        ['phone', 'email'].forEach((field) => {
            const control = this.registerFormCompany.get(field);
            if (control?.invalid) {
                control.markAsTouched();
                invalidFields.push(field);
            }
        });

        if (invalidFields.length > 0) {
            const fields = invalidFields.join(', ');
            const translated = this.baseHttpService.translateFieldNames(fields);
            const detail = invalidFields.length > 1 ? `Corrija los siguientes campos: ${translated}` : `Corrija el campo: ${translated}`;
            this.messageService.add({ severity: 'warn', summary: 'Advertencia', detail, life: 5000 });
            return false;
        }

        return true;
    }

    // -------------------- Identificación --------------------

    buscarIdentificacion(): void {
        this.hasSearchedIdentification = false;
        const identification = this.registerFormCompany.get('identification')?.value;
        if (!identification) {
            this.messageService.add({ severity: 'warn', summary: 'Advertencia', detail: 'Ingrese un número de identificación', life: 5000 });
            return;
        }

        this.companyService.searchByIdentification(identification).subscribe({
            next: (response) => {
                this.hasSearchedIdentification = true;
                const data = response.data;

                if (response.statusCode === 200 && data) {
                    if (data.isRegistered && data.company?.isEnabled) {
                        this.messageService.add({ severity: 'info', summary: 'Información', detail: 'Ya está registrada como compañía habilitada', life: 5000 });
                        this.dialogCompany = false;
                    } else if (data.isRegistered && data.company && !data.company.isEnabled) {
                        this.confirmEnableCompany(data.company);
                    } else if (data.company) {
                        this.patchFormWithOwnerData(data.company);
                        this.messageService.add({ severity: 'warn', summary: 'Advertencia', detail: 'No está registrado como compañía, elija tipo', life: 5000 });
                        this.habilitarControles(false);
                        this.registerFormCompany.get('type')?.enable();
                    } else {
                        this.handleNuevoRegistro();
                    }
                } else {
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Respuesta inesperada del servidor', life: 5000 });
                    this.habilitarControles(true);
                }
            },
            error: (err) => {
                console.error('Error al buscar:', err);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Ocurrió un error al buscar la compañía', life: 5000 });
            }
        });
    }

    private handleNuevoRegistro(): void {
        const currentId = this.registerFormCompany.get('identification')?.value;
        const currentType = this.registerFormCompany.get('identificationType')?.value;

        this.registerFormCompany.reset();
        this.registerFormCompany.patchValue({ identification: currentId, identificationType: currentType });

        this.messageService.add({ severity: 'info', summary: 'Información', detail: 'No se encontró un registro. Puede registrar uno nuevo.', life: 5000 });

        this.habilitarControles(true);
        this.editMode = false;
        this.companyId = null;
    }

    private patchFormWithOwnerData(data: any): void {
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

    limpiarIdentificacion(): void {
        this.registerFormCompany.reset();
        this.habilitarControles(false);
        this.registerFormCompany.get('identification')?.enable();
    }

    habilitarControles(estado: boolean): void {
        const controls = ['identification', 'identificationType', 'type', 'name', 'address', 'phone', 'email'];
        controls.forEach((field) => {
            const control = this.registerFormCompany.get(field);
            estado ? control?.enable() : control?.disable();
        });
    }
}
