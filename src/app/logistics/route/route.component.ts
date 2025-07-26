import { Component, effect, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { RouteService } from '../../pages/service/route.service';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { Paginator, PaginatorModule } from 'primeng/paginator';
import { MenuItem, MessageService } from 'primeng/api';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { CreateRouteData, RouteResponse, UpdateRouteData } from '../../pages/models/routess.model';
import { Menu, MenuModule } from 'primeng/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
    selector: 'app-route',
    standalone: true,
    imports: [ToastModule, ToolbarModule, FormsModule, ReactiveFormsModule, MenuModule, DialogModule, SelectModule, TableModule, IconFieldModule, InputIconModule, ButtonModule, InputTextModule, PaginatorModule, CommonModule],
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
    menuItems: MenuItem[] = [];
    searchOriginTerm = signal('');
    searchDestinationTerm = signal('');

    //Flags y controles de UI
    isSubmitted = true;
    editMode = signal(false);

    //Seleeciones actuales
    selectedProvinceOriginId = signal<string | null>(null);
    selectedProvinceDestinId = signal<string | null>(null);
    routeId: string | null = null;
    selectedRoute?: RouteResponse;
    invalidRateComparison = signal(false);

    //Dialogos
    dialogRoutes = signal(false);

    //RxJS
    private destroy$ = new Subject<void>();
    private searchOriginSubject = new Subject<string>();
    private searchDestinationSubject = new Subject<string>();

    //ViewChild
    @ViewChild('paginator') paginator!: Paginator;
    @ViewChild('menu') menu!: Menu;

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

        this.formRoute = this.fb.group(
            {
                id: [''],
                originProvince: [null, Validators.required],
                distanceInKm: [null, [Validators.required, Validators.min(1)]],
                clientRate: [null, [Validators.min(0)]],
                carrierRate: [null, [Validators.min(0)]],
                originId: [{ value: '', disabled: true }, Validators.required],
                destinationId: [{ value: '', disabled: true }, Validators.required],
                destinationProvince: [null, Validators.required]
            },
            { validators: this.validateRateComparison.bind(this) }
        );
        this.formRoute.get('clientRate')?.valueChanges.subscribe(() => {
            this.checkRateComparison();
        });

        this.formRoute.get('carrierRate')?.valueChanges.subscribe(() => {
            this.checkRateComparison();
        });

        //Busquedas reactivas
        this.searchOriginSubject.pipe(takeUntil(this.destroy$), debounceTime(800), distinctUntilChanged()).subscribe((term) => {
            const trimmedOrigin = term.trim();
            const trimmedDestination = this.searchDestinationTerm().trim();

            this.searchOriginTerm.set(trimmedOrigin);

            if (trimmedOrigin === '' && trimmedDestination === '') {
                this.loadRoutes();
            } else {
                this.searchRoutes();
            }
        });

        this.searchDestinationSubject.pipe(takeUntil(this.destroy$), debounceTime(800), distinctUntilChanged()).subscribe((term) => {
            const trimmedDestination = term.trim();
            const trimmedOrigin = this.searchOriginTerm().trim();

            this.searchDestinationTerm.set(trimmedDestination);

            if (trimmedDestination === '' && trimmedOrigin === '') {
                this.loadRoutes();
            } else {
                this.searchRoutes();
            }
        });
    }

    //=========Ciclo de vida del componente=========
    ngOnInit(): void {
        this.loadRoutes();
        this.loadAllProvinces();
        this.initMenuItems();
    }
    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    //==========Inicialización=================
    initMenuItems(): void {
        this.menuItems = [
            {
                label: 'Editar',
                icon: 'pi pi-pencil',
                command: () => {
                    if (this.selectedRoute) {
                        this.openDialogRoutes(this.selectedRoute);
                    }
                }
            }
        ];
    }

    //============Acciones con el menú  ===========
    toogleMenu(event: Event, route: RouteResponse): void {
        this.selectedRoute = route;
        this.menu.toggle(event);
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

    private searchRoutes(): void {
        const page = 1;
        const size = this.pageSize();

        if (this.searchOriginTerm().trim() === '' && this.searchDestinationTerm().trim() === '') {
            this.loadRoutes(page, size);
        } else {
            this.routeService.searchRoute(page, size, this.searchOriginTerm().trim() || undefined, this.searchDestinationTerm().trim() || undefined).subscribe();
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

    //===========Regustrar y Actualizar===========

    openDialogRoutes(route?: RouteResponse) {
        this.formRoute.reset();
        this.selectedProvinceDestinId.set(null);
        this.selectedProvinceOriginId.set(null);
        this.routeService.clearCitiesOrigin();
        this.routeService.clearCitiesDestination();
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
                destinationId: route.destinationId,
                originProvince: route.origin.provinceId,
                destinationProvince: route.destination.provinceId
            };

            this.loadCitiesForProvinceOrigin(route.origin.provinceId);
            this.loadCitiesForProvinceDestin(route.destination.provinceId);

            setTimeout(() => {
                this.formRoute.patchValue(formData, { emitEvent: false });
                this.formRoute.get('originId')?.disable();
                this.formRoute.get('destinationId')?.disable();
                this.formRoute.get('originProvince')?.disable();
                this.formRoute.get('destinationProvince')?.disable();
            });
        } else {
            this.formRoute.get('originId')?.disable();
            this.formRoute.get('destinationId')?.disable();
            this.formRoute.get('originProvince')?.enable();
            this.formRoute.get('destinationProvince')?.enable();
        }
        this.loadAllProvinces();
        this.dialogRoutes.set(true);
    }
    closeDialogRoutes(): void {
        this.dialogRoutes.set(false);
        this.formRoute.reset();
    }

    onSubmitRoutes() {
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

        let baseData: UpdateRouteData = {
            distanceInKm: formValue.distanceInKm,
            clientRate: formValue.clientRate || 0,
            carrierRate: formValue.carrierRate || 0
        };

        let fullData: CreateRouteData = {
            ...baseData,
            originId: formValue.originId,
            destinationId: formValue.destinationId
        };

        const operation = this.editMode() && this.routeId ? this.routeService.updateRoute(this.routeId, baseData) : this.routeService.registerRoute(fullData);

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
            error: (error) => {
                console.error('Error:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Ocurrió un error al procesar la solicitud',
                    life: 3000
                });
                this.isSubmitted = false;
            }
        });
    }

    //======================validaciones del formulario=====================

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
