import { CommonModule } from '@angular/common';
import { Component, effect, inject, OnInit, signal, ViewChild } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { ToolbarModule } from 'primeng/toolbar';
import { VehicleService } from '../../pages/service/vehicle.service';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { MatPaginator, MatPaginatorIntl, MatPaginatorModule } from '@angular/material/paginator';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MenuItem, MessageService } from 'primeng/api';
import { getSpanishPaginatorIntl } from '../../config/getSpanishPaginatorIntl';
import { CompanyService } from '../../pages/service/company.service';
import { ToastModule } from 'primeng/toast';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SelectButtonModule } from 'primeng/selectbutton';
import { VehicleOwnerService } from '../../pages/service/vehicle-owner.service';
import { DriverService } from '../../pages/service/driver.service';
import { VehicleData, VehicleResponse } from '../../pages/models/vehicle';
import { SelectModule } from 'primeng/select';
import { Menu, MenuModule } from 'primeng/menu';

@Component({
    selector: 'app-vehicle',
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
        MenuModule,
        ToastModule,
        SelectModule,
        MatPaginatorModule,
        MatProgressSpinnerModule,
        SelectButtonModule,
        FormsModule
    ],
    templateUrl: './vehicle.component.html',
    styleUrl: './vehicle.component.scss',
    providers: [MessageService, { provide: MatPaginatorIntl, useValue: getSpanishPaginatorIntl() }]
})
export class VehicleComponent implements OnInit {
    dialogVehicle: boolean = false;
    formVehicle: FormGroup;

    dialogUpdateOwner: boolean = false;
    formUpdateOwner: FormGroup;

    private vehicleService = inject(VehicleService);
    private companyService = inject(CompanyService);
    private ownerService = inject(VehicleOwnerService);
    private driverService = inject(DriverService);
    private destroy$ = new Subject<void>();
    private searchSubject = new Subject<string>();

    vehicles = this.vehicleService.vehiclesList;
    companies = this.companyService.companiesList;
    owners = this.ownerService.vehicleOwnersList;
    drivers = this.driverService.driversList;

    isLoading = this.vehicleService.isLoading;
    hasError = this.vehicleService.hasError;
    pagination = this.vehicleService.paginationData;
    pageSize = signal(5);

    //para buscar un vehículo
    searchTerm: string = '';

    //Para editar un vehiculo
    editMode = false;
    vehicleId: string | null = null;

    //Para eliminar un vehiculo
    dialogDeleteVehicle: boolean = false;
    vehicleToDelete: VehicleResponse | null = null;

    isSubmitted = true;

    isDeleting = false;

    currentVehicleId: string = '';
    currentOwnerName: string = '';

    @ViewChild(MatPaginator) paginator!: MatPaginator;

    isLoaDriver = this.driverService.isLoading;
    totalRecords = signal(0);
    lastSearchTerm = '';

    menuItems: MenuItem[] = [];
    selectedVehicle?: VehicleResponse;

