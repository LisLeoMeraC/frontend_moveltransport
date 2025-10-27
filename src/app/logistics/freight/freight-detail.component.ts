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

@Component({
    selector: 'app-freight-detail',
    standalone: true,
    imports: [CommonModule, RouterModule, TagModule, CardModule, ProgressBarModule, ButtonModule, ToolbarModule, ToastModule],
    templateUrl: './freight-detail.component.html',
    styleUrls: ['./freight-detail.component.scss']
})
export class FreightDetailComponent implements OnInit, OnDestroy {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    freightService = inject(FreightService);

    id = signal<string | null>(null);

    ngOnInit(): void {
        this.route.paramMap.subscribe((params) => {
            const id = params.get('id');
            this.id.set(id);
            if (id) {
                this.freightService.getFreightById(id).subscribe();
            }
        });
    }

    ngOnDestroy(): void {}

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
}
