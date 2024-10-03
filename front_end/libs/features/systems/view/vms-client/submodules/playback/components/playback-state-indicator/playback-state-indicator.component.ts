import { Component, Input, OnInit } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import { TimelineSelectionService } from '@vms-client/submodules/timeline/services/timeline.selection.service';
import { VideoManagementSystemService } from '@vms-client/submodules/vms/services/vms.service';

import { PLAYBACK_MODE, PlaybackState } from '../../datatypes/PlaybackState';
import { PlaybackService } from '../../services/playback.service';

@UntilDestroy()
@Component({
    selector: 'nx-playback-state-indicator',
    templateUrl: './playback-state-indicator.component.html',
    styleUrls: ['./playback-state-indicator.component.scss'],
})
export class PlaybackStateIndicatorComponent implements OnInit {
    private state: PlaybackState;

    @Input() enabled: boolean;

    // get isLive(): boolean {
    //     return this.vms.selectedCamera.isLive;
    // }

    get isPlaying(): boolean {
        return (
            this.state.mode === PLAYBACK_MODE.LIVE &&
            !this.playback.livePaused &&
            this.vms.playerActive
        );
    }

    get isRecording(): boolean {
        return this.vms.selectedCamera?.isRecording;
    }

    constructor(
        private selection: TimelineSelectionService,
        private playback: PlaybackService,
        private vms: VideoManagementSystemService,
    ) {}

    ngOnInit(): void {
        this.playback.subject.pipe(untilDestroyed(this)).subscribe(s => {
            this.state = s;
        });
    }

    handleLiveClick(): void {
        if (this.playback.canPlayLive && this.enabled) {
            this.selection.reset();
            this.playback.playLive();
        }
    }

    get canPlayLive(): boolean {
        return this.vms.selectedCamera && this.vms.selectedCamera.isLive;
    }
}
