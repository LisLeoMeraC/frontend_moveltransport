import { Routes } from "@angular/router";
import { HomeLogisticaComponent } from "./home-logistica/home-logistica.component";
import { VehiculosComponent } from "./vehiculos/vehiculos.component";

export default [
    { path: 'vehiculos', data: { breadcrumb: 'Vehiculos' }, component: VehiculosComponent },
    { path: '**', redirectTo: '/notfound' }
] as Routes;
