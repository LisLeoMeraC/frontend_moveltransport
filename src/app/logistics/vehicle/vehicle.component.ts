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
  selector: 'app-vehicle',
  standalone: true,
  imports: [CommonModule,ToolbarModule,TableModule,InputTextModule,IconFieldModule,InputIconModule,ButtonModule,
    DialogModule, DropdownModule
  ],
  templateUrl: './vehicle.component.html',
  styleUrl: './vehicle.component.scss'
})
export class VehicleComponent {

  dialogVehicle:boolean=false;

  
  openDialogVehicle(){
    this.dialogVehicle=true; 
  }

  closeDialogVehicle(){
    this.dialogVehicle=false; 
  }

  



}
