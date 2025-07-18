import { CommonModule } from '@angular/common';
import { Component, effect, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatPaginator, MatPaginatorIntl, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MenuItem, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { VehicleOwnerService } from '../../pages/service/vehicle-owner.service';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { getSpanishPaginatorIntl } from '../../config/getSpanishPaginatorIntl';
import { VehicleOwnerResponse } from '../../pages/models/vehicle-owner.model';
import { Menu, MenuModule } from 'primeng/menu';
import { Paginator, PaginatorModule } from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import { IdentificationType } from '../../pages/models/shared.model';

@Component({
    selector: 'app-vehicle-owner',
    standalone: true,
    imports: [
        CommonModule,
        ToolbarModule,
        TableModule,
        InputTextModule,
        SelectModule,
        IconFieldModule,
        InputIconModule,
        ButtonModule,
        ReactiveFormsModule,
        DialogModule,
        PaginatorModule,
        MenuModule,
        DropdownModule,
        ToastModule,
        MatPaginatorModule,
        MatProgressSpinnerModule,
        SelectButtonModule,
        FormsModule
    ],
    templateUrl: './vehicle-owner.component.html',
    styleUrl: './vehicle-owner.component.scss',
    providers: [MessageService, { provide: MatPaginatorIntl, useValue: getSpanishPaginatorIntl() }]
})
export class VehicleOwnerComponent implements OnInit, OnDestroy {
    //Formulario
    registerFormVehicleOwner: FormGroup;

    //Estados reactivos
    pageSize = signal(5);
    first = signal(0);
    isDisabling = signal(false);

    //Flags y controles de UI
    showNumberOnlyWarning = false;
    isSubmitted = true;
    isDeleting = false;
    editMode = false;

    //Diálogos
    dialogVehicleOwner: boolean = false;
    dialogDeleteVehicleOwner: boolean = false;
    dialogDisableVehicleOwner: boolean = false;
    dialogEnableVehicleOwner: boolean = false;

    //Selecciones actuales
    selectedVehicleOwner?: VehicleOwnerResponse;
    vehicleOwnerToEnable: VehicleOwnerResponse | null = null;
    vehicleOwnerToDisable: VehicleOwnerResponse | null = null;
    vehicleOwnerToDelete: VehicleOwnerResponse | null = null;
    vehicleOwnerId: string | null = null;

    //Dattos y servicios
    private vehicleOwnerService = inject(VehicleOwnerService);
    vehicleOwners = this.vehicleOwnerService.vehicleOwnersList;
    isLoading = this.vehicleOwnerService.isLoading;
    hasError = this.vehicleOwnerService.hasError;
    pagination = this.vehicleOwnerService.paginationData;
    searchTerm: string = '';
    menuItems: MenuItem[] = [];

    //Tipos
    identificationTypes = this.vehicleOwnerService.getIdentificationTypes();

    //RxJS
    private destroy$ = new Subject<void>();
    private searchSubject = new Subject<string>();

    //ViewChild
    @ViewChild('paginator') paginator!: Paginator;
    @ViewChild('menu') menu!: Menu;

    constructor(
        private fb: FormBuilder,
        private messageService: MessageService
    ) {
        this.registerFormVehicleOwner = this.fb.group({
            identification: ['', [Validators.required, Validators.maxLength(13), this.validarIdentificacion.bind(this)]],
            identificationType: ['', Validators.required],
            name: ['', Validators.required],
            address: [''],
            phone: [''],
            email: ['', Validators.email]
        });
        //Mostrar errores de forma global
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
        //Validación de identificación
        this.registerFormVehicleOwner.get('identificationType')?.valueChanges.subscribe((value) => {
            this.showNumberOnlyWarning = false;
        });

        //Busqueda reactiva
        this.searchSubject.pipe(takeUntil(this.destroy$), debounceTime(800), distinctUntilChanged()).subscribe((term) => {
            if (term.trim() === '') {
                this.loadVehicleOwners(1, this.pageSize());
            } else {
                this.searchVehicleOwner(term, 1, this.pageSize());
            }
        });
    }
    //=========Ciclo de vida del componente=========
    ngOnInit(): void {
        this.loadVehicleOwners();
        this.initMenuItems();
    }
    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
    //=========Inicialización=========
    initMenuItems(): void {
        this.menuItems = [
            {
                label: 'Editar',
                icon: 'pi pi-pencil',
                command: () => {
                    if (this.selectedVehicleOwner) {
                        this.openDialogVehicleOwner(this.selectedVehicleOwner);
                    }
                }
            },
            {
                label: 'Eliminar',
                icon: 'pi pi-trash',
                command: () => {
                    if (this.selectedVehicleOwner) {
                        this.confirmDisableVehicleOwner(this.selectedVehicleOwner);
                    }
                }
            }
        ];
    }
    toggleMenu(event: Event, vehicleOwner: VehicleOwnerResponse): void {
        this.selectedVehicleOwner = vehicleOwner;
        this.menu.toggle(event);
    }
    onPageChange(event: any): void {
        const newPage = event.page + 1;
        const newSize = event.rows;
        this.pageSize.set(newSize);

        if (this.searchTerm.trim() === '') {
            this.loadVehicleOwners(newPage, newSize);
        } else {
            this.searchVehicleOwner(this.searchTerm, newPage, newSize);
        }
    }
    //========== Carga ==========
    loadVehicleOwners(page: number = 1, limit: number = this.pageSize()): void {
        this.vehicleOwnerService.loadVehicleOwners({ page, limit }).subscribe(() => {
            if (page === 1) this.first.set(0);
        });
    }
    //========== Validaciones ==========
    validarIdentificacion(control: AbstractControl): ValidationErrors | null {
        const tipoIdentificacion = this.registerFormVehicleOwner?.get('identificationType')?.value;
        const value = control.value;
        if (!value || tipoIdentificacion === IdentificationType.passport) return null;

        const onlyNumbers = /^\d+$/.test(value);
        return onlyNumbers ? null : { onlyNumbers: true };
    }
    onKeyPressIdentificacion(event: KeyboardEvent) {
        const tipo = this.registerFormVehicleOwner.get('identificationType')?.value;
        if (tipo && [IdentificationType.ruc, IdentificationType.dni].includes(tipo)) {
            const inputChar = String.fromCharCode(event.charCode);
            if (!/[0-9]/.test(inputChar)) {
                this.showNumberOnlyWarning = true;
                setTimeout(() => (this.showNumberOnlyWarning = false), 2000);
                event.preventDefault();
            }
        }
    }
    checkFormValidity(): boolean {
        const required = ['identification', 'identificationType', 'name'];
        let isValid = true;
        const invalidFields = [];

        for (const field of required) {
            const control = this.registerFormVehicleOwner.get(field);
            if (control?.invalid) {
                control.markAsTouched();
                isValid = false;
                invalidFields.push(field);
            }
        }

        const email = this.registerFormVehicleOwner.get('email');
        if (email?.invalid) {
            email.markAsTouched();
            isValid = false;
            invalidFields.push('email');
        }

        const phone = this.registerFormVehicleOwner.get('phone');
        if (phone?.invalid) {
            phone.markAsTouched();
            isValid = false;
            invalidFields.push('phone');
        }

        if (!isValid) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: `Corrija: ${invalidFields.join(', ')}`,
                life: 5000
            });
        }
        return isValid;
    }
    //========== Registro Y Ediccion ==========
    onSubmitVehicleOwner() {
        if (!this.checkFormValidity()) return;

        this.isSubmitted = true;
        const formValue = this.registerFormVehicleOwner.value;

        let data: any = {
            name: formValue.name,
            address: formValue.address || null,
            email: formValue.email || null,
            phone: formValue.phone || null
        };

        if (!this.editMode) {
            data = {
                ...data,
                identification: formValue.identification?.trim(),
                identificationType: formValue.identificationType
            };
        }

        const operation = this.editMode && this.vehicleOwnerId ? this.vehicleOwnerService.updateVehicleOwner(this.vehicleOwnerId, data) : this.vehicleOwnerService.registerVehicleOwner(data);

        operation.subscribe({
            next: () => {
                this.dialogVehicleOwner = false;
                this.registerFormVehicleOwner.reset();
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: this.editMode ? 'Propietario actualizado correctamente' : 'Propietario registrado correctamente',
                    life: 5000
                });
                this.editMode = false;
                this.vehicleOwnerId = null;
                this.loadVehicleOwners();
                this.isSubmitted = false;
            },
            error: () => {
                this.isSubmitted = false;
            }
        });
    }
    //========== Diálogos ==========
    openDialogVehicleOwner(owner?: VehicleOwnerResponse) {
        this.registerFormVehicleOwner.reset();
        this.editMode = !!owner;
        this.vehicleOwnerId = owner?.id || null;
        this.isSubmitted = false;

        this.habilitarControles(this.editMode);
        this.registerFormVehicleOwner.get('identification')?.disable();
        this.registerFormVehicleOwner.get('identificationType')?.disable();
        if (!this.editMode) this.registerFormVehicleOwner.get('identification')?.enable();

        if (owner) {
            const formData = {
                identificationType: owner.subject.identificationType,
                identification: owner.subject.identification.trim(),
                name: owner.subject.name,
                address: owner.subject.address,
                phone: owner.subject.phone,
                email: owner.subject.email || null
            };

            setTimeout(() => {
                this.registerFormVehicleOwner.patchValue(formData, { emitEvent: false });
            });
        }

        this.dialogVehicleOwner = true;
    }
    closeDialogVehicleOwner() {
        this.dialogVehicleOwner = false;
    }
    //========== Búsqueda ==========
    onSearchChange(): void {
        this.searchSubject.next(this.searchTerm);
    }
    searchVehicleOwner(term: string, page: number = 1, limit: number = this.pageSize()): void {
        this.vehicleOwnerService.searchVehicleOwner(term, page, limit).subscribe(() => {
            if (page === 1) this.first.set(0);
        });
    }
    buscarIdentificacion() {
        const identification = this.registerFormVehicleOwner.get('identification')?.value;
        if (!identification) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Advertencia',
                detail: 'Por favor ingrese un número de identificación',
                life: 5000
            });
            return;
        }

        this.vehicleOwnerService.searchByIdentification(identification).subscribe({
            next: (res) => {
                const data = res.data;
                if (res.statusCode === 200 && data) {
                    if (data.isRegistered && data.vehicleOwner?.isEnabled) {
                        this.messageService.add({
                            severity: 'info',
                            summary: 'Información',
                            detail: 'Ya está registrado como propietario de vehículo',
                            life: 5000
                        });
                        this.dialogVehicleOwner = false;
                    } else if (data.isRegistered && data.vehicleOwner && !data.vehicleOwner.isEnabled) {
                        this.confirmEnableVehicleOwner(data.vehicleOwner);
                    } else if (data.vehicleOwner) {
                        this.patchFormWithOwnerData(data);
                        this.messageService.add({
                            severity: 'info',
                            summary: 'Información',
                            detail: 'No está registrado como propietario, proceda a registrarlo',
                            life: 5000
                        });
                    } else {
                        this.messageService.add({
                            severity: 'info',
                            summary: 'Información',
                            detail: 'No se encontró un propietario. Puede registrar uno nuevo.',
                            life: 5000
                        });
                        this.habilitarControles(true);
                    }
                    this.editMode = false;
                    this.vehicleOwnerId = null;
                } else {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Respuesta inesperada del servidor',
                        life: 5000
                    });
                    this.habilitarControles(true);
                }
            },
            error: () => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Ocurrió un error al buscar el propietario',
                    life: 5000
                });
            }
        });
    }
    //========== Habilitar y Desabilitar Propietario ==========
    confirmDisableVehicleOwner(owner: VehicleOwnerResponse): void {
        this.vehicleOwnerToDisable = owner;
        this.dialogDisableVehicleOwner = true;
    }
    disableVehicleOwner(): void {
        if (!this.vehicleOwnerToDisable?.id) return;
        this.isDisabling.set(true);
        this.vehicleOwnerService.disableVehicleOwner(this.vehicleOwnerToDisable.id).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Deshabilitado correctamente', life: 5000 });
                this.dialogDisableVehicleOwner = false;
                this.loadVehicleOwners();
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo deshabilitar', life: 5000 });
            },
            complete: () => {
                this.isDisabling.set(false);
                this.vehicleOwnerToDisable = null;
            }
        });
    }
    confirmEnableVehicleOwner(owner: VehicleOwnerResponse): void {
        this.vehicleOwnerToEnable = owner;
        this.dialogEnableVehicleOwner = true;
    }
    enableVehicleOwner(): void {
        if (!this.vehicleOwnerToEnable?.id) return;
        this.vehicleOwnerService.enableVehicleOwner(this.vehicleOwnerToEnable.id).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Habilitado correctamente', life: 5000 });
                this.dialogEnableVehicleOwner = false;
                this.dialogVehicleOwner = false;
                this.loadVehicleOwners();
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo habilitar', life: 5000 });
            }
        });
    }
    confirmDeleteVehicleOwner(owner: VehicleOwnerResponse): void {
        this.vehicleOwnerToDelete = owner;
        this.dialogDeleteVehicleOwner = true;
    }
    deleteVehicleOwner(): void {
        if (!this.vehicleOwnerToDelete) return;
        this.isDeleting = true;

        this.vehicleOwnerService.deleteCompany(this.vehicleOwnerToDelete.id).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Eliminado correctamente', life: 5000 });
                if (this.searchTerm.trim() === '') {
                    this.loadVehicleOwners(this.pagination().currentPage, this.pageSize());
                } else {
                    this.searchVehicleOwner(this.searchTerm, this.pagination().currentPage, this.pageSize());
                }
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar', life: 5000 });
            },
            complete: () => {
                this.dialogDeleteVehicleOwner = false;
                this.isDeleting = false;
                this.vehicleOwnerToDelete = null;
            }
        });
    }
    //========== Utilidades ==========
    limpiarIdentificacion() {
        this.registerFormVehicleOwner.reset();
        this.habilitarControles(false);
        this.registerFormVehicleOwner.get('identification')?.enable();
    }
    patchFormWithOwnerData(data: any) {
        const subject = data.vehicleOwner?.subject;
        if (subject) {
            this.registerFormVehicleOwner.patchValue(
                {
                    identificationType: subject.identificationType,
                    identification: subject.identification?.trim(),
                    name: subject.name,
                    address: subject.address,
                    phone: subject.phone,
                    email: subject.email || null
                },
                { emitEvent: false }
            );
            this.habilitarControles(true);
            this.editMode = true;
        } else {
            this.habilitarControles(true);
            this.editMode = false;
            this.vehicleOwnerId = null;
        }
    }
    habilitarControles(estado: boolean) {
        const action = estado ? 'enable' : 'disable';
        ['identification', 'identificationType', 'name', 'address', 'phone', 'email'].forEach((field) => {
            this.registerFormVehicleOwner.get(field)?.[action]();
        });
    }
}
