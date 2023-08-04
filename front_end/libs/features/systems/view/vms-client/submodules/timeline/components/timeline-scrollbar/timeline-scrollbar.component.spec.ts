import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { TimelineScrollbarComponent } from './timeline-scrollbar.component';

xdescribe('TimelineScrollbarComponent', () => {
    let component: TimelineScrollbarComponent;
    let fixture: ComponentFixture<TimelineScrollbarComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [TimelineScrollbarComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(TimelineScrollbarComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
