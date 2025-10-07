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
import { PaginatorModule } from 'primeng/paginator';
import { MenuModule } from 'primeng/menu';
import { MenuItem, MessageService } from 'primeng/api';
import { Menu } from 'primeng/menu';
import { FreightService } from '../../pages/service/freight.service';
import { FreightResponse } from '../../pages/models/freight.model';
import { CompanyService } from '../../pages/service/company.service';
import { ApiResponse } from '../../pages/models/shared.model';
import { CompanyResponse } from '../../pages/models/company.model';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

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

    // ==================== FORMULARIOS ====================
    freightForm: FormGroup;

    // ==================== ESTADOS DE UI ====================
    pageSize = signal(5);
    first = signal(1);
    currentStep = 1;
    searchTerm = '';

    // ==================== DIÁLOGOS ====================
    dialogFreight = signal(false);
    editMode = signal(false);

    // ==================== DATOS DE FLETES ====================
    selectedFreight?: FreightResponse;

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

    // ==================== OPCIONES PARA DROPDOWNS ====================
    freightTypes = this.freightService.getFreightTypes();
    freightStatuses = this.freightService.getFreightStatuses();
    cargoUnitTypes = this.freightService.getCargoUnitTypes();
    cargoConditions = this.freightService.getCargoConditions();

    // ==================== RXJS ====================
    private destroy$ = new Subject<void>();
    private clientSearchSubject = new Subject<string>();

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
            serialReference: ['', [Validators.required, Validators.maxLength(25)]],
            requestedDate: ['', Validators.required],

            // Paso 2: Carga
            unitsRequired: ['', [Validators.required, Validators.min(1)]],
            cargoUnitType: ['', Validators.required],
            cargoCondition: ['', Validators.required],
            observations: ['', Validators.maxLength(250)],

            // Paso 3: Origen y Destino
            originProvince: ['', Validators.required],
            originCity: ['', Validators.required],
            originReference: [''],
            originDepot: [''],
            destinationProvince: ['', Validators.required],
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
    loadFreights(): void {
        this.freightService.loadFreights().subscribe({
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

            if (this.editMode()) {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: 'Flete actualizado correctamente',
                    life: 3000
                });
            } else {
                // TODO: Implementar creación de nuevo flete cuando el backend esté listo
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: 'Flete registrado correctamente',
                    life: 3000
                });
            }

            this.closeDialogFreight();
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
        console.log('Page change:', event);
    }
}
