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
import { RouteService } from '../../pages/service/route.service';
import { CreateRateCarrierData, RateCarrierResponse, RouteResponse, UpdateRateCarrierData } from '../../pages/models/routess.model';

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
    formCarrierRate: FormGroup;

    //Estados reactivos
    pageSize = signal(5);
    first = signal(0);
    isDisabling = signal(false);
    isDeleting = signal(false);

    //Flags y controles de UI
    showNumberOnlyWarning = false;
    isSubmitted = true;
    editMode = false;

    //Diálogos
    dialogVehicleOwner: boolean = false;
    dialogDeleteVehicleOwner: boolean = false;
    dialogDisableVehicleOwner: boolean = false;
    dialogEnableVehicleOwner: boolean = false;
    dialogRatesCarrier = signal(false);
    dialogDeleteRate = signal(false);
    dialogRoutes = signal(false);

    //Selecciones actuales
    selectedVehicleOwner?: VehicleOwnerResponse;
    vehicleOwnerToEnable: VehicleOwnerResponse | null = null;
    vehicleOwnerToDisable: VehicleOwnerResponse | null = null;
    vehicleOwnerToDelete: VehicleOwnerResponse | null = null;
    rateToDelete: RateCarrierResponse | null = null;
    selectedRate?: RateCarrierResponse;
    vehicleOwnerId: string | null = null;

    selectedProvinceOriginId = signal<string | null>(null);
    selectedProvinceDestinId = signal<string | null>(null);
    rateId: string | null = null;
    selectedRoute?: RouteResponse;
    invalidRateComparison = signal(false);

    //Dattos y servicios
    private vehicleOwnerService = inject(VehicleOwnerService);
    private routeService = inject(RouteService);
    vehicleOwners = this.vehicleOwnerService.vehicleOwnersList;
    isLoading = this.vehicleOwnerService.isLoading;
    hasError = this.vehicleOwnerService.hasError;
    pagination = this.vehicleOwnerService.paginationData;
    searchTerm: string = '';
    menuItems: MenuItem[] = [];
    menuItemsRate: MenuItem[] = [];

    routes = this.routeService.routesList;
    provinces = this.routeService.provinceList;
    originCities = this.routeService.originCityList;
    destinationCities = this.routeService.destinationCitiesList;
    isLoadingRoutes = this.routeService.isLoading;
    referentialRateText: string = '';
    searchOriginTerm = signal('');
    searchDestinationTerm = signal('');

    //Tipos
    identificationTypes = this.vehicleOwnerService.getIdentificationTypes();

    //RxJS
    private destroy$ = new Subject<void>();
    private searchSubject = new Subject<string>();
    private searchOriginSubject = new Subject<string>();
    private searchDestinationSubject = new Subject<string>();

    //ViewChild
    @ViewChild('paginator') paginator!: Paginator;
    @ViewChild('menu') menu!: Menu;
    @ViewChild('menuRate') menuRate!: Menu;

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

        this.formCarrierRate = this.fb.group({
            id: [''],
            originProvince: [null, Validators.required],
            distanceInKm: [null, [Validators.required, Validators.min(1)]],
            rate: [null, [Validators.min(0)]],
            originId: [{ value: '', disabled: true }, Validators.required],
            destinationId: [{ value: '', disabled: true }, Validators.required],
            destinationProvince: [null, Validators.required]
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

        this.searchOriginSubject.pipe(takeUntil(this.destroy$), debounceTime(800), distinctUntilChanged()).subscribe((term) => {
            const trimmedOrigin = term.trim();
            const trimmedDestination = this.searchDestinationTerm().trim();

            this.searchOriginTerm.set(trimmedOrigin);

            if (trimmedOrigin === '' && trimmedDestination === '') {
                this.loadCarrierRates();
            } else {
                this.searchCarrierRates();
            }
        });

        this.searchDestinationSubject.pipe(takeUntil(this.destroy$), debounceTime(800), distinctUntilChanged()).subscribe((term) => {
            const trimmedDestination = term.trim();
            const trimmedOrigin = this.searchOriginTerm().trim();

            this.searchDestinationTerm.set(trimmedDestination);

            if (trimmedDestination === '' && trimmedOrigin === '') {
                this.loadCarrierRates();
            } else {
                this.searchCarrierRates();
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
            },
            {
                label: 'Tarifas',
                icon: 'pi pi-money-bill',
                command: () => this.selectedVehicleOwner && this.openDialogCarrierRates()
            }
        ];
    }

    initMenuItemsRate(): void {
        this.menuItemsRate = [
            {
                label: 'Editar',
                icon: 'pi pi-pencil',
                command: () => {
                    if (this.selectedRate) {
                        this.openDialogRoutes(this.selectedRate);
                    }
                }
            },
            {
                label: 'Eliminar',
                icon: 'pi pi-trash',
                command: () => {
                    if (this.selectedRate) {
                        this.confirmDeleteRates(this.selectedRate);
                    }
                }
            }
        ];
    }

    toggleMenu(event: Event, vehicleOwner: VehicleOwnerResponse): void {
        this.selectedVehicleOwner = vehicleOwner;
        this.menu.toggle(event);
    }

    toggleMenuRate(event: Event, rate: RateCarrierResponse): void {
        this.selectedRate = rate;
        this.menuRate.toggle(event);
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

    loadAllProvinces(): void {
        this.routeService.loadProvinces().subscribe();
    }

    onProvinceOriginChange(event: { value: string }): void {
        const provinceId = event.value;
        this.selectedProvinceOriginId.set(provinceId);

        if (provinceId) {
            this.formCarrierRate.get('originId')?.enable();
            const selectedOriginProvince = this.routeService.provinceList().find((p) => p.id === provinceId);
            const provinceName = selectedOriginProvince?.id || '';
            this.loadCitiesForProvinceOrigin(provinceName);
        } else {
            this.formCarrierRate.get('originId')?.disable();
            this.formCarrierRate.get('originId')?.setValue(null);
            this.routeService.clearCitiesOrigin();
        }
    }

    onProvinceDestinChange(event: { value: string }): void {
        const provinceId = event.value;
        this.selectedProvinceDestinId.set(provinceId);

        if (provinceId) {
            this.formCarrierRate.get('destinationId')?.enable();
            const selectedDestinProvince = this.routeService.provinceList().find((p) => p.id === provinceId);
            const provinceName = selectedDestinProvince?.id || '';
            this.loadCitiesForProvinceDestin(provinceName);
        } else {
            this.formCarrierRate.get('destinationId')?.disable();
            this.formCarrierRate.get('destinationId')?.setValue(null);
            this.routeService.clearCitiesDestination();
        }
    }

    loadCitiesForProvinceOrigin(term: string, page: number = 1, limit: number = 30): void {
        this.routeService.loadCitiesForProvinceOrigin(term, { page, limit }).subscribe(() => {
            if (this.paginator) {
                if (page === 1) this.first.set(0);
            }
        });
    }

    loadCitiesForProvinceDestin(term: string, page: number = 1, limit: number = 30): void {
        this.routeService.loadCitiesForProvinceDestination(term, { page, limit }).subscribe(() => {
            if (this.paginator) {
                if (page === 1) this.first.set(0);
            }
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
        this.isDeleting.set(true);

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
                this.isDeleting.set(false);
                this.vehicleOwnerToDelete = null;
            }
        });
    }

    //==================Tarifas del transportista=======================
    openDialogCarrierRates(): void {
        this.routeService.resetRoutes();
        this.initMenuItemsRate();
        if (this.selectedVehicleOwner) {
            this.dialogRatesCarrier.set(true);
            this.loadCarrierRates();
        }
    }

    loadCarrierRates() {
        this.routeService.getRoutesCarrierRates(1, 10, '', '', this.selectedVehicleOwner?.id).subscribe();
    }

    private searchCarrierRates(): void {
        const page = 1;
        const size = this.pageSize();

        if (this.searchOriginTerm().trim() === '' && this.searchDestinationTerm().trim() === '') {
            this.loadCarrierRates();
        } else {
            this.routeService.getRoutesCarrierRates(page, size, this.searchOriginTerm().trim() || undefined, this.searchDestinationTerm().trim() || undefined, this.selectedVehicleOwner?.id).subscribe();
        }
    }

    onSearchOriginChange(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        this.searchOriginSubject.next(value);
    }

    onSearchDestinationChange(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        this.searchDestinationSubject.next(value);
    }

    clearSearchOrigin(): void {
        this.searchOriginTerm.set('');
        this.searchOriginSubject.next('');
    }

    clearSearchDestination(): void {
        this.searchDestinationTerm.set('');
        this.searchDestinationSubject.next('');
    }

    //================PARA REGISTRAR UNA NUVA TARIFA=======================
    openDialogRoutes(rate?: RateCarrierResponse) {
        this.formCarrierRate.reset();
        this.selectedProvinceDestinId.set(null);
        this.selectedProvinceOriginId.set(null);
        this.routeService.clearCitiesOrigin();
        this.routeService.clearCitiesDestination();
        (this.editMode = !!rate), (this.rateId = rate ? rate.id : null);
        this.isSubmitted = false;

        if (rate) {
            const formData = {
                id: rate.id,
                distanceInKm: rate.route.distanceInKm,
                rate: rate.rate,
                originId: rate.route.originId,
                destinationId: rate.route.destinationId,
                originProvince: rate.route.origin.provinceId,
                destinationProvince: rate.route.destination.provinceId
            };

            this.loadCitiesForProvinceOrigin(rate.route.origin.provinceId);
            this.loadCitiesForProvinceDestin(rate.route.destination.provinceId);

            setTimeout(() => {
                this.formCarrierRate.patchValue(formData, { emitEvent: false });
                this.formCarrierRate.get('originId')?.disable();
                this.formCarrierRate.get('destinationId')?.disable();
                this.formCarrierRate.get('originProvince')?.disable();
                this.formCarrierRate.get('destinationProvince')?.disable();
                this.formCarrierRate.get('distanceInKm')?.disable();
            });
        } else {
            this.formCarrierRate.get('originId')?.disable();
            this.formCarrierRate.get('destinationId')?.disable();
            this.formCarrierRate.get('originProvince')?.enable();
            this.formCarrierRate.get('destinationProvince')?.enable();
            this.formCarrierRate.get('distanceInKm')?.enable();
        }
        this.loadAllProvinces();
        this.dialogRoutes.set(true);
    }

    closeDialogRoutes() {
        this.dialogRoutes.set(false);
        this.formCarrierRate.reset();
    }

    onSubmitRoutes() {
        if (!this.checkFormValidities()) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Por favor, complete los campos requeridos',
                life: 3000
            });
        }
        this.isSubmitted = true;
        const formValue = this.formCarrierRate.getRawValue();

        let createData: CreateRateCarrierData = {
            rate: formValue.rate,
            originId: formValue.originId,
            destinationId: formValue.destinationId,
            carrierId: this.selectedVehicleOwner?.id ?? '',
            distanceInKm: formValue.distanceInKm
        };

        let updateDate: UpdateRateCarrierData = {
            rate: formValue.rate
        };

        const operation = this.editMode && this.rateId ? this.routeService.updateRouteCarrierRate(this.rateId, updateDate) : this.routeService.registerRouteCarrierRate(createData);
        operation.subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: this.editMode ? 'La tarifa ha sido actualizada correctamente' : 'La ruta ha sido creada correctamente',
                    life: 3000
                });
                this.closeDialogRoutes();
                this.formCarrierRate.reset();
                this.isSubmitted = false;
                this.loadCarrierRates();
            },
            error: (error) => {
                console.error('Error:', error);
                this.isSubmitted = false;
            }
        });
    }

    validityRoutes(): void {
        const originId = this.formCarrierRate.get('originId')?.value;
        const destinationId = this.formCarrierRate.get('destinationId')?.value;

        if (originId && destinationId) {
            this.routeService.findRouteByCities(originId, destinationId).subscribe({
                next: (response) => {
                    if (response.data) {
                        this.formCarrierRate.patchValue({
                            distanceInKm: response.data.distanceInKm
                        });
                        this.formCarrierRate.get('distanceInKm')?.disable();

                        const rateClient = response.data.clientRate;
                        this.referentialRateText = rateClient ? `${rateClient} (referencial)` : '';
                    } else {
                        this.messageService.add({
                            severity: 'info',
                            summary: 'Aviso',
                            detail: 'No existe la ruta, ingrese la distancia y la tarifa de viaje, por favor',
                            life: 3000
                        });
                        this.formCarrierRate.get('distanceInKm')?.enable();
                        this.formCarrierRate.patchValue({
                            distanceInKm: null,
                            rate: null
                        });
                        this.referentialRateText = '';
                    }
                },
                error: (err) => {
                    console.error('Error al buscar ruta:', err);
                    // Reseteamos los campos en caso de error
                    this.formCarrierRate.patchValue({
                        distanceInKm: null,
                        clientRate: null,
                        carrierRate: null
                    });
                }
            });
        }
    }

    //==============Para eliminar una tarifa============================
    confirmDeleteRates(rate: RateCarrierResponse): void {
        console.log('Datos recibidos:', rate);
        this.rateToDelete = rate;
        this.dialogDeleteRate.set(true);
    }
    deleteRate(): void {
        if (!this.rateToDelete) return;
        this.isDeleting.set(true);

        this.routeService.deleteRouteCarriertRate(this.rateToDelete.id).subscribe({
            next: (response) => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: 'Tarifa eliminada correctamente',
                    life: 5000
                });
                this.isDeleting = signal(false);
                this.dialogDeleteRate.set(false);
                this.loadCarrierRates();
            },
            error: (err) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudo eliminar la tarifa',
                    life: 5000
                });
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

    checkFormValidities(): boolean {
        const required = ['distanceInKm', 'originId', 'destinationId'];
        let isValid = true;
        const invalidFields = [];

        for (const field of required) {
            const control = this.formCarrierRate.get(field);
            if (control?.invalid) {
                control.markAsTouched();
                isValid = false;
                invalidFields.push(field);
            }
        }

        const clientRate = this.formCarrierRate.get('clientRate');
        if (clientRate?.invalid) {
            clientRate.markAsTouched();
            isValid = false;
            invalidFields.push('clientRate');
        }

        const carrierRate = this.formCarrierRate.get('carrierRate');
        if (carrierRate?.invalid) {
            carrierRate.markAsTouched();
            isValid = false;
            invalidFields.push('carrierRate');
        }

        if (this.invalidRateComparison()) {
            isValid = false;
        }

        return isValid;
    }

    private validateRateComparison(formGroup: FormGroup): ValidationErrors | null {
        const clientRate = formGroup.get('clientRate')?.value;
        const carrierRate = formGroup.get('carrierRate')?.value;

        if (clientRate !== null && carrierRate !== null && typeof clientRate === 'number' && typeof carrierRate === 'number') {
            return carrierRate > clientRate ? { invalidRateComparison: true } : null;
        }
        return null;
    }

    private checkRateComparison(): void {
        const clientRate = this.formCarrierRate.get('clientRate')?.value;
        const carrierRate = this.formCarrierRate.get('carrierRate')?.value;

        if (clientRate !== null && carrierRate !== null && !isNaN(clientRate) && !isNaN(carrierRate)) {
            this.invalidRateComparison.set(Number(carrierRate) > Number(clientRate));
        } else {
            this.invalidRateComparison.set(false);
        }
    }

    allowOnlyDecimal(event: KeyboardEvent): void {
        const inputChar = String.fromCharCode(event.charCode);

        // Solo permite números y el punto decimal (pero no múltiples puntos)
        const allowedRegex = /^[0-9.]$/;
        if (!allowedRegex.test(inputChar)) {
            event.preventDefault();
            return;
        }

        const input = event.target as HTMLInputElement;
        const currentValue = input.value;

        // Evita múltiples puntos
        if (inputChar === '.' && currentValue.includes('.')) {
            event.preventDefault();
        }
    }
}
