import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeLogisticaComponent } from './home-logistica.component';

describe('HomeLogisticaComponent', () => {
  let component: HomeLogisticaComponent;
  let fixture: ComponentFixture<HomeLogisticaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeLogisticaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomeLogisticaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
