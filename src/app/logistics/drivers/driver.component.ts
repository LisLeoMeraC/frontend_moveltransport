import { CommonModule } from '@angular/common';
import { Component, effect, inject, OnInit, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatPaginator, MatPaginatorIntl, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
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
import { Subject } from 'rxjs';
import { DriverService } from '../../pages/service/driver.service';

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
    dialogDriver: boolean = false;
    FormDriver: FormGroup;

    private companyService = inject(CompanyService);
    private driverService = inject(DriverService);
    private destroy$ = new Subject<void>();
    private searchSubject = new Subject<string>();

    carriers = this.companyService.companiesList;
    drivers=this.driverService.driversList;
    isLoading = this.companyService.isLoading;
    hasError = this.companyService.hasError;
    pagination = this.companyService.paginationData;
    pageSize = signal(5);

    //para editar un conductor
    editMode=false;
    driverId:string| null = null;

     isSubmitted = true;

    @ViewChild(MatPaginator) paginator!: MatPaginator;

    constructor(
        private fb: FormBuilder,
        private messageService: MessageService
    ) {
        this.FormDriver = this.fb.group({
            licenseNumber: [null, Validators.required],
            name: [null, Validators.required],
            alias: [null, Validators.required],
            phone: [null, Validators.required],
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
    }

    ngOnInit(): void {
      this.loadDrivers();
    }

    ngAfterViewInit(): void {
        this.paginator.page.subscribe((event) => {
            this.pageSize.set(event.pageSize);
            const newPage = event.pageSize !== this.pagination().pageSize ? 1 : event.pageIndex + 1;
                this.loadDrivers(newPage, event.pageSize);
        });
    }

    
    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }


    loadCompanies(page: number = 1, limit: number = this.pageSize(), type: 'carrier'): void {
        this.companyService.loadCompanies(page, limit, type).subscribe(() => {
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

    openDialogDriver() {
        this.dialogDriver = true;
        this.FormDriver.reset();
        this.loadCompanies(1, this.pageSize(), 'carrier');
    }

    closeDialogDriver() {
        this.dialogDriver = false;
        this.FormDriver.reset();
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

        // Datos comunes a ambas operaciones
        let driverData: any = {
            name: formValue.name,
            alias: formValue.alias || null,
            phone: formValue.phone || null,
            licenseNumber: formValue.licenseNumber || null,
            companyId: formValue.companyId
        };

        // Solo incluir identificación si NO estamos en modo edición
        
        console.log('JSON enviado:', JSON.stringify(driverData, null, 2));
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
