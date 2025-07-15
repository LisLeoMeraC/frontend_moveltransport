import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [CommonModule, AppMenuitem, RouterModule],
    template: `<ul class="layout-menu">
        <ng-container *ngFor="let item of model; let i = index">
            <li app-menuitem *ngIf="!item.separator" [item]="item" [index]="i" [root]="true"></li>
            <li *ngIf="item.separator" class="menu-separator"></li>
        </ng-container>
    </ul> `
})
export class AppMenu {
    model: MenuItem[] = [];

    ngOnInit() {
        this.model = [
            {
                label: 'Home',
                items: [
                    { label: 'Dashboard', icon: 'pi pi-fw pi-home', routerLink: ['/app/dashboard'] }, // Con slash inicial
                ]
            },
            {
                label: 'Administración',
                items: [
                    { label: 'Compañias', icon: 'pi pi-building-columns', routerLink: ['/app/logistics/company'] },
                    { label: 'Propietarios', icon: 'pi pi-users', routerLink: ['/app/logistics/vehicle-owner'] },
                    { label: 'Conductores', icon: 'pi pi-users', routerLink: ['/app/logistics/drivers'] },
                    { label: 'Vehiculos', icon: 'pi pi-car', routerLink: ['/app/logistics/vehicle'] },
                ]
            },
            {
                label: 'Operaciones',
                items: [
                    { label: 'Rutas', icon: 'pi pi-truck', routerLink: ['/app/logistics/routes'] },
                ]
            },
            {
                label: 'Finanzas',
                items: [
                    { label: 'Liquidaciones', icon: 'pi pi-receipt', routerLink: ['/app/logistics/liquidaciones'] }
                ]
            }
        ];
    }
}