import { Component, Input, OnInit } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Subscription } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

import { LoggerDecorator } from '@view/vms-client/utils';
import { TimelineSelectionService } from '@vms-client/submodules/timeline/services/timeline.selection.service';

import { PLAYBACK_MODE, PlaybackState } from '../../datatypes/PlaybackState';
import { PlaybackService } from '../../services/playback.service';

type BtnClassesEnum = 'play' | 'pause';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'playback-controls',
    templateUrl: './playback-controls.component.html',
    styleUrls: ['./playback-controls.component.scss']
})
@LoggerDecorator('PLAYBACK CONTROLS ::', true)
export class PlaybackControlsComponent implements OnInit {
    _log: Function;
    _warn: Function;

    @Input() enabled: boolean;

    protected subscription: Subscription;
    protected state: PlaybackState;

    public btnClass: BtnClassesEnum = 'play';

    public handleClick() {
        if (!this.enabled) {
            return;
        }
        this._log('handle click');
        switch (this.btnClass) {
            case 'pause':
                this.togglePause() || this.stop();
                break;
            case 'play':
                this.unpause() || this.playLive();
                break;
        }
    }

    constructor(
        public playback: PlaybackService,
        protected selection: TimelineSelectionService
    ) {
    }

    public ngOnInit(): void {
        this.subscription = this.playback.subject
            .pipe(distinctUntilChanged((prev, curr) => {
                // we're only interested in state mode ... avoiding useless chatter
                // this.state is used instead of "prev" because when in ARCHIVE mode "pause" is
                // same for both objects (weird) ... hence -> this.state = { ...s };
                // not using function reference as I need "this" -- TT
                // @ts-expect-error
                return this.state?.mode === curr.mode && (curr.paused === undefined || this.state?.paused === curr.paused);
            }))
            .subscribe(state => {
                this.onSubjectChange(state);
            });
    }

    public onSubjectChange(s: PlaybackState) {
        this.state = { ...s };

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
    }

    protected get canPlayLive(): boolean {
        return this.playback.canPlayLive;
    }

    protected get canStop(): boolean {
        return this.playback.canStop;
    }

    protected get canPause(): boolean {
        return this.playback.canPause;
    }

    protected get canUnpause(): boolean {
        return this.playback.canUnpause;
    }

    protected playLive() {
        if (!this.canPlayLive && !this.playback.livePaused) {
            return false;
        }
        this.selection.reset();
        this.playback.playLive();
        this.playback.livePaused = 'restartVideo';
        return true;
    }

    protected stop() {
        if (!this.canStop) {
            return false;
        }
        this._log('playback.stop');
        this.playback.stop();
        return true;
    }

    protected pause() {
        if (!this.canPause) {
            return false;
        }
        this.selection.reset();
        this._log('playback.pause');
        this.playback.pause();
        return true;
    }

    protected unpause() {
        this._log('upnause', this.playback.state);
        switch (this.playback.state.mode) {
            case PLAYBACK_MODE.ARCHIVE:
                if (this.canUnpause) {
                    this._log('unpause -> archive unpause');
                    this.playback.unpause();
                    return true;
                } else {
                    return false;
                }
            case PLAYBACK_MODE.STOPPED:
            case PLAYBACK_MODE.LIVE:
                if (this.playback.canPlayLive || this.playback.livePaused) {
                    this._log('unpause -> play Live');
                    this.playLive();
                    this.playback.livePaused = false;
                    return true;
                }
                break;
            default:
                return false;
        }
    }

    protected togglePause() {
        const canPauseLive = (
            this.playback.canStop &&
            !this.playback.canPlayLive &&
            !this.playback.livePaused
        );
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
