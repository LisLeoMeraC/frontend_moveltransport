import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { Dropdown, DropdownModule } from 'primeng/dropdown';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { Table, TableModule } from 'primeng/table';
import { Toolbar, ToolbarModule } from 'primeng/toolbar';

@Component({
  selector: 'app-companias',
  standalone: true,
  imports: [CommonModule, ToolbarModule, TableModule,InputTextModule,IconFieldModule,InputIconModule,ButtonModule,
    DialogModule, DropdownModule],
  templateUrl: './companias.component.html',
  styleUrl: './companias.component.scss'
})
export class CompaniasComponent {

  dialogCompany: boolean = false;


  openDialogCompany() {
    this.dialogCompany = true;
  }
  
  closeDialogCompany() {
    this.dialogCompany = false;
  }


}
