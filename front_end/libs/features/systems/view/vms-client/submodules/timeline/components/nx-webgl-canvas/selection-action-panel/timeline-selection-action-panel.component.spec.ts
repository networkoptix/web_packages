import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { WebGlTimelineSelectionActionPanelComponent } from './timeline-selection-action-panel.component';

xdescribe('TimelineSelectionComponent', () => {
    let component: WebGlTimelineSelectionActionPanelComponent;
    let fixture: ComponentFixture<WebGlTimelineSelectionActionPanelComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [WebGlTimelineSelectionActionPanelComponent]
        })
            .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(WebGlTimelineSelectionActionPanelComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
