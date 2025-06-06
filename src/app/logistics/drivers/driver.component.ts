import { CommonModule } from '@angular/common';
import { Component, effect, inject, OnInit, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatPaginator, MatPaginatorIntl, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinner, MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MessageService } from 'primeng/api';
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
import { getSpanishPaginatorIntl } from '../../config/getSpanishPaginatorIntl';
import { CompanyService } from '../../pages/service/company.service';
import { CompanyResponse } from '../../pages/models/company';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { DriverService } from '../../pages/service/driver.service';
import { DriverResponse } from '../../pages/models/driver';

@Component({
    selector: 'app-drivers',
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
    templateUrl: './driver.component.html',
    styleUrl: './driver.component.scss',
    providers: [MessageService, { provide: MatPaginatorIntl, useValue: getSpanishPaginatorIntl() }]
})
export class DriverComponent implements OnInit {
    showNumberOnlyWarning = false;

    dialogDriver: boolean = false;
    FormDriver: FormGroup;

    private companyService = inject(CompanyService);
    private driverService = inject(DriverService);
    private destroy$ = new Subject<void>();
    private searchSubject = new Subject<string>();

    carriers = this.companyService.companiesList;
    drivers = this.driverService.driversList;
    isLoading = this.driverService.isLoading;
    hasError = this.driverService.hasError;
    pagination = this.driverService.paginationData;
    pageSize = signal(5);

    //para editar un conductor
    editMode = false;
    driverId: string | null = null;

    //para buscar un conductor
    searchTerm: string = '';

    //Para eliminar un conductor
    dialogDeleteDriver: boolean = false;
    driverToDelete: DriverResponse | null = null;

    isSubmitted = true;

    isDeleting = false;

    @ViewChild(MatPaginator) paginator!: MatPaginator;

    constructor(
        private fb: FormBuilder,
        private messageService: MessageService
    ) {
        this.FormDriver = this.fb.group({
            licenseNumber: [null],
            name: [null, Validators.required],
            alias: [null],
            phone: [null],
            companyId: [null, Validators.required]
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
                this.loadDrivers(1, this.pageSize());
            } else {
                this.searchDrivers(term, 1, this.pageSize());
            }
        });
    }

    ngOnInit(): void {
        this.loadDrivers();
    }

    ngAfterViewInit(): void {
        this.paginator.page.subscribe((event) => {
            this.pageSize.set(event.pageSize);
            const newPage = event.pageSize !== this.pagination().pageSize ? 1 : event.pageIndex + 1;
            if (this.searchTerm.trim() === '') {
                this.loadDrivers(newPage, event.pageSize);
            } else {
                this.searchDrivers(this.searchTerm, newPage, event.pageSize);
            }
        });
    }

    onSearchChange(): void {
        // Resetear siempre a la primera página al cambiar el término de búsqueda
        this.searchSubject.next(this.searchTerm);
    }

    searchDrivers(term: string, page: number = 1, limit: number = this.pageSize()): void {
        this.driverService.searchDrivers(term, page, limit).subscribe(() => {
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

    confirmDeleteDriver(driver: DriverResponse): void {
        this.driverToDelete = driver;
        this.dialogDeleteDriver = true;
    }

    deleteDriver(): void {
        if (!this.driverToDelete) return;
        this.isDeleting = true;

        this.driverService.deleteDriver(this.driverToDelete.id).subscribe({
            next: (response) => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: 'Conductor eliminado correctamente',
                    life: 5000
                });
                this.isDeleting = false;

                // Recargar la lista de compañías
                if (this.searchTerm.trim() === '') {
                    this.loadDrivers(this.pagination().currentPage, this.pageSize());
                } else {
                    this.searchDrivers(this.searchTerm, this.pagination().currentPage, this.pageSize());
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
                this.dialogDeleteDriver = false;
                this.isDeleting = false;
                this.driverToDelete = null;
            }
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
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

    openDialogDriver(driver?: DriverResponse) {
        this.FormDriver.reset();
        this.editMode = !!driver;
        this.driverId = driver?.id || null;
        this.isSubmitted = false;
        this.dialogDriver = true;
        this.loadCompanies(1, this.pageSize(), 'carrier');

        if (driver) {
            const formData = {
                licenseNumber: driver.licenseNumber,
                name: driver.name,
                alias: driver.alias || null,
                phone: driver.phone || null,
                companyId: driver.companyId
            };
            setTimeout(() => {
                this.FormDriver.patchValue(formData, { emitEvent: false });
            });
        }
    }

    closeDialogDriver() {
        this.dialogDriver = false;
        this.FormDriver.reset();
    }

    onKeyPressLicensePhone(event: KeyboardEvent) {
        // Permitir solo números en los campos licenseNumber y phone
        const allowedFields = ['licenseNumber', 'phone'];
        const target = event.target as HTMLInputElement;
        if (target && allowedFields.includes(target.getAttribute('formControlName') || '')) {
            const pattern = /[0-9]/;
            const inputChar = String.fromCharCode(event.charCode);

            if (!pattern.test(inputChar)) {
            this.showNumberOnlyWarning = true;
            setTimeout(() => (this.showNumberOnlyWarning = false), 2000);
            event.preventDefault();
            }
        }
            
    }

    onSubmitDriver() {
        if (this.FormDriver.invalid) {
            this.FormDriver.markAllAsTouched();
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Por favor complete todos los campos requeridos',
                life: 5000
            });
            return;
        }

        this.isSubmitted = true;
        const formValue = this.FormDriver.value;
        let driverData: any = {
            name: formValue.name,
            alias: formValue.alias || null,
            phone: formValue.phone || null,
            companyId: formValue.companyId
        };
        if (!this.editMode) {
            driverData = {
                ...driverData,
                licenseNumber: formValue.licenseNumber || null
            };
        }

        console.log(JSON.stringify(driverData));
        const operation = this.editMode && this.driverId ? this.driverService.updateDriver(this.driverId, driverData) : this.driverService.registerDriver(driverData);

        operation.subscribe({
            next: () => {
                this.dialogDriver = false;
                this.FormDriver.reset();
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: this.editMode ? 'Conductor actualizado correctamente' : 'Conductor registrado correctamente',
                    life: 5000
                });
                this.editMode = false;
                this.driverId = null;
                this.loadDrivers();
                this.isSubmitted = false;
            },
            error: (err) => {
                console.error('Error en el componente:', err);
                this.isSubmitted = false;
            }
        });
    }
}
