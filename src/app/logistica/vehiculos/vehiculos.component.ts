import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { ToolbarModule } from 'primeng/toolbar';

@Component({
  selector: 'app-vehiculos',
  standalone: true,
  imports: [CommonModule,ToolbarModule,TableModule,InputTextModule,IconFieldModule,InputIconModule,ButtonModule,
    DialogModule, DropdownModule
  ],
  templateUrl: './vehiculos.component.html',
  styleUrl: './vehiculos.component.scss'
})
export class VehiculosComponent {

  dialogVehicle:boolean=false;

  
  openDialogVehicle(){
    this.dialogVehicle=true; 
  }

  closeDialogVehicle(){
    this.dialogVehicle=false; 
  }

  



}
