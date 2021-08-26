import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TimelineScrollbarComponent } from './timeline-scrollbar.component';

xdescribe('TimelineScrollbarComponent', () => {
    let component: TimelineScrollbarComponent;
    let fixture: ComponentFixture<TimelineScrollbarComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [TimelineScrollbarComponent]
        })
            .compileComponents();
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
