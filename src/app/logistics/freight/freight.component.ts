import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/inputtextarea';
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

// Interfaces para los datos ficticios
interface FreightData {
    id: string;
    clientName: string;
    freightType: string;
    status: string;
    serialReference: string;
    requestedDate: Date;
    unitsRequired: number;
    cargoUnitType: string;
    cargoCondition: string;
    originProvince: string;
    originCity: string;
    destinationProvince: string;
    destinationCity: string;
    observations?: string;
}

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
        InputTextarea,
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
export class FreightComponent implements OnInit {
    // Formulario
    freightForm: FormGroup;

    // Estados reactivos
    pageSize = signal(5);
    first = signal(1);
    currentStep = 1;

    // Diálogos
    dialogFreight = signal(false);
    editMode = signal(false);

    // Dato
    private freightService = inject(FreightService);
    freights = signal<FreightData[]>([]);
    selectedFreight?: FreightData;

    // Menú
    menuItems: MenuItem[] = [];
    @ViewChild('menu') menu!: Menu;

    // Búsqueda
    searchTerm = '';

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
    }

    ngOnInit(): void {
        this.initMenuItems();
    }

    initMenuItems(): void {
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

    toggleMenu(event: Event, freight: FreightData): void {
        this.selectedFreight = freight;
        this.menu.toggle(event);
    }

    openDialogFreight(freight?: FreightData): void {
        this.freightForm.reset();
        this.editMode.set(!!freight);
        this.currentStep = 1; // Resetear al primer paso

        if (freight) {
            // Cargar datos para edición
            this.freightForm.patchValue({
                client: freight.clientName,
                freightType: freight.freightType,
                status: freight.status,
                serialReference: freight.serialReference,
                requestedDate: freight.requestedDate,
                unitsRequired: freight.unitsRequired,
                cargoUnitType: freight.cargoUnitType,
                cargoCondition: freight.cargoCondition,
                observations: freight.observations,
                originProvince: freight.originProvince,
                originCity: freight.originCity,
                destinationProvince: freight.destinationProvince,
                destinationCity: freight.destinationCity
            });
        } else {
            // Valores por defecto para nuevo registro
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
        this.currentStep = 1; // Resetear al primer paso
    }

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
                // Simular creación de nuevo flete
                const newFreight: FreightData = {
                    id: (this.freights().length + 1).toString(),
                    clientName: '',
                    freightType: formValue.freightType,
                    status: formValue.status,
                    serialReference: formValue.serialReference,
                    requestedDate: formValue.requestedDate,
                    unitsRequired: formValue.unitsRequired,
                    cargoUnitType: formValue.cargoUnitType,
                    cargoCondition: formValue.cargoCondition,
                    originProvince: formValue.originProvince,
                    originCity: formValue.originCity,
                    destinationProvince: formValue.destinationProvince,
                    destinationCity: formValue.destinationCity,
                    observations: formValue.observations
                };

                this.freights.update((freights) => [...freights, newFreight]);

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

    viewFreightDetails(freight: FreightData): void {
        this.messageService.add({
            severity: 'info',
            summary: 'Información',
            detail: `Viendo detalles del flete: ${freight.serialReference}`,
            life: 3000
        });
    }

    deleteFreight(freight: FreightData): void {
        this.freights.update((freights) => freights.filter((f) => f.id !== freight.id));
        this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Flete eliminado correctamente',
            life: 3000
        });
    }

    getStatusSeverity(status: string): string {
        switch (status) {
            case 'PENDING':
                return 'warning';
            case 'IN_PROGRESS':
                return 'info';
            case 'COMPLETED':
                return 'success';
            case 'CANCELLED':
                return 'danger';
            default:
                return 'secondary';
        }
    }

    onPageChange(event: any): void {
        // Implementar paginación si es necesario
        console.log('Page change:', event);
    }

    // Métodos para el stepper
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

    /*   isStep1Valid(): boolean {
        const step1Fields = ['client', 'freightType', 'status', 'serialReference', 'requestedDate'];
        return step1Fields.every((field) => {
            const control = this.freightForm.get(field);
            return control && control.valid;
        });
    }

    isStep2Valid(): boolean {
        const step2Fields = ['unitsRequired', 'cargoUnitType', 'cargoCondition'];
        return step2Fields.every((field) => {
            const control = this.freightForm.get(field);
            return control && control.valid;
        });
    }

    isStep3Valid(): boolean {
        const step3Fields = ['originProvince', 'originCity', 'destinationProvince', 'destinationCity'];
        return step3Fields.every((field) => {
            const control = this.freightForm.get(field);
            return control && control.valid;
        });
    }*/
}
