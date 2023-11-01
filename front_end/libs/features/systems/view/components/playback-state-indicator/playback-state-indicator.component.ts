import { CommonModule } from '@angular/common';
import { Component, OnInit, Input } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';

import { VideoManagementSystemService } from '@view/services/vms.service';
import { TimelineSelectionService } from '@vms-client/submodules/timeline/services/timeline.selection.service';

import { PlaybackState, PLAYBACK_MODE } from '../../datatypes/PlaybackState';
import { PlaybackService } from '../../services/playback.service';

@UntilDestroy()
@Component({
    selector: 'nx-playback-state-indicator',
    templateUrl: './playback-state-indicator.component.html',
    styleUrls: ['./playback-state-indicator.component.scss'],
    standalone: true,
    imports: [CommonModule, TranslateModule],
})
export class PlaybackStateIndicatorComponent implements OnInit {
    private state: PlaybackState;

    @Input() enabled: boolean;

    // get isLive(): boolean {
    //     return this.vms.selectedCamera.isLive;
    // }

    get isPlaying(): boolean {
        return this.state.mode === PLAYBACK_MODE.LIVE && !this.playback.livePaused;
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
