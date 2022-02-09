import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TimeUnderMouseComponent } from './time-under-mouse.component';

xdescribe('TimeUnderMouseComponent', () => {
    let component: TimeUnderMouseComponent;
    let fixture: ComponentFixture<TimeUnderMouseComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [TimeUnderMouseComponent]
        })
            .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(TimeUnderMouseComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
