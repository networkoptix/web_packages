import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NxSectionPlaceholderComponent } from './section-placeholder.component';

describe('NxSectionPlaceholderComponent', () => {
  let component: NxSectionPlaceholderComponent;
  let fixture: ComponentFixture<NxSectionPlaceholderComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [NxSectionPlaceholderComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NxSectionPlaceholderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
