import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import TimelineSelectionActionPanelComponent from './timeline-selection-action-panel.component';

xdescribe('TimelineSelectionComponent', () => {
    let component: TimelineSelectionActionPanelComponent;
    let fixture: ComponentFixture<TimelineSelectionActionPanelComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [TimelineSelectionActionPanelComponent]
        })
            .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(TimelineSelectionActionPanelComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
