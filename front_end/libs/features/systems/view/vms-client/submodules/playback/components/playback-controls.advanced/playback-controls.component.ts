import { Component, OnInit } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Subscription } from 'rxjs';

import { TimelineSelectionService } from '@vms-client/submodules/timeline/services/timeline.selection.service';

import { PlaybackState } from '../../datatypes/PlaybackState';
import { PlaybackService } from '../../services/playback.service';

@UntilDestroy()
@Component({
    selector: 'nx-playback-controls',
    templateUrl: './playback-controls.component.html',
    styleUrls: ['./playback-controls.component.scss'],
})
export class PlaybackAdvControlsComponent implements OnInit {
    protected subscription: Subscription;
    protected state: PlaybackState;

    constructor(public playback: PlaybackService, protected selection: TimelineSelectionService) {}

    public ngOnInit(): void {
        this.playback.subject.pipe(untilDestroyed(this)).subscribe((s: PlaybackState) => {
            this.onSubjectChange(s);
        });
    }

    public onSubjectChange(s: PlaybackState): void {
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

    public playLive(): void {
        if (!this.canPlayLive) {
            return;
        }
        this.selection.reset();
        this.playback.playLive();
    }

    public stop(): void {
        if (!this.canStop) {
            return;
        }
        this.playback.stop();
    }

    public togglePause(): void {
        if (this.canPause) {
            this.selection.reset();
            this.playback.pause();
        } else if (this.canUnpause) {
            this.playback.unpause();
        }
    }
}
