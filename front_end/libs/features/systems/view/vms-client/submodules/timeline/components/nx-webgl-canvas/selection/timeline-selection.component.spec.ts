import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { WebGlTimelineSelectionComponent } from './timeline-selection.component';

xdescribe('WebGlTimelineSelectionComponent', () => {
    let component: WebGlTimelineSelectionComponent;
    let fixture: ComponentFixture<WebGlTimelineSelectionComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [WebGlTimelineSelectionComponent]
        })
            .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(WebGlTimelineSelectionComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
