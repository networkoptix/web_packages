import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Subscription } from 'rxjs';

import VideoManagementSystemService from '@vms-client/submodules/vms/services/vms.service';

import { PlaybackState, PLAYBACK_MODE } from '../../datatypes/PlaybackState';
import PlaybackService from '../../services/playback.service';

@Component({
    selector: 'playback-state-indicator',
    templateUrl: './playback-state-indicator.component.html',
    styleUrls: ['./playback-state-indicator.component.scss']
})
export class PlaybackStateIndicatorComponent implements OnInit, OnDestroy {
    protected subscription: Subscription
    public state: PlaybackState

    @Input() enabled: boolean;

    public get isLive () {
        return this.vms.selectedCamera.isLive;
    }

    public get isPlaying () {
        return this.state.mode === PLAYBACK_MODE.LIVE && !this.playback.livePaused;
    }

    public get isRecording () {
        return this.vms.selectedCamera?.isRecording;
    }

    constructor(
        public playback: PlaybackService,
        public vms: VideoManagementSystemService
    ) {
        this.onSubjectChange = this.onSubjectChange.bind(this);
    }

    public ngOnInit (): void {
        this.subscription = this.playback.subject.subscribe(this.onSubjectChange);
    }

    public ngOnDestroy (): void {
        this.subscription.unsubscribe();
    }

    public onSubjectChange (s: PlaybackState) {
        this.state = s;
    }

    public handleLiveClick () {
        if (this.playback.canPlayLive && this.enabled) {
            this.playback.playLive();
        }
    }

    public get canPlayLive (): boolean {
        return this.vms.selectedCamera && this.vms.selectedCamera.isLive;
    }
}

export default PlaybackStateIndicatorComponent;
