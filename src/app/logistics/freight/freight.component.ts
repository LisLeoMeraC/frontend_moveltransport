import { Component, inject, OnInit, OnDestroy, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { CalendarModule } from 'primeng/calendar';
import { StepperModule } from 'primeng/stepper';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { Paginator, PaginatorModule } from 'primeng/paginator';
import { MenuModule } from 'primeng/menu';
import { MenuItem, MessageService } from 'primeng/api';
import { Menu } from 'primeng/menu';
import { FreightService } from '../../pages/service/freight.service';
import { FreightResponse, FreightData } from '../../pages/models/freight.model';
import { CompanyService } from '../../pages/service/company.service';
import { ApiResponse } from '../../pages/models/shared.model';
import { CompanyResponse } from '../../pages/models/company.model';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { RouteService } from '../../pages/service/route.service';
import { DepotService } from '../../pages/service/depot.service';

@Component({
    selector: 'app-freight',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        ButtonModule,
        DialogModule,
        DropdownModule,
        IconFieldModule,
        InputIconModule,
        InputTextModule,
        CalendarModule,
        StepperModule,
        TableModule,
        ToastModule,
        ToolbarModule,
        PaginatorModule,
        MenuModule,
        TagModule
    ],
    templateUrl: './freight.component.html',
    styleUrl: './freight.component.scss',
    providers: [MessageService]
})
export class FreightComponent implements OnInit, OnDestroy {
    // ==================== SERVICIOS ====================
    freightService = inject(FreightService);
    private companyService = inject(CompanyService);
    private depotService = inject(DepotService);
    private routeService = inject(RouteService);
    provinces = this.routeService.provinceList;
    originCities = this.routeService.originCityList;
    destinationCities = this.routeService.destinationCitiesList;
    depots = this.depotService.depotList;
    isLoading = this.routeService.isLoading;

    // ==================== FORMULARIOS ====================
    freightForm: FormGroup;

    // ==================== ESTADOS DE UI ====================
    pageSize = signal(5);
    first = signal(1);
    currentStep = 1;
    searchTerm = '';
    searchOriginTerm = signal('');
    searchDestinationTerm = signal('');

    // ==================== FILTROS ====================
    filters = signal<{
        serialReference: string;
        freightType: string | null;
        freightStatus: string | null;
        startDate: Date | null;
        endDate: Date | null;
        originCity: string;
        destinationCity: string;
    }>({
        serialReference: '',
        freightType: null,
        freightStatus: null,
        startDate: null,
        endDate: null,
        originCity: '',
        destinationCity: ''
    });

    // ==================== DIÁLOGOS ====================
    dialogFreight = signal(false);
    editMode = signal(false);

    // ==================== DATOS DE FLETES ====================
    selectedFreight?: FreightResponse;
    selectedProvinceOriginId = signal<string | null>(null);
    selectedProvinceDestinId = signal<string | null>(null);

    // ==================== DATOS DE CLIENTES ====================
    clients = signal<any[]>([]);
    clientsPage = signal(1);
    clientsPageSize = 5;
    clientsTotalPages = signal(1);
    clientsTotalRecords = signal(0);
    loadingClients = signal(false);
    clientSearchTerm = '';

    // ==================== MENÚS ====================
    menuItems: MenuItem[] = [];
    @ViewChild('menu') menu!: Menu;
    @ViewChild('paginator') paginator!: Paginator;

    // ==================== OPCIONES PARA DROPDOWNS ====================
    freightTypes = this.freightService.getFreightTypes();
    freightStatuses = this.freightService.getFreightStatuses();
    cargoUnitTypes = this.freightService.getCargoUnitTypes();
    cargoConditions = this.freightService.getCargoConditions();

    // ==================== RXJS ====================
    private destroy$ = new Subject<void>();
    private clientSearchSubject = new Subject<string>();
    private searchOriginSubject = new Subject<string>();
    private searchDestinationSubject = new Subject<string>();

