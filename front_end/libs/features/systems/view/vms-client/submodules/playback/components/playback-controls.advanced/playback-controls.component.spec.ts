import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { PlaybackAdvControlsComponent } from './playback-controls.component';

xdescribe('PlaybackAdvControlsComponent', () => {
    let component: PlaybackAdvControlsComponent;
    let fixture: ComponentFixture<PlaybackAdvControlsComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [PlaybackAdvControlsComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(PlaybackAdvControlsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    xit('should create', () => {
        expect(component).toBeTruthy();
    });
});
