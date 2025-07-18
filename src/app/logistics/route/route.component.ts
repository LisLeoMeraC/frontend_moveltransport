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

@Component({
    selector: 'app-route',
    standalone: true,
    imports: [ToastModule, ToolbarModule, TableModule, IconFieldModule, InputIconModule, ButtonModule, InputTextModule, PaginatorModule, CommonModule],
    templateUrl: './route.component.html',
    styleUrl: './route.component.scss'
})
export class RouteComponent implements OnInit, OnDestroy {
    //Estados reactivos
    pageSize = signal(5);
    first = signal(0);

    //Datos y servicios
    private routeService = inject(RouteService);
    routes = this.routeService.routesList;
    isLoading = this.routeService.isLoading;
    hasError = this.routeService.hasError;
    pagination = this.routeService.paginationData;
    searchTerm: string = '';

    //RxJS
    private destroy$ = new Subject<void>();
    private searchSubject = new Subject<string>();

    //ViewChild
    @ViewChild('paginator') paginator!: Paginator;

    constructor(private messageService: MessageService) {
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
    }

    //=========Ciclo de vida del componente=========
    ngOnInit(): void {
        this.loadRoutes();
    }
    ngOnDestroy(): void {
        throw new Error('Method not implemented.');
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
}