    // ==================== CONSTRUCTOR ====================
    constructor(
        private fb: FormBuilder,
        private messageService: MessageService
    ) {
        this.freightForm = this.fb.group({
            // Paso 1: Datos del Cliente
            client: ['', Validators.required],
            freightType: ['', Validators.required],
            status: ['PENDING', Validators.required],
            serialReference: ['', Validators.maxLength(25)],
            requestedDate: ['', Validators.required],

            // Paso 2: Carga
            unitsRequired: ['', [Validators.required, Validators.min(1)]],
            cargoUnitType: ['', Validators.required],
            cargoCondition: ['', Validators.required],
            observations: ['', Validators.maxLength(250)],

            // Paso 3: Origen y Destino
            originProvince: [null, Validators.required],
            originCity: ['', Validators.required],
            originReference: [''],
            originDepot: [''],
            destinationProvince: [null, Validators.required],
            destinationCity: ['', Validators.required],
            destinationReference: [''],
            destinationDepot: ['']
        });
        this.setupClientSearch();
    }

    // ==================== CICLO DE VIDA ====================
    ngOnInit(): void {
        this.initMenuItems();
        this.loadFreights();
        this.loadClients();
        this.loadAllProvinces();
        this.freightForm.get('originCity')?.disable();
        this.freightForm.get('destinationCity')?.disable();
        this.loadDepots();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    // ==================== INICIALIZACIÓN ====================
    private initializeForm(): void {}

    private setupClientSearch(): void {
        this.clientSearchSubject.pipe(takeUntil(this.destroy$), debounceTime(800), distinctUntilChanged()).subscribe((term) => {
            this.clientsPage.set(1);
            const page = 1;
            const size = this.clientsPageSize;

            if (term.trim() === '') {
                this.loadClients(page);
            } else {
                this.searchClients(term, page, size);
            }
        });
    }

    private initMenuItems(): void {
        this.menuItems = [
            {
                label: 'Editar',
                icon: 'pi pi-pencil',
                command: () => {
                    if (this.selectedFreight) {
                        this.openDialogFreight(this.selectedFreight);
                    }
                }
            },
            {
                label: 'Ver Detalles',
                icon: 'pi pi-eye',
                command: () => {
                    if (this.selectedFreight) {
                        this.viewFreightDetails(this.selectedFreight);
                    }
                }
            },
            {
                label: 'Eliminar',
                icon: 'pi pi-trash',
                command: () => {
                    if (this.selectedFreight) {
                        this.deleteFreight(this.selectedFreight);
                    }
                }
            }
        ];
    }

    // ==================== CARGA DE DATOS - FLETES ====================
    loadFreights(filters?: { page?: number; limit?: number; clientId?: string; serialReference?: string; startDate?: string; endDate?: string; freightStatus?: string; freightType?: string; originCity?: string; destinationCity?: string }): void {
        this.freightService.loadFreights(filters).subscribe({
            next: (response) => {
                if (response.statusCode === 200) {
                    console.log('fletes cargados correctamente');
                }
            },
            error: (error) => {
                console.log('Hubo un error');
            }
        });
    }
    // ==================== CARGA DE DATOS - CLIENTES ====================
    loadClients(page: number = 1): void {
        if (this.loadingClients()) return;

        this.loadingClients.set(true);
        this.clientsPage.set(page);

        this.companyService
            .loadCompanies({
                status: true,
                page,
                limit: this.clientsPageSize,
                type: 'client'
            })
            .subscribe({
                next: (response) => {
                    if (response.data) {
                        const newClients = response.data.map((company) => ({
                            label: company.subject.name,
                            value: company.id
                        }));

                        this.clients.set(newClients);

                        if (response.pagination) {
                            this.clientsTotalPages.set(response.pagination.totalPages);
                            this.clientsTotalRecords.set(response.pagination.totalRecords);
                        }
                    }
                    this.loadingClients.set(false);
                },
                error: () => {
                    this.loadingClients.set(false);
                }
            });
    }

    searchClients(term: string, page: number = 1, limit: number = this.clientsPageSize): void {
        if (this.loadingClients()) return;

        this.loadingClients.set(true);
        this.clientsPage.set(page);

        this.companyService.searchCompanies(term, page, limit, 'client').subscribe({
            next: (response) => {
                if (response.data) {
                    const newClients = response.data.map((company) => ({
                        label: company.subject.name,
                        value: company.id
                    }));

                    this.clients.set(newClients);

                    if (response.pagination) {
                        this.clientsTotalPages.set(response.pagination.totalPages);
                        this.clientsTotalRecords.set(response.pagination.totalRecords);
                    }
                }
                this.loadingClients.set(false);
            },
            error: () => {
                this.loadingClients.set(false);
            }
        });
    }

    onClientSearchChange(): void {
        this.clientSearchSubject.next(this.clientSearchTerm);
    }

    onClientsPageChange(event: any): void {
        const page = event.page + 1;
        const term = this.clientSearchTerm.trim();

        if (term === '') {
            this.loadClients(page);
        } else {
            this.searchClients(term, page, this.clientsPageSize);
        }
    }

    //=================CARGA DE PROVINCIAS Y CIUDADES=========================
    loadAllProvinces(): void {
        this.routeService.loadProvinces().subscribe();
    }

    onProvinceOriginChange(event: { value: string }): void {
        const provinceId = event.value;
        this.selectedProvinceOriginId.set(provinceId);

        if (provinceId) {
            this.freightForm.get('originCity')?.enable();
            const selectedOriginProvince = this.routeService.provinceList().find((p) => p.id === provinceId);
            const provinceName = selectedOriginProvince?.id || '';
            this.loadCitiesForProvinceOrigin(provinceName);
        } else {
            this.freightForm.get('originCity')?.disable();
            this.freightForm.get('originCity')?.setValue(null);
            this.routeService.clearCitiesOrigin();
        }
    }

    loadCitiesForProvinceOrigin(term: string, page: number = 1, limit: number = 30): void {
        this.routeService.loadCitiesForProvinceOrigin(term, { page, limit }).subscribe(() => {
            if (this.paginator) {
                if (page === 1) this.first.set(0);
            }
        });
    }

    onProvinceDestinChange(event: { value: string }): void {
        const provinceId = event.value;
        this.selectedProvinceDestinId.set(provinceId);

        if (provinceId) {
            this.freightForm.get('destinationCity')?.enable();
            const selectedDestinProvince = this.routeService.provinceList().find((p) => p.id === provinceId);
            const provinceName = selectedDestinProvince?.id || '';
            this.loadCitiesForProvinceDestin(provinceName);
        } else {
            this.freightForm.get('destinationCity')?.disable();
            this.freightForm.get('destinationCity')?.setValue(null);
            this.routeService.clearCitiesDestination();
        }
    }

    loadCitiesForProvinceDestin(term: string, page: number = 1, limit: number = 30): void {
        this.routeService.loadCitiesForProvinceDestination(term, { page, limit }).subscribe(() => {
            if (this.paginator) {
                if (page === 1) this.first.set(0);
            }
        });
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

    //====================CARGA DE DEPOSITOS=========================
    loadDepots(): void {
        this.depotService.getDepots(1, 30).subscribe();
    }

    // ==================== GESTIÓN DE MENÚ ====================
    toggleMenu(event: Event, freight: FreightResponse): void {
        this.selectedFreight = freight;
        this.menu.toggle(event);
    }

    // ==================== GESTIÓN DE DIÁLOGOS ====================
    openDialogFreight(freight?: FreightResponse): void {
        this.freightForm.reset();
        this.editMode.set(!!freight);
        this.currentStep = 1;

        if (freight) {
            this.freightForm.patchValue({
                client: freight.clientId,
                freightType: freight.type,
                status: freight.freightStatus,
                serialReference: freight.serialReference,
                requestedDate: new Date(freight.requestedDate),
                unitsRequired: freight.requestedUnits,
                cargoUnitType: freight.cargoUnitType,
                cargoCondition: freight.cargoCondition,
                observations: freight.remarks,
                originReference: freight.originReference,
                destinationReference: freight.destinationReference
            });
        } else {
            this.freightForm.patchValue({
                status: 'PENDING',
                requestedDate: new Date()
            });
        }
        this.dialogFreight.set(true);
    }

    closeDialogFreight(): void {
        this.dialogFreight.set(false);
        this.freightForm.reset();
        this.currentStep = 1;
    }

    // ==================== OPERACIONES CRUD ====================
    onSubmitFreight(): void {
        if (this.freightForm.valid) {
            const formValue = this.freightForm.value;

            // Mapear los valores del formulario al objeto que espera el backend
            const freightData = {
                type: formValue.freightType,
                serialReference: formValue.serialReference || undefined,
                requestedDate: formValue.requestedDate.toISOString().split('T')[0], // Formato YYYY-MM-DD
                requestedUnits: formValue.unitsRequired,
                cargoUnitType: formValue.cargoUnitType,
                cargoCondition: formValue.cargoCondition,
                cargoDescription: formValue.observations || undefined,
                originId: formValue.originCity,
                originReference: formValue.originReference || undefined,
                destinationId: formValue.destinationCity,
                destinationReference: formValue.destinationReference || undefined,
                originDepotId: formValue.originDepot || undefined,
                destinationDepotId: formValue.destinationDepot || undefined,
                remarks: formValue.observations || undefined,
                clientId: formValue.client
            };

            this.freightService.registerFreight(freightData as FreightData).subscribe({
                next: (response) => {
                    if (response.statusCode === 201) {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Éxito',
                            detail: 'Flete registrado correctamente',
                            life: 3000
                        });
                        this.loadFreights(); // Recargar la lista de fletes
                        this.closeDialogFreight();
                    }
                },
                error: (error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al registrar el flete',
                        life: 3000
                    });
                }
            });
        } else {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Por favor complete todos los campos requeridos',
                life: 3000
            });
        }
    }

    viewFreightDetails(freight: FreightResponse): void {
        this.messageService.add({
            severity: 'info',
            summary: 'Información',
            detail: `Viendo detalles del flete: ${freight.serialReference}`,
            life: 3000
        });
    }

    deleteFreight(freight: FreightResponse): void {
        // TODO: Implementar eliminación cuando el backend esté listo
        this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Flete eliminado correctamente',
            life: 3000
        });
    }

    // ==================== NAVEGACIÓN DE STEPPER ====================
    nextStep(): void {
        if (this.currentStep < 3) {
            this.currentStep++;
        }
    }

    previousStep(): void {
        if (this.currentStep > 1) {
            this.currentStep--;
        }
    }

    // ==================== UTILIDADES ====================
    getStatusSeverity(status: string): string {
        switch (status.toLowerCase()) {
            case 'pending':
                return 'warning';
            case 'in_transit':
                return 'info';
            case 'completed':
                return 'success';
            case 'canceled':
            case 'delayed':
                return 'danger';
            default:
                return 'secondary';
        }
    }

    onPageChange(event: any): void {
        const page = event.page + 1;
        const rows = event.rows;
        this.pageSize.set(rows);
        const currentFilters = this.filters();
        const filterParams: any = { page, limit: rows };

        if (currentFilters.serialReference?.trim()) {
            filterParams.serialReference = currentFilters.serialReference.trim();
        }
        if (currentFilters.freightType) {
            filterParams.freightType = currentFilters.freightType;
        }
        if (currentFilters.freightStatus) {
            filterParams.freightStatus = currentFilters.freightStatus;
        }
        if (currentFilters.startDate) {
            filterParams.startDate = currentFilters.startDate.toISOString().split('T')[0];
        }
        if (currentFilters.endDate) {
            filterParams.endDate = currentFilters.endDate.toISOString().split('T')[0];
        }
        if (currentFilters.originCity?.trim()) {
            filterParams.originCity = currentFilters.originCity.trim();
        }
        if (currentFilters.destinationCity?.trim()) {
            filterParams.destinationCity = currentFilters.destinationCity.trim();
        }

        this.loadFreights(filterParams);
    }

    // ==================== FILTROS ====================
    applyFilters(): void {
        const currentFilters = this.filters();
        const filterParams: any = {
            page: 1,
            limit: this.pageSize()
        };

        if (currentFilters.serialReference?.trim()) {
            filterParams.serialReference = currentFilters.serialReference.trim();
        }
        if (currentFilters.freightType) {
            filterParams.freightType = currentFilters.freightType;
        }
        if (currentFilters.freightStatus) {
            filterParams.freightStatus = currentFilters.freightStatus;
        }
        if (currentFilters.startDate) {
            filterParams.startDate = currentFilters.startDate.toISOString().split('T')[0];
        }
        if (currentFilters.endDate) {
            filterParams.endDate = currentFilters.endDate.toISOString().split('T')[0];
        }
        if (currentFilters.originCity?.trim()) {
            filterParams.originCity = currentFilters.originCity.trim();
        }
        if (currentFilters.destinationCity?.trim()) {
            filterParams.destinationCity = currentFilters.destinationCity.trim();
        }

        this.loadFreights(filterParams);
    }

    clearFilters(): void {
        this.filters.set({
            serialReference: '',
            freightType: null,
            freightStatus: null,
            startDate: null,
            endDate: null,
            originCity: '',
            destinationCity: ''
        });
        this.loadFreights({ page: 1, limit: this.pageSize() });
    }
}
