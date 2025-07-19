import { Component, effect, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { RouteService } from '../../pages/service/route.service';
import { Subject } from 'rxjs';
import { Paginator, PaginatorModule } from 'primeng/paginator';
import { MessageService } from 'primeng/api';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { RouteResponse } from '../../pages/models/routess.model';

@Component({
    selector: 'app-route',
    standalone: true,
    imports: [ToastModule, ToolbarModule, ReactiveFormsModule, DialogModule, SelectModule, TableModule, IconFieldModule, InputIconModule, ButtonModule, InputTextModule, PaginatorModule, CommonModule],
    templateUrl: './route.component.html',
    styleUrl: './route.component.scss'
})
export class RouteComponent implements OnInit, OnDestroy {
    //Formulario
    formRoute: FormGroup;

    //Estados reactivos
    pageSize = signal(5);
    first = signal(0);

    //Datos y servicios
    private routeService = inject(RouteService);
    routes = this.routeService.routesList;
    provinces = this.routeService.provinceList;
    originCities = this.routeService.originCityList;
    destinationCities = this.routeService.destinationCitiesList;
    isLoading = this.routeService.isLoading;
    hasError = this.routeService.hasError;
    pagination = this.routeService.paginationData;
    searchTerm: string = '';

    //Flags y controles de UI
    isSubmitted = true;
    editMode = signal(false);

    //Seleeciones actuales
    selectedProvinceOriginId = signal<string | null>(null);
    selectedProvinceDestinId = signal<string | null>(null);
    routeId: string | null = null;

    //Dialogos
    dialogRoutes = signal(false);

    //RxJS
    private destroy$ = new Subject<void>();
    private searchSubject = new Subject<string>();

    //ViewChild
    @ViewChild('paginator') paginator!: Paginator;

    constructor(
        private messageService: MessageService,
        private fb: FormBuilder
    ) {
        //Mostrar errores de forma globar
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

        this.formRoute = this.fb.group({
            id: [''],
            originProvince: [null, Validators.required],
            distanceInKm: [null, [Validators.required, Validators.min(1)]],
            clientRate: [null, [Validators.min(0)]],
            carrierRate: [null, [Validators.min(0)]],
            originId: [{ value: '', disabled: true }, Validators.required],
            destinationId: [{ value: '', disabled: true }, Validators.required],
            destinationProvince: [null, Validators.required]
        });
    }

    //=========Ciclo de vida del componente=========
    ngOnInit(): void {
        this.loadRoutes();
        this.loadAllProvinces();
    }
    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    //=========Carga y Búsqueda=========
    loadRoutes(page: number = 1, limit: number = this.pageSize()): void {
        this.routeService.loadRoutes(page, limit).subscribe(() => {
            if (this.paginator) {
                if (page === 1) this.first.set(0);
            }
        });
    }

    onPageChange(event: any): void {
        const newPage = event.page + 1;
        const newSize = event.rows;
        this.pageSize.set(newSize);
        if (this.searchTerm.trim() === '') {
            this.loadRoutes(newPage, newSize);
        }
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

    loadCitiesForProvinceOrigin(term: string): void {
        this.routeService.loadCitiesForProvinceOrigin(term).subscribe();
    }

    loadCitiesForProvinceDestin(term: string): void {
        this.routeService.loadCitiesForProvinceDestination(term).subscribe();
    }

    //===========Regustrar y Actualizar===========

    openDialogRoutes(route?: RouteResponse) {
        this.formRoute.reset();
        this.selectedProvinceDestinId.set(null);
        this.routeService.clearCitiesOrigin();
        this.routeService.clearCitiesOrigin();
        this.editMode.set(!!route);
        this.routeId = route ? route.id : null;
        this.isSubmitted = false;

        if (route) {
            const formData = {
                id: route.id,
                distanceInKm: route.distanceInKm,
                clientRate: route.clientRate,
                carrierRate: route.carrierRate,
                originId: route.originId,
                destinationId: route.destinationId
            };
            setTimeout(() => {
                this.formRoute.patchValue(formData, { emitEvent: false });
            });
        }
        this.loadAllProvinces();
        this.dialogRoutes.set(true);
    }
    closeDialogRoutes(): void {
        this.dialogRoutes.set(false);
    }

    onSubmitRoutes() {
        console.log('Form submitted:', this.formRoute.value);
        if (!this.checkFormValidity()) {
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
        let data: any = {
            distanceInKm: formValue.distanceInKm,
            clientRate: formValue.clientRate || '',
            carrierRate: formValue.carrierRate || '',
            originId: formValue.originId,
            destinationId: formValue.destinationId
        };

        const operation = this.editMode() && this.routeId ? this.routeService.updateRoute(this.routeId, data) : this.routeService.registerRoute(data);
        operation.subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: this.editMode() ? 'Ruta actualizada correctamente' : 'Ruta creada correctamente',
                    life: 3000
                });
                this.closeDialogRoutes();
                this.formRoute.reset();
                this.isSubmitted = false;
                this.routeId = null;
                this.editMode.set(false);
                this.loadRoutes();
            },
            error: () => {
                this.isSubmitted = false;
            }
        });
    }

    //validaciones del formulario
    checkFormValidity(): boolean {
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
        return isValid;
    }
}
