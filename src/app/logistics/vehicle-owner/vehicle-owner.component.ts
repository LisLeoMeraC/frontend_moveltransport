import { CommonModule } from '@angular/common';
import { Component, effect, inject, OnInit, signal, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
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
import { VehicleOwnerService } from '../../pages/service/vehicle-owner.service';
import { catchError, debounceTime, distinctUntilChanged, filter, of, Subject, switchMap, tap } from 'rxjs';
import { IdentificationType } from '../../pages/models/company';
import { getSpanishPaginatorIntl } from '../../config/getSpanishPaginatorIntl';
import { VehicleOwnerResponse } from '../../pages/models/vehicle-owner';

@Component({
  selector: 'app-vehicle-owner',
  standalone: true,
  imports: [CommonModule, ToolbarModule, TableModule, InputTextModule, IconFieldModule, InputIconModule, ButtonModule, ReactiveFormsModule,
    DialogModule, DropdownModule, ToastModule, MatPaginatorModule, MatProgressSpinnerModule, SelectButtonModule, FormsModule],
  templateUrl: './vehicle-owner.component.html',
  styleUrl: './vehicle-owner.component.scss',
  providers: [MessageService, { provide: MatPaginatorIntl, useValue: getSpanishPaginatorIntl() }]
})
export class VehicleOwnerComponent implements OnInit {


  showNumberOnlyWarning = false;
  dialogVehicleOwner = false;
  registerFormVehicleOwner: FormGroup;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  private vehicleOwnerService = inject(VehicleOwnerService);
  private destroy$ = new Subject<void>();


  vehicleOwners = this.vehicleOwnerService.vehicleOwnersList;
  isLoading = this.vehicleOwnerService.isLoading;
  hasError = this.vehicleOwnerService.hasError;
  pagination = this.vehicleOwnerService.paginationData;
  pageSize = signal(5);


  editMode = false;
  vehicleOwnerId: string | null = null;


  isSubmitted = true;
  isDeleting = false;

  identificationTypes = this.vehicleOwnerService.getIdentificationTypes();


  //Para ver si hay una personaa con una identificación ya registrada
  private searchTimeout: any;
  isSearching = false;
  isExistingOwner = false;


  constructor(private fb: FormBuilder, private messageService: MessageService) {

    this.registerFormVehicleOwner = this.fb.group({
      identification: ['', [Validators.required, Validators.maxLength(13), this.validarIdentificacion.bind(this)]],
      identificationType: [{ value: null, disabled: true }, Validators.required],
      name: [{ value: null, disabled: true }, Validators.required],
      address: [{ value: null, disabled: true }],
      phone: [{ value: null, disabled: true }, [Validators.maxLength(10)]],
      email: [{ value: null, disabled: true }, Validators.email]
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
    this.registerFormVehicleOwner.get('identificationType')?.valueChanges.subscribe(value => {
      this.registerFormVehicleOwner.get('identification')?.reset();
      this.showNumberOnlyWarning = false
    });
  }


  ngOnInit(): void {
    this.loadVehicleOwners();
    this.registerFormVehicleOwner.get('identification')?.valueChanges
      .pipe(
        debounceTime(3000),
        filter(value => value && value.length >= 10),
        distinctUntilChanged(),
        tap(() => {
          this.isSearching = true;
          // Deshabilitar el campo mientras se busca
          this.registerFormVehicleOwner.get('identification')?.disable();
        }),
        switchMap(identification =>
          this.vehicleOwnerService.searchByIdentification(identification).pipe(
            catchError(() => {
              this.isSearching = false;
              this.registerFormVehicleOwner.get('identification')?.enable();
              return of(null);
            })
          )
        )
      )
      .subscribe(response => {
        this.isSearching = false;
        this.registerFormVehicleOwner.get('identification')?.enable();

        if (response?.statusCode === 200 && response.data) {
          this.fillFormWithExistingOwner(response.data);
          this.isExistingOwner = true;
        } else {
          this.enableFormForNewOwner();
          this.isExistingOwner = false;
        }
      });
  }

  private fillFormWithExistingOwner(data: any): void {
    // Primero habilitamos temporalmente los campos para poder actualizarlos
    this.registerFormVehicleOwner.get('identificationType')?.enable();
    this.registerFormVehicleOwner.get('name')?.enable();
    this.registerFormVehicleOwner.get('address')?.enable();
    this.registerFormVehicleOwner.get('phone')?.enable();
    this.registerFormVehicleOwner.get('email')?.enable();

    // Llenamos todos los campos incluyendo la identificación
    this.registerFormVehicleOwner.patchValue({
      identification: data.identification, // Mantenemos el mismo número
      identificationType: data.identificationType,
      name: data.name,
      address: data.address,
      phone: data.phone,
      email: data.email
    }, { emitEvent: false });

    // Deshabilitamos todos los campos excepto identificación
    Object.keys(this.registerFormVehicleOwner.controls).forEach(key => {
      if (key !== 'identification') {
        this.registerFormVehicleOwner.get(key)?.disable();
      }
    });
  }


  private enableFormForNewOwner(): void {
    // Habilitar todos los campos excepto identificación
    Object.keys(this.registerFormVehicleOwner.controls).forEach(key => {
      if (key !== 'identification') {
        this.registerFormVehicleOwner.get(key)?.enable();
      }
    });

    // Si ya se seleccionó un tipo de identificación, deshabilitar el campo de identificación
    if (this.registerFormVehicleOwner.get('identificationType')?.value) {
      this.registerFormVehicleOwner.get('identification')?.disable();
    }
  }





  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


  loadVehicleOwners(page: number = 1, limit: number = this.pageSize()): void {
    this.vehicleOwnerService.loadVehicleOwners(page, limit).subscribe(() => {
      if (this.paginator) {
        this.paginator.pageIndex = page - 1;
        this.paginator.pageSize = limit;
      }
    }
    );
  }

  ngAfterViewInit(): void {
    if (this.paginator) {
      this.paginator.page.subscribe(() => {
        const pageIndex = this.paginator.pageIndex + 1;
        const pageSize = this.paginator.pageSize;
        this.loadVehicleOwners(pageIndex, pageSize);
      });
    }
  }


  validarIdentificacion(control: AbstractControl): ValidationErrors | null {
    const tipoIdentificacion = this.registerFormVehicleOwner?.get('identificationType')?.value;
    const value = control.value;

    if (!value) return null;

    if (tipoIdentificacion === IdentificationType.passport) {
      return null;
    }
    const onlyNumbers = /^\d+$/.test(value);
    return onlyNumbers ? null : { onlyNumbers: true };
  }


  onKeyPressIdentificacion(event: KeyboardEvent) {
    const identificationType = this.registerFormVehicleOwner.get('identificationType')?.value;

    if (identificationType &&
      [IdentificationType.ruc, IdentificationType.dni].includes(identificationType)) {
      const pattern = /[0-9]/;
      const inputChar = String.fromCharCode(event.charCode);

      if (!pattern.test(inputChar)) {
        this.showNumberOnlyWarning = true;
        setTimeout(() => this.showNumberOnlyWarning = false, 2000);
        event.preventDefault();
      }
    }
  }


  onSubmitVehicleOwner() {
    if (this.registerFormVehicleOwner.invalid) {
      this.registerFormVehicleOwner.markAllAsTouched();
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Por favor complete todos los campos requeridos',
        life: 5000,
      });
      return;
    }

    this.isSubmitted = true;

    const formValue = this.registerFormVehicleOwner.value;

    // Datos comunes a ambas operaciones
    let vehicleOwnerData: any = {
      name: formValue.name,
      address: formValue.address || undefined,
      email: formValue.email || undefined,
      phone: formValue.phone || undefined,
    };

    // Solo incluir identificación si NO estamos en modo edición
    if (!this.editMode) {
      vehicleOwnerData = {
        ...vehicleOwnerData,
        identification: formValue.identification?.trim(),
        identificationType: formValue.identificationType
      };
    }


    const operation = this.editMode && this.vehicleOwnerId
      ? this.vehicleOwnerService.updateVehicleOwner(this.vehicleOwnerId, vehicleOwnerData)
      : this.vehicleOwnerService.registerVehicleOwner(vehicleOwnerData);

    operation.subscribe({
      next: () => {
        this.dialogVehicleOwner = false;
        this.registerFormVehicleOwner.reset();
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: this.editMode
            ? 'Propietario actualizado correctamente'
            : ' Propietario registrado correctamente',
          life: 5000,
        });
        this.editMode = false;
        this.vehicleOwnerId = null;
        this.loadVehicleOwners();
        this.isSubmitted = false;
      },
      error: (err) => {
        console.error('Error en el componente:', err);
        this.isSubmitted = false;
      }
    });
  }



  openDialogVehicleOwner(vehicleOwner?: VehicleOwnerResponse) {
    this.registerFormVehicleOwner.reset();
    this.editMode = !!vehicleOwner;
    this.vehicleOwnerId = vehicleOwner?.id || null;
    this.isSubmitted = false;
    this.isExistingOwner = false;

    // Habilitar solo el campo de identificación inicialmente
    Object.keys(this.registerFormVehicleOwner.controls).forEach(key => {
      if (key !== 'identification') {
        this.registerFormVehicleOwner.get(key)?.disable();
      } else {
        this.registerFormVehicleOwner.get(key)?.enable();
      }
    });

    if (vehicleOwner) {
      const formData = {
        identificationType: vehicleOwner.subject.identificationType,
        identification: vehicleOwner.subject.identification.trim(),
        name: vehicleOwner.subject.name,
        address: vehicleOwner.subject.address,
        phone: vehicleOwner.subject.phone,
        email: vehicleOwner.subject.email || null
      };

      setTimeout(() => {
        this.registerFormVehicleOwner.patchValue(formData, { emitEvent: false });
        // Deshabilitar todos los campos en modo edición
        Object.keys(this.registerFormVehicleOwner.controls).forEach(key => {
          this.registerFormVehicleOwner.get(key)?.disable();
        });
      });
    }
    this.dialogVehicleOwner = true;
  }


  closeDialogVehicleOwner() {
    this.dialogVehicleOwner = false;
  }



}
