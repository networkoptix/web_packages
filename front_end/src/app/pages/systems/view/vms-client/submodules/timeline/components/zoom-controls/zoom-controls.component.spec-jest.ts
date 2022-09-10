import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PlaybackControlsComponent } from './playback-controls.component';

describe('PlaybackControlsComponent', () => {
    let component: PlaybackControlsComponent;
    let fixture: ComponentFixture<PlaybackControlsComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [PlaybackControlsComponent]
        })
            .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(PlaybackControlsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
