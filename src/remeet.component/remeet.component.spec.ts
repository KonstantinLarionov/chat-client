import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RemeetComponent } from './remeet.component';

describe('RemeetComponent', () => {
  let component: RemeetComponent;
  let fixture: ComponentFixture<RemeetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RemeetComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RemeetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
