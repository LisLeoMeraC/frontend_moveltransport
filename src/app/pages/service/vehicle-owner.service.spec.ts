import { TestBed } from '@angular/core/testing';

import { VehicleOwnerService } from './vehicle-owner.service';

describe('VehicleOwnerService', () => {
  let service: VehicleOwnerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VehicleOwnerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
