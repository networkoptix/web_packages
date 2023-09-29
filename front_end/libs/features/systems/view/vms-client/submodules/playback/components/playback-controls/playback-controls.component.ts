import { Component, Input, OnInit } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { distinctUntilChanged } from 'rxjs/operators';

import { icons } from '@static-variables';
import { TimelineSelectionService } from '@vms-client/submodules/timeline/services/timeline.selection.service';

import { PLAYBACK_MODE, PlaybackState } from '../../datatypes/PlaybackState';
import { PlaybackService } from '../../services/playback.service';

type BtnClassesEnum = 'play' | 'pause';

@UntilDestroy()
@Component({
    selector: 'nx-playback-controls',
    templateUrl: './playback-controls.component.html',
    styleUrls: ['./playback-controls.component.scss'],
})
export class PlaybackControlsComponent implements OnInit {
    @Input() enabled: boolean;

    icons = icons;

    private state: PlaybackState;

    btnClass: BtnClassesEnum = 'play';

    handleClick(): void {
        if (!this.enabled) {
            return;
        }
        switch (this.btnClass) {
            case 'pause':
                // TODO: Refactor this
                // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                this.togglePause() || this.stop();
                break;
            case 'play':
                // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                this.unpause() || this.playLive();
                break;
        }
    }

    constructor(private playback: PlaybackService, private selection: TimelineSelectionService) {}

    ngOnInit(): void {
        this.playback.subject
            .pipe(
                distinctUntilChanged((prev, curr) => {
                    // we're only interested in state mode ... avoiding useless chatter
                    // this.state is used instead of "prev" because when in ARCHIVE mode "pause" is
                    // same for both objects (weird) ... hence -> this.state = { ...s };
                    // not using function reference as I need "this" -- TT
                    return (
                        this.state?.mode === curr.mode &&
                        // @ts-expect-error: paused property is only on ArchivePlaybackState
                        // Condition 1: curr is StoppedPlaybackState or LivePlaybackState i.e. not paused
                        // Condition 2: this.state and curr are already both paused ArchivePlaybackState
                        (curr.paused === undefined || this.state?.paused === curr.paused)
                    );
                }),
                untilDestroyed(this),
            )
            .subscribe(state => {
                this.state = { ...state };

                switch (this.state.mode) {
                    case PLAYBACK_MODE.STOPPED:
                        this.btnClass = 'play'; // optimistic approach
                        // a pessimistic approach would be to check if we can play anything,
                        // but if we can't the button should be disabled altogether anyway
                        break;
                    case PLAYBACK_MODE.LIVE:
                        this.btnClass = 'pause'; // optimistic approach
                        // this.btnClass = s.started ? 'pause' : 'play' // pessimistic approach
                        break;
                    case PLAYBACK_MODE.ARCHIVE:
                        this.btnClass = this.state.paused ? 'play' : 'pause'; // optimistic approach
                        // this.btnClass = s.started ? s.paused ? 'play' : 'pause' : 'play' // pessimistic approach
                        break;
                }
            });
    }

    private get canPlayLive(): boolean {
        return this.playback.canPlayLive;
    }

    private get canStop(): boolean {
        return this.playback.canStop;
    }

    // private get canPause(): boolean {
    //     return this.playback.canPause;
    // }

    private get canUnpause(): boolean {
        return this.playback.canUnpause;
    }

    private playLive(): boolean {
        if (!this.canPlayLive && !this.playback.livePaused) {
            return false;
        }
        this.selection.reset();
        this.playback.playLive();
        this.playback.livePaused = 'restartVideo';
        return true;
    }

    private stop(): boolean {
        if (!this.canStop) {
            return false;
        }
        this.playback.stop();
        return true;
    }

    // private pause(): boolean {
    //     if (!this.canPause) {
    //         return false;
    //     }
    //     this.selection.reset();
    //     this.playback.pause();
    //     return true;
    // }

    private unpause(): boolean {
        switch (this.playback.state.mode) {
            case PLAYBACK_MODE.ARCHIVE:
                if (this.canUnpause) {
                    this.playback.unpause();
                    return true;
                } else {
                    return false;
                }
            case PLAYBACK_MODE.STOPPED:
            case PLAYBACK_MODE.LIVE:
                if (this.playback.canPlayLive || this.playback.livePaused) {
                    this.playLive();
                    this.playback.livePaused = false;
                    return true;
                }
                break;
            default:
                return false;
        }
    }

    private togglePause(): boolean {
        const canPauseLive =
            this.playback.canStop && !this.playback.canPlayLive && !this.playback.livePaused;
        if (this.playback.canPause || canPauseLive) {
            this.playback.livePaused = canPauseLive;
            if (!canPauseLive) {
                this.selection.reset();
            }
            this.playback.pause();
            return true;
        } else if (this.canUnpause || this.playback.livePaused) {
            this.unpause();
            return true;
        }
        return false;
    }
}
