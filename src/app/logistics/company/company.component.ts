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
import { RouteService } from '../../pages/service/route.service';
import { ClientRateResponse, CreateRateClientData, RateClientData, RouteResponse, UpdateRateClientData } from '../../pages/models/routess.model';
import { fakeAsync } from '@angular/core/testing';

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
    formRoute: FormGroup;

    // Estados reactivos
    pageSize = signal(5);
    first = signal(0);
    isDisabling = signal(false);
    isDeleting = signal(false);

    // Flags y controles de UI
    showNumberOnlyWarning = false;
    isSubmitted = true;
    hasSearchedIdentification = false;
    editMode = false;

    // Diálogos
    dialogCompany = false;
    dialogDisableCompany = false;
    dialogEnableCompany = false;
    dialogRatesClient = false;
    dialogDeleteRate = false;
    dialogRoutes = signal(false);

    // Selecciones actuales
    selectedType: string | undefined;
    selectedCompany?: CompanyResponse;
    companyToDisable: CompanyResponse | null = null;
    companyToEnable: CompanyResponse | null = null;
    rateToDelete: ClientRateResponse | null = null;
    selectedRate?: ClientRateResponse;
    companyId: string | null = null;
    selectedProvinceOriginId = signal<string | null>(null);
    selectedProvinceDestinId = signal<string | null>(null);
    rateId: string | null = null;
    selectedRoute?: RouteResponse;
    invalidRateComparison = signal(false);

    // Datos y servicios
    private companyService = inject(CompanyService);
    private routeService = inject(RouteService);
    private baseHttpService = inject(BaseHttpService);
    routes = this.routeService.routesList;
    provinces = this.routeService.provinceList;
    originCities = this.routeService.originCityList;
    destinationCities = this.routeService.destinationCitiesList;
    searchTerm = '';
    menuItems: MenuItem[] = [];
    menuItemsRate: MenuItem[] = [];
    companies = this.companyService.companiesList;
    isLoading = this.companyService.isLoading;
    isloadingRoutes = this.routeService.isLoading;
    pagination = this.companyService.paginationData;
    referentialRateText: string = '';
    searchOriginTerm = signal('');
    searchDestinationTerm = signal('');

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
    private searchOriginSubject = new Subject<string>();
    private searchDestinationSubject = new Subject<string>();

    // ViewChild
    @ViewChild('menu') menu!: Menu;
    @ViewChild('menuRate') menuRate!: Menu;
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
        this.formRoute = this.fb.group({
            id: [''],
            originProvince: [null, Validators.required],
            distanceInKm: [null, [Validators.required, Validators.min(1)]],
            rate: [null, [Validators.min(0)]],
            originId: [{ value: '', disabled: true }, Validators.required],
            destinationId: [{ value: '', disabled: true }, Validators.required],
            destinationProvince: [null, Validators.required]
        });

        // Mostrar errores globales
        effect(() => {
            const companyError = this.companyService.hasError();
            const routeError = this.routeService.hasError();

            const error = companyError || routeError;
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

        this.searchOriginSubject.pipe(takeUntil(this.destroy$), debounceTime(800), distinctUntilChanged()).subscribe((term) => {
            const trimmedOrigin = term.trim();
            const trimmedDestination = this.searchDestinationTerm().trim();

            this.searchOriginTerm.set(trimmedOrigin);

            if (trimmedOrigin === '' && trimmedDestination === '') {
                this.loadClientRates();
            } else {
                this.searchClientRates();
            }
        });

        this.searchDestinationSubject.pipe(takeUntil(this.destroy$), debounceTime(800), distinctUntilChanged()).subscribe((term) => {
            const trimmedDestination = term.trim();
            const trimmedOrigin = this.searchOriginTerm().trim();

            this.searchDestinationTerm.set(trimmedDestination);

            if (trimmedDestination === '' && trimmedOrigin === '') {
                this.loadClientRates();
            } else {
                this.searchClientRates();
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
            },
            {
                label: 'Tarifas',
                icon: 'pi pi-money-bill',
                command: () => this.selectedCompany && this.openDialogRatesClient()
            }
        ];
    }

    initMenuItemsRate(): void {
        this.menuItemsRate = [
            {
                label: 'Eliminar',
                icon: 'pi pi-trash',
                command: () => {
                    if (this.selectedRate) {
                        this.confirmDeleteRates(this.selectedRate);
                    }
                }
            },
            {
                label: 'Editar',
                icon: 'pi pi-pencil',
                command: () => {
                    if (this.selectedRate) {
                        this.openDialogRoutes(this.selectedRate);
                    }
                }
            }
        ];
    }

    // -------------------- Acciones con el menú --------------------

    toggleMenu(event: Event, company: CompanyResponse): void {
        this.selectedCompany = company;
        this.menu.toggle(event);
    }

    toggleMenuRate(event: Event, rate: ClientRateResponse): void {
        this.selectedRate = rate;
        this.menuRate.toggle(event);
    }

    selectCompany(company: CompanyResponse): void {
        this.selectedCompany = company;
        console.log('Compañía seleccionada:', company.id);
    }

    selectRate(rate: ClientRateResponse): void {
        this.selectedRate = rate;
        console.log('route selecionada:', rate.id);
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

    loadAllProvinces(): void {
        this.routeService.loadProvinces().subscribe();
    }

    onProvinceOriginChange(event: { value: string }): void {
        const provinceId = event.value;
        this.selectedProvinceOriginId.set(provinceId);

        if (provinceId) {
            this.formRoute.get('originId')?.enable();
            const selectedOriginProvince = this.routeService.provinceList().find((p) => p.id === provinceId);
            const provinceName = selectedOriginProvince?.id || '';
            this.loadCitiesForProvinceOrigin(provinceName);
        } else {
            this.formRoute.get('originId')?.disable();
            this.formRoute.get('originId')?.setValue(null);
            this.routeService.clearCitiesOrigin();
        }
    }

    onProvinceDestinChange(event: { value: string }): void {
        const provinceId = event.value;
        this.selectedProvinceDestinId.set(provinceId);

        if (provinceId) {
            this.formRoute.get('destinationId')?.enable();
            const selectedDestinProvince = this.routeService.provinceList().find((p) => p.id === provinceId);
            const provinceName = selectedDestinProvince?.id || '';
            this.loadCitiesForProvinceDestin(provinceName);
        } else {
            this.formRoute.get('destinationId')?.disable();
            this.formRoute.get('destinationId')?.setValue(null);
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

    // ====================Tarifas de clientes====================
    openDialogRatesClient(): void {
        this.routeService.resetRoutes();
        this.initMenuItemsRate();
        if (this.selectedCompany) {
            this.dialogRatesClient = true;
            this.loadClientRates();
        }
    }

    loadClientRates() {
        this.routeService.getRoutesClientRates(1, 10, '', '', this.selectedCompany?.id).subscribe();
    }

    private searchClientRates(): void {
        const page = 1;
        const size = this.pageSize();

        if (this.searchOriginTerm().trim() === '' && this.searchDestinationTerm().trim() === '') {
            this.loadClientRates();
        } else {
            this.routeService.getRoutesClientRates(page, size, this.searchOriginTerm().trim() || undefined, this.searchDestinationTerm().trim() || undefined, this.selectedCompany?.id).subscribe();
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

    closeDialogRatesClient(): void {
        this.dialogRatesClient = false;
        this.routeService.resetRoutes();
    }

    //=====================Eliminar Tarifas====================
    confirmDeleteRates(rate: ClientRateResponse): void {
        console.log('Datos recibidos:', rate);
        this.rateToDelete = rate;
        this.dialogDeleteRate = true;
    }
    deleteRate(): void {
        if (!this.rateToDelete) return;
        this.isDeleting = signal(true);

        this.routeService.deleteRouteClientRate(this.rateToDelete.id).subscribe({
            next: (response) => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: 'Tarifa eliminada correctamente',
                    life: 5000
                });
                this.isDeleting = signal(false);
                this.dialogDeleteRate = false;
                this.routeService.getRoutesClientRates(1, 10, '', '', this.selectedCompany?.id).subscribe();
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

    //=======================registrar nueva tarifa===============================ç
    openDialogRoutes(rate?: ClientRateResponse) {
        this.formRoute.reset();
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
                this.formRoute.patchValue(formData, { emitEvent: false });
                this.formRoute.get('originId')?.disable();
                this.formRoute.get('destinationId')?.disable();
                this.formRoute.get('originProvince')?.disable();
                this.formRoute.get('destinationProvince')?.disable();
                this.formRoute.get('distanceInKm')?.disable();
            });
        } else {
            this.formRoute.get('originId')?.disable();
            this.formRoute.get('destinationId')?.disable();
            this.formRoute.get('originProvince')?.enable();
            this.formRoute.get('destinationProvince')?.enable();
            this.formRoute.get('distanceInKm')?.enable();
        }
        this.loadAllProvinces();
        this.dialogRoutes.set(true);
    }
    closeDialogRoutes(): void {
        this.dialogRoutes.set(false);
        this.formRoute.reset();
    }

    onSubmitRoutes() {
        if (!this.checkFormValidities()) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Por favor, complete todos los campos requeridos correctamente.',
                life: 3000
            });
            return;
        }
        this.isSubmitted = true;
        const formValue = this.formRoute.getRawValue();

        let createData: CreateRateClientData = {
            rate: formValue.rate,
            originId: formValue.originId,
            destinationId: formValue.destinationId,
            clientId: this.selectedCompany?.id ?? '',
            distanceInKm: formValue.distanceInKm
        };

        let updateDate: UpdateRateClientData = {
            rate: formValue.rate
        };

        const operation = this.editMode && this.rateId ? this.routeService.updateRouteClientRate(this.rateId, updateDate) : this.routeService.registerRouteClientRate(createData);

        operation.subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: this.editMode ? 'La tarifa ha sido actualizada correctamente.' : 'La ruta ha sido creada correctamente',
                    life: 3000
                });
                this.closeDialogRoutes();
                this.formRoute.reset();
                this.isSubmitted = false;
                this.routeService.getRoutesClientRates(1, 10, '', '', this.selectedCompany?.id).subscribe();
            },
            error: (error) => {
                console.error('Error:', error);

                this.isSubmitted = false;
            }
        });
    }

    onDestinationCityChange(): void {
        const originId = this.formRoute.get('originId')?.value;
        const destinationId = this.formRoute.get('destinationId')?.value;

        if (originId && destinationId) {
            this.routeService.findRouteByCities(originId, destinationId).subscribe({
                next: (response) => {
                    if (response.data) {
                        this.messageService.add({
                            severity: 'info',
                            summary: 'Aviso',
                            detail: 'Ya existe la ruta, ingrese la tarifa de viaje, por favor',
                            life: 3000
                        });

                        this.formRoute.patchValue({
                            distanceInKm: response.data.distanceInKm
                        });
                        this.formRoute.get('distanceInKm')?.disable();

                        const rateClient = response.data.clientRate;
                        this.referentialRateText = rateClient ? `${rateClient} (referencial)` : '';
                    } else {
                        this.formRoute.get('distanceInKm')?.enable();
                        this.formRoute.patchValue({
                            distanceInKm: null,
                            rate: null
                        });
                        this.referentialRateText = '';
                    }
                },
                error: (err) => {
                    console.error('Error al buscar ruta:', err);
                    // Reseteamos los campos en caso de error
                    this.formRoute.patchValue({
                        distanceInKm: null,
                        clientRate: null,
                        carrierRate: null
                    });
                }
            });
        }
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

    checkFormValidities(): boolean {
        const required = ['distanceInKm', 'originId', 'destinationId'];
        let isValid = true;
        const invalidFields = [];

        for (const field of required) {
            const control = this.formRoute.get(field);
            if (control?.invalid) {
                control.markAsTouched();
                isValid = false;
                invalidFields.push(field);
            }
        }

        const clientRate = this.formRoute.get('clientRate');
        if (clientRate?.invalid) {
            clientRate.markAsTouched();
            isValid = false;
            invalidFields.push('clientRate');
        }

        const carrierRate = this.formRoute.get('carrierRate');
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
        const clientRate = this.formRoute.get('clientRate')?.value;
        const carrierRate = this.formRoute.get('carrierRate')?.value;

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
