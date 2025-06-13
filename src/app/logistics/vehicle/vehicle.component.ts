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
import { Subject } from 'rxjs';
import { MatPaginator } from '@angular/material/paginator';
import { FormBuilder } from '@angular/forms';
import { MessageService } from 'primeng/api';

@Component({
    selector: 'app-vehicle',
    standalone: true,
    imports: [CommonModule, ToolbarModule, TableModule, InputTextModule, IconFieldModule, InputIconModule, ButtonModule, DialogModule, DropdownModule],
    templateUrl: './vehicle.component.html',
    styleUrl: './vehicle.component.scss'
})
export class VehicleComponent implements OnInit {
    private vehicleService = inject(VehicleService);
    private destroy$ = new Subject<void>();
    private searchSubject = new Subject<string>();

    vehicles = this.vehicleService.vehiclesList;
    isLoading = this.vehicleService.isLoading;
    hasError = this.vehicleService.hasError;
    pagination = this.vehicleService.paginationData;
    pageSize = signal(5);

    @ViewChild(MatPaginator) paginator!: MatPaginator;

    constructor(
        private fb: FormBuilder,
        private messageService: MessageService
    ) {
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
      this.loadVehicles();
    }

    ngAfterViewInit(): void {
        this.paginator.page.subscribe((event) => {
            this.pageSize.set(event.pageSize);
            const newPage = event.pageSize !== this.pagination().pageSize ? 1 : event.pageIndex + 1;
                this.loadVehicles(newPage, event.pageSize);
            
        });
    }

    dialogVehicle: boolean = false;

    openDialogVehicle() {
        this.dialogVehicle = true;
    }

    closeDialogVehicle() {
        this.dialogVehicle = false;
    }


    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

   loadVehicles(page: number = 1, limit: number = this.pageSize()): void {
        this.vehicleService.loadVewhicles(page, limit).subscribe(() => {
            if (this.paginator) {
                this.paginator.pageIndex = page - 1;
                this.paginator.pageSize = limit;
            }
        });
    }

}
