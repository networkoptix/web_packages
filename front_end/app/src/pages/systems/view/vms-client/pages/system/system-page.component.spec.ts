import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from "@angular/router/testing";

import { SystemPageComponent } from './system-page.component';

describe('SystemPageComponent', () => {
    let component: SystemPageComponent;
    let fixture: ComponentFixture<SystemPageComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [SystemPageComponent],
            imports: [RouterTestingModule]
        })
            .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(SystemPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