    constructor(
        private fb: FormBuilder,
        private messageService: MessageService
    ) {
        this.formVehicle = this.fb.group({
            plate: [null, Validators.required],
            brand: [null],
            model: [null],
            year: [null],
            color: [null],
            companyId: [''],
            ownerId: ['', Validators.required],
            defaultDriverId: ['']
        });

        this.formUpdateOwner = this.fb.group({
            ownerId: ['', Validators.required]
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

        this.searchSubject.pipe(takeUntil(this.destroy$), debounceTime(800), distinctUntilChanged()).subscribe((term) => {
            if (term.trim() === '') {
                this.loadVehicles(1, this.pageSize());
            } else {
                this.searchVehicle(term, 1, this.pageSize());
            }
        });
    }

    ngOnInit(): void {
        this.loadVehicles();
        this.initMenuItems();
    }

    ngAfterViewInit(): void {
        this.paginator.page.subscribe((event) => {
            this.pageSize.set(event.pageSize);
            const newPage = event.pageIndex + 1;
            if (this.searchTerm.trim() === '') {
                this.loadVehicles(newPage, event.pageSize);
            } else {
                this.searchVehicle(this.searchTerm, newPage, event.pageSize);
            }
        });
    }

    initMenuItems(): void {
        this.menuItems = [
            {
                label: 'Editar',
                icon: 'pi pi-pencil',
                command: () => {
                    if (this.selectedVehicle) {
                        this.openDialogVehicle(this.selectedVehicle);
                    }
                }
            },
            {
                label: 'Elimnar',
                icon: 'pi pi-trash',
                command: () => {
                    if (this.selectedVehicle) {
                        this.confirmDeleteVehicle(this.selectedVehicle);
                    }
                }
            },
            {
                label: 'Cambiar Propietario',
                icon: 'pi pi-replay',
                command: () => {
                     this.openUpdateOwnerDialog(this.selectedVehicle);
                }
            }
        ];
    }

    toggleMenu(event: Event, vehicle: VehicleResponse): void {
        this.selectedVehicle = vehicle;
        this.menu.toggle(event);
    }

    openUpdateOwnerDialog(vehicle: any): void {
        this.currentVehicleId = vehicle.id;
        console.log("propietariio actual: "+this.currentVehicleId)
        this.currentOwnerName = vehicle.owner?.subject?.name || 'Sin propietario';
        this.loadAllVehicleOwners();
        this.dialogUpdateOwner = true;
        this.loadVehicles();
    }

    onUpdateOwner(): void {
        if (this.formUpdateOwner.invalid) {
            this.formUpdateOwner.markAllAsTouched();
            return;
        }

        const ownerId = this.formUpdateOwner.get('ownerId')?.value;
        const payload = { ownerId };

        console.log('Payload enviado a updateVehicleOwner:', JSON.stringify(payload));

        this.vehicleService.updateVehicleOwner(this.currentVehicleId, ownerId).subscribe({
            next: () => {
                this.dialogUpdateOwner = false;
                this.formUpdateOwner.reset();
                // Recargar la lista de vehículos si es necesario
                this.vehicleService.loadVehicles().subscribe();
            },
            error: (err) => {
                console.error('Error al actualizar propietario:', err);
            }
        });
    }

    @ViewChild('menu') menu!: Menu;

    openDialogVehicle(vehicle?: VehicleResponse) {
        this.formVehicle.reset();
        this.editMode = !!vehicle;
        this.vehicleId = vehicle?.id || null;
        this.loadCompanies();

        this.loadAllDrivers();
        this.loadAllVehicleOwners();

        if (this.editMode && vehicle) {
            this.formVehicle.patchValue({
                plate: vehicle.plate,
                brand: vehicle.brand,
                model: vehicle.model,
                year: vehicle.year?.toString(),
                color: vehicle.color,
                companyId: vehicle.companyId,
                ownerId: vehicle.ownerId,
                defaultDriverId: vehicle.defaultDriverId
            });
        }
        this.dialogVehicle = true;
    }

    closeDialogUpdateOwner(): void {
        this.dialogUpdateOwner = false;
        this.formUpdateOwner.reset();
    }

    closeDialogVehicle() {
        this.dialogVehicle = false;
    }

    onSearchChange(): void {
        // Resetear siempre a la primera página al cambiar el término de búsqueda
        this.searchSubject.next(this.searchTerm);
    }

    searchVehicle(term: string, page: number = 1, limit: number = this.pageSize()): void {
        this.vehicleService.searchVehicles(term, page, limit).subscribe(() => {
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

    loadAllDrivers(): void {
        this.driverService.loadDrivers().subscribe();
    }

    loadAllVehicleOwners(): void {
        this.ownerService.loadVehicleOwners().subscribe();
    }

    loadCompanies(): void {
        this.companyService.loadCompanies({ status: false, type: 'carrier' }).subscribe();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadVehicles(page: number = 1, limit: number = this.pageSize()): void {
        this.vehicleService.loadVehicles(page, limit).subscribe(() => {
            if (this.paginator) {
                this.paginator.pageIndex = page - 1;
                this.paginator.pageSize = limit;
            }
        });
    }

    onSubmitVehicle() {
        if (!this.checkFormValidity()) {
            return;
        }

        this.isSubmitted = true;
        const formValue = this.formVehicle.getRawValue();

        let vehicleData: any = {
            // plate: this.formVehicle.value.plate,
            brand: formValue.brand,
            model: formValue.model,
            year: parseInt(formValue.year, 10),
            color: formValue.color,
            // companyId: this.formVehicle.value.companyId,
            //ownerId: this.formVehicle.value.ownerId,
            defaultDriverId: formValue.defaultDriverId
        };

        if (!this.editMode) {
            vehicleData = {
                ...vehicleData,
                plate: this.formVehicle.value.plate,
                companyId: this.formVehicle.value.companyId,
                ownerId: this.formVehicle.value.ownerId
            };
        }

        const operation = this.editMode && this.vehicleId ? this.vehicleService.updateVehicle(this.vehicleId, vehicleData) : this.vehicleService.registerVehicle(vehicleData);

        operation.subscribe({
            next: () => {
                this.formVehicle.reset();
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: this.editMode ? 'Vehiculo actualizado correctamente' : 'Vehiculo registrado correctamente',
                    life: 5000
                });
                this.editMode = false;
                this.vehicleId = null;
                this.loadVehicles();
                this.isSubmitted = false;
                this.dialogVehicle = false;
            },
            error: () => {
                this.isSubmitted = false;
            }
        });
    }

    checkFormValidity(): boolean {
        const requiredFields = ['plate', 'ownerId', 'companyId'];
        let isValid = true;
        let invalidFields: string[] = [];

        requiredFields.forEach((field) => {
            const control = this.formVehicle.get(field);
            if (control && control.invalid) {
                control.markAsTouched();
                isValid = false;
                invalidFields.push(field);
            }
        });
        return isValid;
    }

    confirmDeleteVehicle(vehicle: VehicleResponse): void {
        this.vehicleToDelete = vehicle;
        this.dialogDeleteVehicle = true;
    }

    deleteVehicle(): void {
        if (!this.vehicleToDelete) return;
        this.isDeleting = true;

        this.vehicleService.deleteVehicle(this.vehicleToDelete.id).subscribe({
            next: (response) => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: 'Vehiculo eliminado correctamente',
                    life: 5000
                });
                this.isDeleting = false;

                if (this.searchTerm.trim() === '') {
                    this.loadVehicles(this.pagination().currentPage, this.pageSize());
                } else {
                    this.searchVehicle(this.searchTerm, this.pagination().currentPage, this.pageSize());
                }
            },
            error: (err) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudo eliminar el vehiculo',
                    life: 5000
                });
            },
            complete: () => {
                this.dialogDeleteVehicle = false;
                this.isDeleting = false;
                this.vehicleToDelete = null;
            }
        });
    }
}
