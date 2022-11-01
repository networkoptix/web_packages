import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { TimelinePlaybackIndicatorComponent } from './timeline-playback-indicator.component';

xdescribe('TimelinePlaybackIndicatorComponent', () => {
    let component: TimelinePlaybackIndicatorComponent;
    let fixture: ComponentFixture<TimelinePlaybackIndicatorComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [TimelinePlaybackIndicatorComponent]
        })
            .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(TimelinePlaybackIndicatorComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
