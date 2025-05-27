import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VehicleOwnerComponent } from './vehicle-owner.component';

describe('VehicleOwnerComponent', () => {
  let component: VehicleOwnerComponent;
  let fixture: ComponentFixture<VehicleOwnerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehicleOwnerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VehicleOwnerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
