import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LocalSuccessComponent } from './local-success.component';

describe('LocalSuccessComponent', () => {
    let component: LocalSuccessComponent;
    let fixture: ComponentFixture<LocalSuccessComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [LocalSuccessComponent]
        })
            .compileComponents();

        fixture = TestBed.createComponent(LocalSuccessComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
