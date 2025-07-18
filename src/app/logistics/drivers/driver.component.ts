import { CommonModule } from '@angular/common';
import { Component, effect, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatPaginator, MatPaginatorIntl, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinner, MatProgressSpinnerModule } from '@angular/material/progress-spinner';
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
import { getSpanishPaginatorIntl } from '../../config/getSpanishPaginatorIntl';
import { CompanyService } from '../../pages/service/company.service';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { DriverService } from '../../pages/service/driver.service';
import { DriverResponse } from '../../pages/models/driver.model';
import { SelectModule } from 'primeng/select';
import { Menu, MenuModule } from 'primeng/menu';
import { Paginator, PaginatorModule } from 'primeng/paginator';

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
        PaginatorModule,
        MenuModule,
        MatPaginatorModule,
        MatProgressSpinnerModule,
        SelectModule,
        SelectButtonModule,
        FormsModule
    ],
    templateUrl: './driver.component.html',
    styleUrl: './driver.component.scss',
    providers: [MessageService, { provide: MatPaginatorIntl, useValue: getSpanishPaginatorIntl() }]
})
export class DriverComponent implements OnInit, OnDestroy {
    //Formularios
    formDriver: FormGroup;

    //Estados reactivos
    pageSize = signal(5);
    first = signal(0);
    isSubmitted = signal(true);
    isDeleting = signal(false);

    //Flags y controles de UI
    showNumberOnlyWarning = false;
    editMode = false;

    //Dialogos
    dialogDriver: boolean = false;
    dialogDeleteDriver: boolean = false;

    //Selecciones actuales
    driverId: string | null = null;
    driverToDelete: DriverResponse | null = null;
    selectedDriver?: DriverResponse;

    //Datos y servicios
    private companyService = inject(CompanyService);
    private driverService = inject(DriverService);
    searchTerm: string = '';
    menuItems: MenuItem[] = [];
    carriers = this.companyService.companiesList;
    drivers = this.driverService.driversList;
    isLoading = this.driverService.isLoading;
    hasError = this.driverService.hasError;
    pagination = this.driverService.paginationData;

    //RxJS
    private destroy$ = new Subject<void>();
    private searchSubject = new Subject<string>();

    //ViewChilds
    @ViewChild('paginator') paginator!: Paginator;
    @ViewChild('menu') menu!: Menu;

    constructor(
        private fb: FormBuilder,
        private messageService: MessageService
    ) {
        this.formDriver = this.fb.group({
            licenseNumber: [null, Validators.required],
            name: [null, Validators.required],
            alias: [null],
            phone: [null],
            companyId: [null]
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

        //Busqueda reactiva
        this.searchSubject.pipe(takeUntil(this.destroy$), debounceTime(800), distinctUntilChanged()).subscribe((term) => {
            if (term.trim() === '') {
                this.loadDrivers(1, this.pageSize());
            } else {
                this.searchDrivers(term, 1, this.pageSize());
            }
        });
    }

    // ================ Ciclo de vida del componente =================

    ngOnInit(): void {
        this.loadDrivers();
        this.initMenuItems();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    //=============Inicialización=================
    initMenuItems(): void {
        this.menuItems = [
            {
                label: ' Editar',
                icon: 'pi pi-pencil',
                command: () => {
                    if (this.selectedDriver) {
                        this.openDialogDriver(this.selectedDriver);
                    }
                }
            },
            {
                label: 'Eliminar',
                icon: 'pi pi-trash',
                command: () => {
                    if (this.selectedDriver) {
                        this.confirmDeleteDriver(this.selectedDriver);
                    }
                }
            }
        ];
    }

    //================Acciones con el menú=================

    toggleMenu(event: Event, driver: DriverResponse): void {
        this.selectedDriver = driver;
        this.menu.toggle(event);
    }

    //=================Carga y búsqueda=================

    loadCompanies(): void {
        this.companyService.loadCompanies({ status: false, type: 'carrier' }).subscribe();
    }

    loadDrivers(page: number = 1, limit: number = this.pageSize()): void {
        this.driverService.loadDrivers({ page, limit }).subscribe(() => {
            if (this.paginator) {
                if (page === 1) this.first.set(0);
            }
        });
    }

    searchDrivers(term: string, page: number = 1, limit: number = this.pageSize()): void {
        this.driverService.searchDrivers(term, page, limit).subscribe(() => {
            if (page === 1) this.first.set(0);
        });
    }

    onSearchChange(): void {
        this.searchSubject.next(this.searchTerm);
    }

    onPageChange(event: any): void {
        const newPage = event.page + 1;
        const newSize = event.rows;
        this.pageSize.set(newSize);
        if (this.searchTerm.trim() === '') {
            this.loadDrivers(newPage, newSize);
        } else {
            this.searchDrivers(this.searchTerm, newPage, newSize);
        }
    }

    //=================Registro / Edición================
    openDialogDriver(driver?: DriverResponse) {
        this.formDriver.reset();
        this.editMode = !!driver;
        this.driverId = driver?.id || null;
        this.isSubmitted = signal(false);
        this.dialogDriver = true;
        this.loadCompanies();
        if (this.editMode) {
            this.formDriver.get('licenseNumber')?.disable();
        } else {
            this.formDriver.get('licenseNumber')?.enable();
        }

        if (driver) {
            const formData = {
                licenseNumber: driver.licenseNumber,
                name: driver.name,
                alias: driver.alias || null,
                phone: driver.phone || null,
                companyId: driver.companyId
            };
            setTimeout(() => {
                this.formDriver.patchValue(formData, { emitEvent: false });
            });
        }
    }

    closeDialogDriver() {
        this.dialogDriver = false;
        this.formDriver.reset();
    }

    onSubmitDriver() {
        const nameControl = this.formDriver.get('name');
        const licenseNumberControl = this.formDriver.get('licenseNumber');
        if ((nameControl && nameControl.invalid) || (licenseNumberControl && licenseNumberControl.invalid)) {
            if (nameControl) {
                nameControl.markAsTouched();
            }
            licenseNumberControl?.markAsTouched();
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Por favor complete los campos requeridos',
                life: 5000
            });
            return;
        }
        this.isSubmitted = signal(true);
        const formValue = this.formDriver.value;
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
                this.formDriver.reset();
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: this.editMode ? 'Conductor actualizado correctamente' : 'Conductor registrado correctamente',
                    life: 5000
                });
                this.editMode = false;
                this.driverId = null;
                this.loadDrivers();
                this.isSubmitted = signal(false);
            },
            error: (err) => {
                console.error('Error en el componente:', err);
                this.isSubmitted = signal(false);
            }
        });
    }

    //=================Eliminación=================

    confirmDeleteDriver(driver: DriverResponse): void {
        this.driverToDelete = driver;
        this.dialogDeleteDriver = true;
    }

    deleteDriver(): void {
        if (!this.driverToDelete) return;
        this.isDeleting = signal(true);

        this.driverService.deleteDriver(this.driverToDelete.id).subscribe({
            next: (response) => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: 'Conductor eliminado correctamente',
                    life: 5000
                });
                this.isDeleting = signal(false);

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
                this.isDeleting = signal(false);
                this.driverToDelete = null;
            }
        });
    }

    //=================Validaciones=================

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
}
