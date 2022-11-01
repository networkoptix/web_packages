import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { TimelineSelectionComponent } from './timeline-selection.component';

xdescribe('TimelineSelectionComponent', () => {
    let component: TimelineSelectionComponent;
    let fixture: ComponentFixture<TimelineSelectionComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [TimelineSelectionComponent]
        })
            .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(TimelineSelectionComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
