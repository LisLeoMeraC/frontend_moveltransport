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
import { MessageService } from 'primeng/api';
import { getSpanishPaginatorIntl } from '../../config/getSpanishPaginatorIntl';
import { CompanyService } from '../../pages/service/company.service';
import { ToastModule } from 'primeng/toast';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SelectButtonModule } from 'primeng/selectbutton';
import { VehicleOwnerService } from '../../pages/service/vehicle-owner.service';
import { DriverService } from '../../pages/service/driver.service';
import { VehicleData } from '../../pages/models/vehicle';
import { SelectModule } from 'primeng/select';

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

    isSubmitted = true;

    @ViewChild(MatPaginator) paginator!: MatPaginator;

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

        this.searchSubject.pipe(takeUntil(this.destroy$), debounceTime(2000), distinctUntilChanged()).subscribe((term) => {
            if (term.trim() === '') {
                this.loadVehicles(1, this.pageSize());
            } else {
                this.searchVehicle(term, 1, this.pageSize());
            }
        });
    }

    ngOnInit(): void {
        this.loadVehicles();
    }

    ngAfterViewInit(): void {
        this.paginator.page.subscribe((event) => {
            this.pageSize.set(event.pageSize);
            const newPage = event.pageSize !== this.pagination().pageSize ? 1 : event.pageIndex + 1;
            if (this.searchTerm.trim() === '') {
                this.loadVehicles(newPage, event.pageSize);
            } else {
                this.searchVehicle(this.searchTerm, newPage, event.pageSize);
            }
        });
    }

    openDialogVehicle() {
        this.formVehicle.reset();
        this.dialogVehicle = true;
        this.loadCompanies(1, this.pageSize(), 'carrier');
        this.loadOwners(1, this.pageSize());
        this.loadDrivers(1, this.pageSize());
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

    loadCompanies(page: number = 1, limit: number = this.pageSize(), type: 'carrier'): void {
        this.companyService.loadCompanies(false, page, limit, type).subscribe(() => {
            if (this.paginator) {
                this.paginator.pageIndex = page - 1;
                this.paginator.pageSize = limit;
            }
        });
    }

    loadDrivers(page: number = 1, limit: number = this.pageSize()): void {
        this.driverService.loadDrivers(page, limit).subscribe(() => {
            if (this.paginator) {
                this.paginator.pageIndex = page - 1;
                this.paginator.pageSize = limit;
            }
        });
    }

    loadOwners(page: number = 1, limit: number = this.pageSize()): void {
        this.ownerService.loadVehicleOwners(page, limit).subscribe(() => {
            if (this.paginator) {
                this.paginator.pageIndex = page - 1;
                this.paginator.pageSize = limit;
            }
        });
    }

    onSubmitVehicle() {
        this.isSubmitted = true;

        if (this.formVehicle.invalid) {
            // Marcar todos los campos como tocados para mostrar errores de validación
            this.formVehicle.markAllAsTouched();

            // Mostrar mensajes de error específicos
            if (this.formVehicle.get('plate')?.errors?.['required']) {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Por favor, ingrese una placa.',
                    life: 5000
                });
            }

            if (this.formVehicle.get('ownerId')?.errors?.['required']) {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Por favor, seleccione un propietario.',
                    life: 5000
                });
            }

            return;
        }

        const vehicleData: any = {
            plate: this.formVehicle.value.plate,
            brand: this.formVehicle.value.brand,
            model: this.formVehicle.value.model,
            year: parseInt(this.formVehicle.value.year, 10),
            color: this.formVehicle.value.color,
            companyId: this.formVehicle.value.companyId,
            ownerId: this.formVehicle.value.ownerId,
            defaultDriverId: this.formVehicle.value.defaultDriverId
        };

        console.log(JSON.stringify(vehicleData));

        this.vehicleService
            .registerVehicle(vehicleData)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.dialogVehicle = false;
                    this.formVehicle.reset();
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Vehículo registrado correctamente',
                        life: 5000
                    });
                    this.isSubmitted = false;
                    this.loadVehicles();
                },
                error: (err) => {
                    console.error('Error al registrar vehículo:', err);
                    this.isSubmitted = false;
                }
            });
    }
}
