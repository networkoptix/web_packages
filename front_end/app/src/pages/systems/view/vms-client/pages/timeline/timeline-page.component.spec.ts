import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { TimelinePageComponent } from './timeline-page.component';

xdescribe('TimelineComponent', () => {
    let component: TimelinePageComponent;
    let fixture: ComponentFixture<TimelinePageComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [TimelinePageComponent]
        })
            .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(TimelinePageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    xit('should create', () => {
        expect(component).toBeTruthy();
    });
});
