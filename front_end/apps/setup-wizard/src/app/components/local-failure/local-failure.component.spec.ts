import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LocalFailureComponent } from './local-failure.component';

describe('LocalFailureComponent', () => {
    let component: LocalFailureComponent;
    let fixture: ComponentFixture<LocalFailureComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [LocalFailureComponent]
        })
            .compileComponents();

        fixture = TestBed.createComponent(LocalFailureComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
