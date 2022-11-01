import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { PlaybackStateIndicatorComponent } from './playback-state-indicator.component';

xdescribe('PlaybackStateIndicatorComponent', () => {
    let component: PlaybackStateIndicatorComponent;
    let fixture: ComponentFixture<PlaybackStateIndicatorComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [PlaybackStateIndicatorComponent]
        })
            .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(PlaybackStateIndicatorComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
