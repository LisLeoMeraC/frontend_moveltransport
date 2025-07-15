import { Component, effect, inject, OnInit, signal, ViewChild } from '@angular/core';
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
export class RouteComponent implements OnInit {
    ngOnInit(): void {
      this.loadRoutes();
    }

    private routeService = inject(RouteService);
    private destroy$ = new Subject<void>();
    private searchSubject = new Subject<string>();

    routes = this.routeService.routesList;
    isLoading = this.routeService.isLoading;
    hasError = this.routeService.hasError;
    pagination = this.routeService.paginationData;

    pageSize = signal(5);
    first = signal(0);

    searchTerm: string = '';

    constructor(private messageService: MessageService) {
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

    @ViewChild('paginator') paginator!: Paginator;

    loadRoutes(page: number = 1, limit: number = this.pageSize()): void {
        this.routeService.loadRoutes(page, limit).subscribe(() => {
            if (this.paginator) {
                if (page === 1) this.first.set(0);
            }
        });
    }

    onPageChange(event: any): void {
        const newPage = event.page + 1; // PrimeNG usa base 0
        const newSize = event.rows;

        this.pageSize.set(newSize);

        if (this.searchTerm.trim() === '') {
            this.loadRoutes(newPage, newSize);
        } 
    }
}
