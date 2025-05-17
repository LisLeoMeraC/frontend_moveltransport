import { Routes } from "@angular/router";
import { HomeLogisticaComponent } from "./home-logistica/home-logistica.component";
import { VehiculosComponent } from "./vehiculos/vehiculos.component";
import { Component } from "@angular/core";
import { CompaniasComponent } from "./companias/companias.component";
import { ConductoresComponent } from "./conductores/conductores.component";
import { FletesComponent } from "./fletes/fletes.component";
import { LiquidacionesComponent } from "./liquidaciones/liquidaciones.component";

export default [
    { path: '', redirectTo: 'vehiculos', pathMatch: 'full' },
    { path: 'vehiculos', data: { breadcrumb: 'Vehiculos' }, component: VehiculosComponent },
    { path: 'companias', data: { breadcrumb: 'Compania' }, component: CompaniasComponent },
    { path: 'conductores', data: { breadcrumb: 'Conductores' }, component: ConductoresComponent },
    { path: 'fletes', data: { breadcrumb: 'Fletes' }, component: FletesComponent },
    { path: 'liquidaciones', data: { breadcrumb: 'Liquidaciones' }, component: LiquidacionesComponent },
    { path: '**', redirectTo: '/app/notfound' }
] as Routes;
