import { CommonModule } from '@angular/common';
import { Component, effect, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MenuItem, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/inputtextarea';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { Menu, MenuModule } from 'primeng/menu';
import { Paginator, PaginatorModule } from 'primeng/paginator';
import { DepotService } from '../../pages/service/depot.service';
import { DepotResponse } from '../../pages/models/depot.model';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'app-depot',
    standalone: true,
    imports: [CommonModule, ToolbarModule, TableModule, InputTextModule, InputTextarea, IconFieldModule, InputIconModule, ButtonModule, ReactiveFormsModule, DialogModule, ToastModule, PaginatorModule, MenuModule, FormsModule],
    templateUrl: './depot.component.html',
    styleUrl: './depot.component.scss',
    providers: [MessageService]
})
export class DepotComponent implements OnInit, OnDestroy {
    // Formularios
    formDepot: FormGroup;

    // Estados reactivos
    pageSize = signal(5);
    first = signal(1);

    // Flags y controles de UI
    editMode = false;

    // Diálogos
    dialogDepot: boolean = false;
    dialogDeleteDepot: boolean = false;

    // Selecciones actuales
    depotId: string | null = null;
    depotToDelete: DepotResponse | null = null;
    selectedDepot?: DepotResponse;

    //Datos y servicios
    private depotService = inject(DepotService);
    depots = this.depotService.depotList;
    isLoading = this.depotService.isLoading;
    hasError = this.depotService.hasError;
    pagination = this.depotService.paginationData;
    searchTerm: string = '';
    menuItems: MenuItem[] = [];

    //RxJS
    private destroy$ = new Subject<void>();
    private searchSubject = new Subject<string>();

    // ViewChilds
    @ViewChild('menu') menu!: Menu;
    @ViewChild('paginator') paginator!: Paginator;

    constructor(
        private fb: FormBuilder,
        private messageService: MessageService
    ) {
        this.formDepot = this.fb.group({
            name: [null, Validators.required],
            address: [null, Validators.required],
            phone: [null, [Validators.maxLength(15)]],
            email: [null, [Validators.email]],
            remarks: [null]
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

        // Búsqueda reactiva
        this.searchSubject.pipe(takeUntil(this.destroy$), debounceTime(800), distinctUntilChanged()).subscribe((term) => {
            if (term.trim() === '') {
                this.loadDepots(1, this.pageSize());
            } else {
                this.searchDepots(term, 1, this.pageSize());
            }
        });
    }

    ngOnInit(): void {
        this.initMenuItems();
        this.loadDepots();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
    }

    // Inicialización del menú
    initMenuItems(): void {
        this.menuItems = [
            {
                label: 'Editar',
                icon: 'pi pi-pencil',
                command: () => {
                    if (this.selectedDepot) {
                        this.openDialogDepot(this.selectedDepot);
                    }
                }
            }
        ];
    }

    // Acciones con el menú
    toggleMenu(event: Event, depot: DepotResponse): void {
        this.selectedDepot = depot;
        this.menu.toggle(event);
    }

    //Listar depositos
    loadDepots(page: number = this.first(), limit: number = this.pageSize()): void {
        this.depotService.getDepots(page, limit).subscribe(() => {
            if (this.paginator) {
                if (page === 1) this.first.set(0);
            }
        });
    }

    searchDepots(term: string, page: number = 1, limit: number = this.pageSize()): void {
        this.depotService.getDepots(page, limit, term).subscribe(() => {
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
            this.loadDepots(newPage, newSize);
        } else {
            this.searchDepots(this.searchTerm, newPage, newSize);
        }
    }

    // Diálogo de depósito
    openDialogDepot(depot?: DepotResponse) {
        this.formDepot.reset();
        this.editMode = !!depot;
        this.depotId = depot?.id.toString() || null;
        this.dialogDepot = true;

        if (depot) {
            this.formDepot.patchValue({
                name: depot.name,
                address: depot.address,
                phone: depot.phone,
                email: depot.email,
                remark: depot.remarks
            });
        }
    }

    closeDialogDepot() {
        this.dialogDepot = false;
        this.formDepot.reset();
    }

    onSubmitDepot() {
        const nameControl = this.formDepot.get('name');
        const addressControl = this.formDepot.get('address');
        const contactControl = this.formDepot.get('contact');
        const emailControl = this.formDepot.get('email');

        // Marcar todos los campos como tocados para mostrar errores
        this.formDepot.markAllAsTouched();

        // Validar campos requeridos
        if ((nameControl && nameControl.invalid) || (addressControl && addressControl.invalid)) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Por favor complete los campos requeridos (Nombre y Dirección)',
                life: 5000
            });
            return;
        }

        // Validar longitud del contacto
        if (contactControl && contactControl.hasError('maxlength')) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'El contacto no puede tener más de 15 caracteres',
                life: 5000
            });
            return;
        }

        // Validar formato del email
        if (emailControl && emailControl.hasError('email')) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Por favor ingrese un correo electrónico válido',
                life: 5000
            });
            return;
        }

        const formValue = this.formDepot.value;
        const depotData = {
            name: formValue.name,
            address: formValue.address,
            phone: formValue.phone || null,
            email: formValue.email || null,
            remarks: formValue.remarks || null
        };

        const operation = this.editMode && this.depotId ? this.depotService.updateDepot(this.depotId, depotData) : this.depotService.registerDepot(depotData);

        operation.subscribe({
            next: () => {
                this.dialogDepot = false;
                this.formDepot.reset();
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: this.editMode ? 'Depósito actualizado correctamente' : 'Depósito registrado correctamente',
                    life: 5000
                });
                this.editMode = false;
                this.depotId = null;
                this.loadDepots();
            },
            error: (err) => {
                console.error('Error en el componente:', err);
            }
        });
    }
}
