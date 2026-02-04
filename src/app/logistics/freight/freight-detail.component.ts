import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FreightService } from '../../pages/service/freight.service';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { ProgressBarModule } from 'primeng/progressbar';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { ToastModule } from 'primeng/toast';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/inputtextarea';
import { InputSwitch } from 'primeng/inputswitch';
import { MessageService } from 'primeng/api';
import { RouteService } from '../../pages/service/route.service';
import { DepotService } from '../../pages/service/depot.service';

@Component({
    selector: 'app-freight-detail',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        TagModule,
        CardModule,
        ProgressBarModule,
        ButtonModule,
        ToolbarModule,
        ToastModule,
        ReactiveFormsModule,
        FormsModule,
        DropdownModule,
        CalendarModule,
        InputTextModule,
        InputTextarea
    ],
    templateUrl: './freight-detail.component.html',
    styleUrls: ['./freight-detail.component.scss'],
    providers: [MessageService]
})
export class FreightDetailComponent implements OnInit, OnDestroy {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    freightService = inject(FreightService);
    private fb = inject(FormBuilder);
    private messageService = inject(MessageService);
    private routeService = inject(RouteService);
    private depotService = inject(DepotService);

    id = signal<string | null>(null);
    editMode = signal<boolean>(false);

    // lists/signals
    provinces = this.routeService.provinceList;
    originCities = this.routeService.originCityList;
    destinationCities = this.routeService.destinationCitiesList;
    depots = this.depotService.depotList;

    freightTypes = this.freightService.getFreightTypes();
    freightStatuses = this.freightService.getFreightStatuses();
    cargoUnitTypes = this.freightService.getCargoUnitTypes();
    cargoConditions = this.freightService.getCargoConditions();

    selectedProvinceOriginId = signal<string | null>(null);
    selectedProvinceDestinId = signal<string | null>(null);

    selectedDocumentIds = signal<Set<string>>(new Set());

    documents = computed(() => {
        const item: any = this.freightService.freightItem();
        if (!item) return [] as Array<{ id: string; name: string; url: string; canRemove: boolean }>;

        const raw = item.files as Array<any>;
        if (!Array.isArray(raw)) return [] as Array<{ id: string; name: string; url: string; canRemove: boolean }>;

        return raw
            .map((d) => {
                const url = d?.storageUrl ? String(d.storageUrl).trim() : '';
                if (!url) return null;
                const name = d?.fileName ? String(d.fileName) : 'documento';
                const id = d?.id ? String(d.id) : url;
                const canRemove = Boolean(d?.id);
                return { id, name, url, canRemove };
            })
            .filter((x): x is { id: string; name: string; url: string; canRemove: boolean } => Boolean(x));
    });

    freightForm: FormGroup = this.fb.group({
        freightStatus: ['', Validators.required],
        type: ['', Validators.required],
        serialReference: [''],
        requestedDate: [null, Validators.required],
        requestedUnits: [1, [Validators.required, Validators.min(1)]],
        cargoUnitType: ['', Validators.required],
        cargoCondition: ['', Validators.required],
        cargoDescription: [''],
        originProvince: [null],
        originId: [null, Validators.required],
        originReference: [''],
        destinationProvince: [null],
        destinationId: [null, Validators.required],
        destinationReference: [''],
        originDepotId: [null],
        destinationDepotId: [null],
        remarks: ['']
    });

    ngOnInit(): void {
        this.route.paramMap.subscribe((params) => {
            const id = params.get('id');
            this.id.set(id);
            if (id) {
                this.freightService.getFreightById(id).subscribe(({ data }) => {
                    // preload form values when available
                    if (data) {
                        this.patchFormFromData();
                        // preload provinces/cities
                        this.loadInitialGeodata();
                    }
                });
            }
        });

        // load lookup lists
        this.routeService.loadProvinces().subscribe();
        this.depotService.getDepots(1, 50).subscribe();

        // disable city dropdowns until province chosen
        this.freightForm.get('originId')?.disable();
        this.freightForm.get('destinationId')?.disable();
    }

