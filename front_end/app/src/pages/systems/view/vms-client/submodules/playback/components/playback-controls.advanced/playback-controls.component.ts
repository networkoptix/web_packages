import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';

import { TimelineSelectionService } from '@vms-client/submodules/timeline/services/timeline.selection.service';

import { PlaybackState } from '../../datatypes/PlaybackState';
import { PlaybackService } from '../../services/playback.service';

@Component({
    selector: 'playback-controls',
    templateUrl: './playback-controls.component.html',
    styleUrls: ['./playback-controls.component.scss']
})
export class PlaybackAdvControlsComponent implements OnInit, OnDestroy {
    protected subscription: Subscription;
    protected state: PlaybackState;

    constructor(
        public playback: PlaybackService,
        protected selection: TimelineSelectionService
    ) {
        this.onSubjectChange = this.onSubjectChange.bind(this);
    }

    public ngOnInit(): void {
        this.subscription = this.playback.subject.subscribe(this.onSubjectChange);
    }

    public ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    public onSubjectChange(s: PlaybackState) {
        this.state = s;
    }

    public get canPlayLive(): boolean {
        return this.playback.canPlayLive;
    }

    public get canStop(): boolean {
        return this.playback.canStop;
    }

    public get canPause(): boolean {
        return this.playback.canPause;
    }

    public get canUnpause(): boolean {
        return this.playback.canUnpause;
    }

    public playLive() {
        if (!this.canPlayLive) return;
        this.selection.reset();
        this.playback.playLive();
    }

    public stop() {
        if (!this.canStop) return;
        this.playback.stop();
    }

    public togglePause() {
        if (this.canPause) {
            this.selection.reset();
            this.playback.pause();
        } else if (this.canUnpause) {
            this.playback.unpause();
        }
    }
}
