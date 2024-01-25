import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { WebGlPlaybackControlComponent } from './playback-control.component';

xdescribe('PlaybackControlsComponent', () => {
    let component: WebGlPlaybackControlComponent;
    let fixture: ComponentFixture<WebGlPlaybackControlComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [WebGlPlaybackControlComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(WebGlPlaybackControlComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    xit('should create', () => {
        expect(component).toBeTruthy();
    });
});
