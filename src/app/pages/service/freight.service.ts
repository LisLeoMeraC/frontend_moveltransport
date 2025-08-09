import { Injectable, signal } from '@angular/core';
import { BaseHttpService } from './base-http.service';
import { FreightResponse } from '../models/freight.model';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { MessageService } from 'primeng/api';

@Injectable({
    providedIn: 'root'
})
export class FreightService extends BaseHttpService<FreightResponse> {
    private readonly baseUrl = environment.apiUrl;
    private freights = signal<FreightResponse[]>([]);
    readonly freightsList = this.freights.asReadonly();

    constructor(
        private http: HttpClient,
        private messageService: MessageService
    ) {
        super();
    }
}
