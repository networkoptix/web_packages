import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { PlaybackControlsComponent } from './playback-controls.component';

xdescribe('PlaybackControlsComponent', () => {
    let component: PlaybackControlsComponent;
    let fixture: ComponentFixture<PlaybackControlsComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [PlaybackControlsComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(PlaybackControlsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    xit('should create', () => {
        expect(component).toBeTruthy();
    });
});