    ngOnDestroy(): void {}

    openDocument(url: string): void {
        if (!url) return;
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    isDocumentSelected(id: string): boolean {
        return this.selectedDocumentIds().has(id);
    }

    toggleDocumentSelection(id: string, checked: boolean): void {
        const next = new Set(this.selectedDocumentIds());
        if (checked) next.add(id);
        else next.delete(id);
        this.selectedDocumentIds.set(next);
    }

    clearDocumentSelection(): void {
        this.selectedDocumentIds.set(new Set());
    }

    removeDocument(_docId: string): void {
        this.messageService.add({
            severity: 'warn',
            summary: 'Pendiente',
            detail: 'No funca XXXXXXXDDDDDDDD.',
            life: 3500
        });
    }

    removeSelectedDocuments(): void {
        if (!this.selectedDocumentIds().size) return;
        this.messageService.add({
            severity: 'warn',
            summary: 'Pendiente',
            detail: 'No Funca  XXXXXXXDDDDDDDD.',
            life: 3500
        });
    }

    getStatusSeverity(status: string): string {
        switch ((status || '').toLowerCase()) {
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

    getStatusProgress(status: string): number {
        switch ((status || '').toLowerCase()) {
            case 'pending':
                return 1;
            case 'in_transit':
                return 50;
            case 'completed':
                return 100;
            case 'canceled':
            case 'delayed':
                return 25;
            default:
                return 0;
        }
    }

    getFreightTypeLabel(type: string): string {
        switch (type) {
            case 'export':
                return 'Exportación';
            case 'import':
                return 'Importación';
            case 'internal':
                return 'Interno';
            case 'rescue':
                return 'Rescate';
            default:
                return type;
        }
    }

    getCargoConditionLabel(condition: string): string {
        switch (condition) {
            case 'dry':
                return 'Seco';
            case 'refrigerated':
                return 'Refrigerado';
            case 'hazardous':
                return 'Peligroso';
            default:
                return condition;
        }
    }

    getCargoUnitTypeLabel(unitType: string): string {
        switch (unitType) {
            case 'SD20':
                return "Contenedor 20' Estándar";
            case 'SD40':
                return "Contenedor 40' Estándar";
            case 'HC40':
                return "Contenedor 40' High Cube";
            case 'DUMP':
                return 'Volquete';
            case 'FLTB':
                return 'Plataforma';
            case 'TANK':
                return 'Tanque';
            case 'DRYV':
                return 'Caja Seca';
            default:
                return unitType;
        }
    }

    goBack(): void {
        this.router.navigate(['../'], { relativeTo: this.route });
    }

    toggleEdit(): void {
        this.editMode.set(!this.editMode());
        if (this.editMode()) {
            this.patchFormFromData();
        }
    }

    private patchFormFromData(): void {
        const selected = this.freightService.freightItem();
        if (!selected) return;
        this.freightForm.patchValue({
            freightStatus: selected.freightStatus,
            type: selected.type,
            serialReference: selected.serialReference,
            requestedDate: selected.requestedDate ? new Date(selected.requestedDate) : null,
            requestedUnits: selected.requestedUnits,
            cargoUnitType: selected.cargoUnitType,
            cargoCondition: selected.cargoCondition,
            cargoDescription: selected.cargoDescription,
            originId: selected.originId,
            originReference: selected.originReference,
            destinationId: selected.destinationId,
            destinationReference: selected.destinationReference,
            originDepotId: selected.originDepotId || null,
            destinationDepotId: selected.destinationDepotId || null,
            remarks: selected.remarks
        });

        // Si ya existen ciudades seleccionadas en el item, habilitar los controles
        if (selected.originId) {
            this.freightForm.get('originId')?.enable();
        }
        if (selected.destinationId) {
            this.freightForm.get('destinationId')?.enable();
        }
    }

    private loadInitialGeodata(): void {
        const selected = this.freightService.freightItem();
        if (!selected) return;
        // pre-select and load cities by province if available in response
        const originProvinceId = selected.origin?.provinceId || null;
        const destinationProvinceId = selected.destination?.provinceId || null;

        if (originProvinceId) {
            this.selectedProvinceOriginId.set(originProvinceId);
            this.freightForm.get('originProvince')?.setValue(originProvinceId);
            this.freightForm.get('originId')?.enable();
            this.routeService.loadCitiesForProvinceOrigin(originProvinceId, { page: 1, limit: 50 }).subscribe(() => {
                // keep selected origin city
            });
        }

        if (destinationProvinceId) {
            this.selectedProvinceDestinId.set(destinationProvinceId);
            this.freightForm.get('destinationProvince')?.setValue(destinationProvinceId);
            this.freightForm.get('destinationId')?.enable();
            this.routeService.loadCitiesForProvinceDestination(destinationProvinceId, { page: 1, limit: 50 }).subscribe(() => {
                // keep selected destination city
            });
        }
    }

    onProvinceOriginChange(event: { value: string }): void {
        const provinceId = event.value;
        this.selectedProvinceOriginId.set(provinceId);
        if (provinceId) {
            this.freightForm.get('originId')?.enable();
            this.freightForm.get('originId')?.setValue(null);
            this.routeService.loadCitiesForProvinceOrigin(provinceId, { page: 1, limit: 50 }).subscribe();
        } else {
            this.freightForm.get('originId')?.disable();
            this.freightForm.get('originId')?.setValue(null);
            this.routeService.clearCitiesOrigin();
        }
    }

    onProvinceDestinChange(event: { value: string }): void {
        const provinceId = event.value;
        this.selectedProvinceDestinId.set(provinceId);
        if (provinceId) {
            this.freightForm.get('destinationId')?.enable();
            this.freightForm.get('destinationId')?.setValue(null);
            this.routeService.loadCitiesForProvinceDestination(provinceId, { page: 1, limit: 50 }).subscribe();
        } else {
            this.freightForm.get('destinationId')?.disable();
            this.freightForm.get('destinationId')?.setValue(null);
            this.routeService.clearCitiesDestination();
        }
    }

    saveChanges(): void {
        if (!this.id() || !this.freightForm.valid) {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Formulario inválido', life: 3000 });
            return;
        }
        // getRawValue para incluir controles deshabilitados si los hubiera
        const v = this.freightForm.getRawValue() as any;
        const payload: any = {
            freightStatus: v.freightStatus,
            type: v.type,
            serialReference: v.serialReference?.toString().trim() || undefined,
            requestedDate: v.requestedDate ? new Date(v.requestedDate).toISOString().split('T')[0] : undefined,
            requestedUnits: v.requestedUnits != null ? Number(v.requestedUnits) : undefined,
            cargoUnitType: v.cargoUnitType,
            cargoCondition: v.cargoCondition,
            cargoDescription: v.cargoDescription?.toString().trim() || undefined,
            originId: v.originId,
            originReference: v.originReference?.toString().trim() || undefined,
            destinationId: v.destinationId,
            destinationReference: v.destinationReference?.toString().trim() || undefined,
            originDepotId: v.originDepotId || undefined,
            destinationDepotId: v.destinationDepotId || undefined,
            remarks: v.remarks?.toString().trim() || undefined
        };

        // Log para diagnóstico rápido
        // eslint-disable-next-line no-console
        console.log('Updating freight', this.id(), payload);

        this.freightService.updateFreight(this.id()!, payload).subscribe({
            next: (response) => {
                if (response.statusCode >= 200 && response.statusCode < 300) {
                    this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Flete actualizado', life: 3000 });
                    // refresh current item
                    this.freightService.getFreightById(this.id()!).subscribe();
                    this.editMode.set(false);
                }
            },
            error: (err) => {
                // eslint-disable-next-line no-console
                console.error('Update error', err);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar', life: 3000 });
            }
        });
    }
}
