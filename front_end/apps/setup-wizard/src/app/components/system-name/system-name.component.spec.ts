import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SystemNameComponent } from './system-name.component';

describe('SystemNameComponent', () => {
    let component: SystemNameComponent;
    let fixture: ComponentFixture<SystemNameComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [SystemNameComponent]
        })
            .compileComponents();

        fixture = TestBed.createComponent(SystemNameComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
