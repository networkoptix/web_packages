import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { TimeUnderMouseComponent } from './time-under-mouse.component';

xdescribe('TimeUnderMouseComponent', () => {
    let component: TimeUnderMouseComponent;
    let fixture: ComponentFixture<TimeUnderMouseComponent>;

    beforeEach(waitForAsync(() => {
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
