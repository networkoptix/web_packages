import { Component, OnInit, Input } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import { TimelineSelectionService } from '@vms-client/submodules/timeline/services/timeline.selection.service';
import { VideoManagementSystemService } from '@vms-client/submodules/vms/services/vms.service';

import { PlaybackState, PLAYBACK_MODE } from '../../datatypes/PlaybackState';
import { PlaybackService } from '../../services/playback.service';

@UntilDestroy()
@Component({
    selector: 'nx-playback-state-indicator',
    templateUrl: './playback-state-indicator.component.html',
    styleUrls: ['./playback-state-indicator.component.scss'],
})
export class PlaybackStateIndicatorComponent implements OnInit {
    public state: PlaybackState;

    @Input() enabled: boolean;

    public get isLive() {
        return this.vms.selectedCamera.isLive;
    }

    public get isPlaying() {
        return this.state.mode === PLAYBACK_MODE.LIVE && !this.playback.livePaused;
    }

    public get isRecording() {
        return this.vms.selectedCamera?.isRecording;
    }

    constructor(
        public selection: TimelineSelectionService,
        public playback: PlaybackService,
        public vms: VideoManagementSystemService
    ) {}

    public ngOnInit(): void {
        this.playback.subject
            .pipe(untilDestroyed(this))
            .subscribe((s: PlaybackState) => {
                this.onSubjectChange(s);
            });
    }

    public onSubjectChange(s: PlaybackState): void {
        this.state = s;
    }

    public handleLiveClick(): void {
        if (this.playback.canPlayLive && this.enabled) {
            this.selection.reset();
            this.playback.playLive();
        }
    }

    public get canPlayLive(): boolean {
        return this.vms.selectedCamera && this.vms.selectedCamera.isLive;
    }
}
