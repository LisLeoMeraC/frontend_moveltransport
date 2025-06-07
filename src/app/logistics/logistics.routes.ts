import { Routes } from "@angular/router";
import { HomeLogisticaComponent } from "./home-logistica/home-logistica.component";
import { VehicleComponent } from "./vehicle/vehicle.component";
import { Component } from "@angular/core";
import { CompanyComponent } from "./company/company.component";
import { DriverComponent } from "./drivers/driver.component";
import { FletesComponent } from "./fletes/fletes.component";
import { LiquidacionesComponent } from "./liquidaciones/liquidaciones.component";
import { VehicleOwnerComponent } from "./vehicle-owner/vehicle-owner.component";

export default [
    { path: '', redirectTo: 'vehiculos', pathMatch: 'full' },
    {path:'vehicle-owner', data: { breadcrumb: 'Propietarios' }, component: VehicleOwnerComponent},
    { path: 'vehicle', data: { breadcrumb: 'Vehiculos' }, component: VehicleComponent },
    { path: 'company', data: { breadcrumb: 'Compania' }, component: CompanyComponent },
    { path: 'drivers', data: { breadcrumb: 'Conductores' }, component: DriverComponent },
    { path: 'fletes', data: { breadcrumb: 'Fletes' }, component: FletesComponent },
    { path: 'liquidaciones', data: { breadcrumb: 'Liquidaciones' }, component: LiquidacionesComponent },
    { path: '**', redirectTo: '/app/notfound' }
] as Routes;
