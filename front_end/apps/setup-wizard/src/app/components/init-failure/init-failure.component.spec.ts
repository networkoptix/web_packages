import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InitFailureComponent } from './init-failure.component';

describe('InitFailureComponent', () => {
    let component: InitFailureComponent;
    let fixture: ComponentFixture<InitFailureComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [InitFailureComponent]
        })
            .compileComponents();

        fixture = TestBed.createComponent(InitFailureComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
