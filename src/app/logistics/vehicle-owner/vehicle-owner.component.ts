import { CommonModule } from '@angular/common';
import { Component, effect, inject, OnInit, signal, ViewChild } from '@angular/core';
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
import { IdentificationType } from '../../pages/models/company';
import { getSpanishPaginatorIntl } from '../../config/getSpanishPaginatorIntl';
import { VehicleOwnerResponse } from '../../pages/models/vehicle-owner';
import { Menu, MenuModule } from 'primeng/menu';

@Component({
    selector: 'app-vehicle-owner',
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
export class VehicleOwnerComponent implements OnInit {
    showNumberOnlyWarning = false;
    dialogVehicleOwner = false;
    registerFormVehicleOwner: FormGroup;

    @ViewChild(MatPaginator) paginator!: MatPaginator;

    private vehicleOwnerService = inject(VehicleOwnerService);
    private destroy$ = new Subject<void>();

    vehicleOwners = this.vehicleOwnerService.vehicleOwnersList;
    isLoading = this.vehicleOwnerService.isLoading;
    hasError = this.vehicleOwnerService.hasError;
    pagination = this.vehicleOwnerService.paginationData;
    pageSize = signal(5);

    editMode = false;
    vehicleOwnerId: string | null = null;

    isSubmitted = true;
    isDeleting = false;

    private searchSubject = new Subject<string>();
    searchTerm: string = '';

    dialogDeleteVehicleOwner: boolean = false;
    vehicleOwnerToDelete: VehicleOwnerResponse | null = null;

    //Para deshabiltar un propietario
    dialogDisableVehicleOwner: boolean = false;
    vehicleOwnerToDisable: VehicleOwnerResponse | null = null;
    isDisabling = signal(false);

    //Para haabiliraar un propietario
    dialogEnableVehicleOwner: boolean = false;
    vehicleOwnerToEnable: VehicleOwnerResponse | null = null;
    identificationTypes = this.vehicleOwnerService.getIdentificationTypes();

    menuItems:MenuItem[]=[];
    selectedVehicleOwner?:VehicleOwnerResponse;

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
        this.registerFormVehicleOwner.get('identificationType')?.valueChanges.subscribe((value) => {
            this.showNumberOnlyWarning = false;
        });

        this.searchSubject
            .pipe(
                takeUntil(this.destroy$),
                debounceTime(800),
                distinctUntilChanged()
            )
            .subscribe((term) => {
                if (term.trim() === '') {
                    this.loadVehicleOwners(1, this.pageSize());
                } else {
                    this.searchVehicleOwner(term, 1, this.pageSize());
                }
            });
    }

    ngOnInit(): void {
        this.loadVehicleOwners();
        this.initMenuItems();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadVehicleOwners(page: number = 1, limit: number = this.pageSize()): void {
        this.vehicleOwnerService.loadVehicleOwners({ page, limit }).subscribe(() => {
            if (this.paginator) {
                this.paginator.pageIndex = page - 1;
                this.paginator.pageSize = limit;
            }
        });
    }

    
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
    
        @ViewChild('menu') menu!: Menu;
    


    ngAfterViewInit(): void {
        this.paginator.page.subscribe((event) => {
            this.pageSize.set(event.pageSize);
            const newPage = event.pageSize !== this.pagination().pageSize ? 1 : event.pageIndex + 1;
            if (this.searchTerm.trim() === '') {
                this.loadVehicleOwners(newPage, event.pageSize);
            } else {
                this.searchVehicleOwner(this.searchTerm, newPage, event.pageSize);
            }
        });
    }

    validarIdentificacion(control: AbstractControl): ValidationErrors | null {
        const tipoIdentificacion = this.registerFormVehicleOwner?.get('identificationType')?.value;
        const value = control.value;

        if (!value) return null;

        if (tipoIdentificacion === IdentificationType.passport) {
            return null;
        }
        const onlyNumbers = /^\d+$/.test(value);
        return onlyNumbers ? null : { onlyNumbers: true };
    }

    onKeyPressIdentificacion(event: KeyboardEvent) {
        const identificationType = this.registerFormVehicleOwner.get('identificationType')?.value;

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

    onSubmitVehicleOwner() {
        if (!this.checkFormValidity()) {
            return;
        }
        this.isSubmitted = true;
        const formValue = this.registerFormVehicleOwner.value;

        // Datos comunes a ambas operaciones
        let vehicleOwnerData: any = {
            name: formValue.name,
            address: formValue.address || null,
            email: formValue.email || null,
            phone: formValue.phone || null
        };

        // Solo incluir identificación en registro
        if (!this.editMode) {
            vehicleOwnerData = {
                ...vehicleOwnerData,
                identification: formValue.identification?.trim(),
                identificationType: formValue.identificationType
            };
        }

        // No cerrar el diálogo aquí, solo al éxito
        const operation = this.editMode && this.vehicleOwnerId ? this.vehicleOwnerService.updateVehicleOwner(this.vehicleOwnerId, vehicleOwnerData) : this.vehicleOwnerService.registerVehicleOwner(vehicleOwnerData);

        operation.subscribe({
            next: () => {
                this.dialogVehicleOwner = false;
                this.registerFormVehicleOwner.reset();
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: this.editMode ? 'Propietario actualizado correctamente' : ' Propietario registrado correctamente',
                    life: 5000
                });
                this.editMode = false;
                this.vehicleOwnerId = null;
                this.loadVehicleOwners();
                this.isSubmitted = false;
            },

            error: (err) => {
                this.isSubmitted = false;
            }
        });
    }

    checkFormValidity(): boolean {
        const requiredFields = ['identification', 'identificationType', 'name'];
        let isValid = true;
        let invalidFields = [];

        requiredFields.forEach((field) => {
            const control = this.registerFormVehicleOwner.get(field);
            if (control && control.invalid) {
                control.markAsTouched();
                isValid = false;
                invalidFields.push(field);
            }
        });

        const emailControl = this.registerFormVehicleOwner.get('email');
        if (emailControl && emailControl.invalid) {
            emailControl.markAsTouched();
            isValid = false;
            invalidFields.push('email (formato inválido)');
        }

        const phoneControl = this.registerFormVehicleOwner.get('phone');
        if (phoneControl && phoneControl.invalid) {
            phoneControl.markAsTouched();
            isValid = false;
            invalidFields.push('teléfono (máx. 13 caracteres)');
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

    openDialogVehicleOwner(vehhicleOwner?: VehicleOwnerResponse) {
        this.registerFormVehicleOwner.reset();
        this.editMode = !!vehhicleOwner;
        this.vehicleOwnerId = vehhicleOwner?.id || null;
        this.isSubmitted = false;

        // Habilitar controles depende del modo
        this.habilitarControles(this.editMode);
        this.registerFormVehicleOwner.get('identification')?.disable();
        this.registerFormVehicleOwner.get('identificationType')?.disable();
        if (!this.editMode) {
            this.registerFormVehicleOwner.get('identification')?.enable();
        }

        if (vehhicleOwner) {
            const formData = {
                identificationType: vehhicleOwner.subject.identificationType,
                identification: vehhicleOwner.subject.identification.trim(),
                name: vehhicleOwner.subject.name,
                address: vehhicleOwner.subject.address,
                phone: vehhicleOwner.subject.phone,
                email: vehhicleOwner.subject.email || null
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
            next: (response) => {
                if (response.statusCode === 200 && response.data) {
                    if (response.data.isRegistered && response.data.vehicleOwner?.isEnabled) {
                        this.messageService.add({
                            severity: 'info',
                            summary: 'Información',
                            detail: 'Ya está registrado como propietario de vehículo',
                            life: 5000
                        });
                        this.dialogVehicleOwner = false;
                        // this.closeDialogVehicleOwner();
                    } else if (response.data.isRegistered && !response.data.vehicleOwner?.isEnabled) {
                        console.log("es la prueba");
                        this.confirmEnableVehicleOwner(response.data.vehicleOwner);
                    } else if (response.data.vehicleOwner) {
                        this.patchFormWithOwnerData(response.data);
                        this.messageService.add({
                            severity: 'info',
                            summary: 'Información',
                            detail: 'No está registrado como propietario, proceda a registrarlo',
                            life: 5000
                        });
                        this.habilitarControles(false);
                    } else {
                        this.messageService.add({
                            severity: 'info',
                            summary: 'Información',
                            detail: 'No se encontró un propietario con esta identificación. Puede registrar uno nuevo.',
                            life: 5000
                        });
                        this.habilitarControles(true);
                    }
                    // this.habilitarControles(true);
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
            error: (err) => {
                console.error('Error al buscar:', err);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Ocurrió un error al buscar el propietario',
                    life: 5000
                });
            }
        });
    }

    limpiarIdentificacion() {
        this.registerFormVehicleOwner.reset();
        this.habilitarControles(false);
        this.registerFormVehicleOwner.get('identification')?.enable();
    }

    confirmDisableVehicleOwner(vehicleOwner: VehicleOwnerResponse): void {
        this.vehicleOwnerToDisable = vehicleOwner;
        this.dialogDisableVehicleOwner = true;
    }

    disableVehicleOwner(): void {
        if (!this.vehicleOwnerToDisable?.id) return;
        this.isDisabling.set(true);
        this.vehicleOwnerService.disableVehicleOwner(this.vehicleOwnerToDisable.id).subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: 'Propietario deshabilitado correctamente',
                    life: 5000
                });
                this.dialogDisableVehicleOwner = false;
                this.loadVehicleOwners();
            },
            error: (err) => {
                console.error('Error al deshabilitar Propierario:', err);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudo deshabilitar al propietario',
                    life: 5000
                });
            },
            complete: () => {
                this.isDisabling.set(false);
                this.vehicleOwnerToDisable = null;
            }
        });
    }

    confirmEnableVehicleOwner(vehicleOwner: VehicleOwnerResponse): void {
        this.vehicleOwnerToEnable = vehicleOwner;
        this.dialogEnableVehicleOwner = true;
    }

    enableVehicleOwner(): void {
        if (!this.vehicleOwnerToEnable?.id) return;

        this.vehicleOwnerService.enableVehicleOwner(this.vehicleOwnerToEnable.id).subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: 'Propietario habilitado correctamente',
                    life: 5000
                });
                this.dialogEnableVehicleOwner = false;
                this.dialogVehicleOwner = false;
                this.loadVehicleOwners();
            },
            error: (err) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudo habilitar a este propietario',
                    life: 5000
                });
            }
        });
    }

    

    private patchFormWithOwnerData(data: any) {
        if (data.vehicleOwner?.subject) {
            const subject = data.vehicleOwner.subject;
            const formData = {
                identificationType: subject.identificationType,
                identification: subject.identification?.trim(),
                name: subject.name,
                address: subject.address,
                phone: subject.phone,
                email: subject.email || null
            };

            this.registerFormVehicleOwner.patchValue(formData, { emitEvent: false });
            this.habilitarControles(true); // Habilitar controles para edición
            this.editMode = true;
        } else {
            this.habilitarControles(true);
            this.editMode = false;
            this.vehicleOwnerId = null;
        }
    }

    habilitarControles(estado: boolean) {
        if (estado === true) {
            this.registerFormVehicleOwner.get('identification')?.enable();
            this.registerFormVehicleOwner.get('identificationType')?.enable();
            this.registerFormVehicleOwner.get('name')?.enable();
            this.registerFormVehicleOwner.get('address')?.enable();
            this.registerFormVehicleOwner.get('phone')?.enable();
            this.registerFormVehicleOwner.get('email')?.enable();
        } else {
            this.registerFormVehicleOwner.get('identification')?.disable();
            this.registerFormVehicleOwner.get('identificationType')?.disable();
            this.registerFormVehicleOwner.get('name')?.disable();
            this.registerFormVehicleOwner.get('address')?.disable();
            this.registerFormVehicleOwner.get('phone')?.disable();
            this.registerFormVehicleOwner.get('email')?.disable();
        }
    }

    onSearchChange(): void {
        // Resetear siempre a la primera página al cambiar el término de búsqueda
        this.searchSubject.next(this.searchTerm);
    }

    searchVehicleOwner(term: string, page: number = 1, limit: number = this.pageSize(), type?: string): void {
        this.vehicleOwnerService.searchVehicleOwner(term, page, limit).subscribe(() => {
            if (this.paginator) {
                if (page === 1) {
                    this.paginator.pageIndex = 0;
                }
                if (limit !== this.paginator.pageSize) {
                    this.paginator.pageSize = limit;
                }
            }
        });
    }

    confirmDeleteVehicleOwner(vehicleOwner: VehicleOwnerResponse): void {
        this.vehicleOwnerToDelete = vehicleOwner;
        this.dialogDeleteVehicleOwner = true;
    }

    deleteVehicleOwner(): void {
        if (!this.vehicleOwnerToDelete) return;
        this.isDeleting = true;

        this.vehicleOwnerService.deleteCompany(this.vehicleOwnerToDelete.id).subscribe({
            next: (response) => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: 'Propietario eliminado correctamente',
                    life: 5000
                });
                this.isDeleting = false;

                // Recargar la lista de compañías
                if (this.searchTerm.trim() === '') {
                    this.loadVehicleOwners(this.pagination().currentPage, this.pageSize());
                } else {
                    this.searchVehicleOwner(this.searchTerm, this.pagination().currentPage, this.pageSize());
                }
            },
            error: (err) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudo eliminar al Propietario',
                    life: 5000
                });
            },
            complete: () => {
                this.dialogDeleteVehicleOwner = false;
                this.isDeleting = false;
                this.vehicleOwnerToDelete = null;
            }
        });
    }
}
