import { Injectable, OnDestroy, isDevMode } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { assertNever } from '../../../utils';

import {
    PLAYBACK_MODE,
    PlaybackState,
    createInitialStoppedState,
    createInitialArchiveState,
    createInitialLiveState,
    ArchivePlaybackState
} from '../datatypes/PlaybackState';

import { ms, percentage } from '../../../utils/type-aliases';

import VideoManagementSystemService from '../../vms/services/vms.service';

import TimelineService from '../../timeline/services/timeline.service';
import { IRecord } from '../../vms/datatypes/ICamera';
import { PlaybackQuality, PlaybackTransport } from '@pages/systems/view/view.types';

@Injectable({
    providedIn: 'root'
})
export class PlaybackService implements OnDestroy {
    protected _logPrefix: string = 'PLAYBACK_SERVICE ::'
    protected _logDisable: boolean = true

    protected _log (...args: any[]) {
        if (isDevMode() && !this._logDisable) {
            console.log.apply(console, [this._logPrefix, ...arguments]);
        }
    }

    protected _warn (...args: any[]) {
        if (isDevMode() && !this._logDisable) {
            console.warn.apply(console, [this._logPrefix, ...arguments]);
        }
    }

    constructor(
        protected vms: VideoManagementSystemService,
        protected timeline: TimelineService
    ) {
        this._animationFrameRequestHandler =
            requestAnimationFrame(this.onAnimationFrame.bind(this));
    }

    protected _animationFrameRequestHandler: number

    public onAnimationFrame (): void {
        this.handleAnimationFrame();
        this._animationFrameRequestHandler =
            requestAnimationFrame(this.onAnimationFrame.bind(this));
    }

    public ngOnDestroy (): void {
        cancelAnimationFrame(this._animationFrameRequestHandler);
    }

    protected _subject = new BehaviorSubject<PlaybackState>(createInitialStoppedState())

    protected _emit (): void {
        this._subject.next(this.state);
    }

    public get subject (): BehaviorSubject<PlaybackState> {
        return this._subject;
    }

    public livePaused$ = new BehaviorSubject<boolean | 'restartVideo'>(false)

    public get livePaused () {
        return <boolean | 'restartVideo'>!!this.livePaused$.value;
    }

    public set livePaused (value: boolean | 'restartVideo') {
        this.livePaused$.next(value);
    }

    protected _state: PlaybackState = createInitialStoppedState()

    public get state (): PlaybackState {
        return this._state;
    }

    public get modeLiteral (): string {
        return PLAYBACK_MODE[this._state.mode];
    }

    public get canPlayLive (): boolean {
        if (!this.vms.selectedCamera?.isLive) {
            return false;
        }
        switch (this._state.mode) {
            case PLAYBACK_MODE.STOPPED:
                return true;
            case PLAYBACK_MODE.LIVE:
                return false;
            case PLAYBACK_MODE.ARCHIVE:
                return true;
            default:
                assertNever(this._state);
        }
    }

    public canPlayArchive (t: ms) {
        return this.vms.selectedCamera?.hasArchive;
    }

    public playLive () {
        this.livePaused = false;
        if (!this.canPlayLive) {
            return;
        }
        this._state = createInitialLiveState(
            this.vms.selectedCamera.getVideoUrl(this._state.transport, this._state.quality),
            this._state.quality,
            this._state.transport,
            this.vms.selectedCamera.getPosterUrl()
        );
        this._log('started live', this._state.quality, this._state.currentTime, this._state.sourceUrl);
        this._emit();
    }

    public playArchive (t: ms, paused = false) {
        if (!this.canPlayArchive(t)) {
            return;
        }
        if (this._state.mode === PLAYBACK_MODE.ARCHIVE) {
            this.stop();
            setTimeout(() => this.playArchive(t, paused), 0)
            return
        }
        const LAST_MINUTE_SIZE = 9e4 // 1.5 minutes
        if (t > Date.now() - LAST_MINUTE_SIZE || (
            !this.vms.selectedCamera.isThereRecord(t) &&
            !this.vms.selectedCamera.getNextRecord(t)
        )) {
            return this.playLive()
        }
        this._state = createInitialArchiveState(
            this.vms.selectedCamera.getVideoUrl(this._state.transport, this._state.quality, t),
            t,
            this._state.quality,
            this._state.transport,
            this.vms.selectedCamera.getPosterUrl(t)
        );
        this._state.paused = paused;
        if (!paused && t >= this.vms.selectedCamera.archiveRange.end) {
            this._state.started = true;
        }
        this._log('started archive', this._state.quality, this._state.currentTime, this._state.sourceUrl);
        this._emit();
    }

    public unplayableArchive() {
        (<ArchivePlaybackState> this._state).encrypted = true;
        this._emit();
    }

    public setError(error) {
        this._state.error = error;
        this._emit();
    }

    public stop () {
        this._log('PLAYBACK.STOP()');
        this._state = createInitialStoppedState(
            this._state.quality,
            this._state.transport
        );
        this._emit();
    }

    public pause () {
        switch (this._state.mode) {
            case PLAYBACK_MODE.STOPPED:
                this._warn('PAUSE request while playback mode is STOPPED');
                break;
            case PLAYBACK_MODE.LIVE:
                this._warn('PAUSE request while playback mode is LIVE (performing STOP instead)');
                if (this.canPlayArchive(0)) {
                    this.playArchive(Date.now(), true);
                } else {
                    this.stop();
                }
                break;
            case PLAYBACK_MODE.ARCHIVE:
                if (!this._state.paused) {
                    this._state.paused = true;
                    this._emit();
                } else {
                    this._warn('PAUSE request while already paused');
                }
                break;
            default:
                assertNever(this._state);
        }
    }

    public unpause () {
        switch (this._state.mode) {
            case PLAYBACK_MODE.STOPPED:
                this._warn('UNPAUSE request while playback mode is STOPPED');
                break;
            case PLAYBACK_MODE.LIVE:
                this._warn('UNPAUSE request while playback mode is LIVE');
                break;
            case PLAYBACK_MODE.ARCHIVE:
                if (this._state.paused) {
                    // this._state.paused = false
                    // this._emit()
                    this._log('UNPAUSE archive normal attempt');
                    this.playArchive(this._state.currentTime);
                } else {
                    this._warn('UNPAUSE request while already unpaused');
                }
                break;
            default:
                assertNever(this._state);
        }
    }

    public handleStarted (): void {
        switch (this._state.mode) {
            case PLAYBACK_MODE.STOPPED:
                this._warn('playback STARTED while playback mode is STOPPED'); // ; this is probably LIVE')
                // this._state = createInitialLiveState(
                //   this.vms.selectedCamera.getLiveVideoUrl(this._state.transport, this._state.quality),
                //   this._state.quality,
                //   this._state.transport,
                //   this.vms.selectedCamera.getPosterUrl(),
                // )
                // // note no break here
                break;
            case PLAYBACK_MODE.LIVE:
                this._state.started = true;
                this._emit();
                break;
            case PLAYBACK_MODE.ARCHIVE:
                this._state.started = true;
                this._state.paused = false;
                this._emit();
                break;
            default:
                assertNever(this._state);
        }
    }

    public handleTimeUpdate (timeSinceStart: ms): void {
        switch (this._state.mode) {
            case PLAYBACK_MODE.STOPPED:
                this._warn('playback time update while playback mode is STOPPED');
                break;

            case PLAYBACK_MODE.LIVE:
                this._state.currentTime = Date.now();
                this._emit();
                break;

            case PLAYBACK_MODE.ARCHIVE:
                const newT = this._state.startTime + timeSinceStart;
                const diff = newT - this._state.currentTime;
                this._state.currentTime = newT;

                if (!this.isBeyondVisibleRange) {
                    const marginMs = this.timeline.canvasWidthToDuration(100);
                    // make time marker appear fixed while the timeline scrolls, not the contrary
                    if (this._state.currentTime > this.timeline.visibleRange.start + marginMs &&
                        this._state.currentTime < this.timeline.visibleRange.end
                    ) {
                        this.timeline.jumpScrollTo(this.timeline.visibleRange.start + diff);
                    }
                }
                this._jumpOverTheGapIfNeeded();

                this._emit();
                break;
            default:
                assertNever(this._state);
        }
    }

    protected _previousFrameTime: ms

    public handleAnimationFrame () {
        const thisFrameTime = Date.now();
        if (this._previousFrameTime === undefined) {
            this._previousFrameTime = thisFrameTime;
            return;
        }

        switch (this._state.mode) {
            case PLAYBACK_MODE.STOPPED:
                break;

            case PLAYBACK_MODE.LIVE:
                this.handleTimeUpdate(-1);
                this._state.currentTime = Date.now();
                this._emit();
                break;

            case PLAYBACK_MODE.ARCHIVE:
                const diff = thisFrameTime - this._previousFrameTime;
                if (this._state.started && !this._state.paused) {
                    // this._log('started', diff, this._state.currentTime)
                    this._state.currentTime += diff;

                    if (!this.isBeyondVisibleRange) {
                        const marginMs = this.timeline.canvasWidthToDuration(100);
                        // make time marker appear fixed while the timeline scrolls, not the contrary
                        if (this._state.currentTime > this.timeline.visibleRange.start + marginMs &&
                            this._state.currentTime < this.timeline.visibleRange.end
                        ) {
                            this.timeline.jumpScrollTo(this.timeline.visibleRange.start + diff);
                        }
                    }
                    this._jumpOverTheGapIfNeeded();

                    this._emit();
                } else {
                    // this._log('not started')
                }
        }

        this._previousFrameTime = thisFrameTime;
    }

    public get isBeyondVisibleRange (): boolean {
        switch (this._state.mode) {
            case PLAYBACK_MODE.STOPPED:
                return false;
            case PLAYBACK_MODE.LIVE:
                return true;
            case PLAYBACK_MODE.ARCHIVE:
                return this._state.currentTime < this.timeline.visibleRange.start ||
                    this._state.currentTime > this.timeline.visibleRange.end;
            default:
                return false;
        }
    }

    public get relativeOffset (): percentage {
        switch (this._state.mode) {
            case PLAYBACK_MODE.STOPPED:
                return 0.0;
            case PLAYBACK_MODE.LIVE:
                return 1.0;
            case PLAYBACK_MODE.ARCHIVE:
                return (this._state.currentTime - this.timeline.visibleRange.start) / this.timeline.visibleRange.duration;
            default:
                return 0.0;
        }
    }

    public handlePaused (): void {
        switch (this._state.mode) {
            case PLAYBACK_MODE.STOPPED:
                this._warn('playback pause while playback mode is STOPPED');
                break;
            case PLAYBACK_MODE.LIVE:
                this._warn('playback pause while playback mode is LIVE');
                break;
            case PLAYBACK_MODE.ARCHIVE:
                this._state.paused = true;
                this._emit();
                break;
            default:
                assertNever(this._state);
        }
    }

    public handleUnpaused (): void {
        switch (this._state.mode) {
            case PLAYBACK_MODE.STOPPED:
                this._warn('playback unpause while playback mode is STOPPED');
                break;
            case PLAYBACK_MODE.LIVE:
                this._warn('playback unpause while playback mode is LIVE');
                break;
            case PLAYBACK_MODE.ARCHIVE:
                this._state.paused = true;
                this._emit();
                break;
            default:
                assertNever(this._state);
        }
    }

    public get canPause (): boolean {
        switch (this._state.mode) {
            case PLAYBACK_MODE.STOPPED:
                return false;
            case PLAYBACK_MODE.LIVE:
                return false;
            case PLAYBACK_MODE.ARCHIVE:
                return !this._state.paused;
            default:
                assertNever(this._state);
        }
    }

    public get canUnpause (): boolean {
        switch (this._state.mode) {
            case PLAYBACK_MODE.STOPPED:
                return false;
            case PLAYBACK_MODE.LIVE:
                return false;
            case PLAYBACK_MODE.ARCHIVE:
                return this._state.paused;
            default:
                assertNever(this._state);
        }
    }

    public get canStop (): boolean {
        switch (this._state.mode) {
            case PLAYBACK_MODE.STOPPED:
                return false;
            case PLAYBACK_MODE.LIVE:
                return true;
            case PLAYBACK_MODE.ARCHIVE:
                return true;
            default:
                assertNever(this._state);
        }
    }

    private _jumpOverTheGapIfNeeded () {
        if (this.vms.selectedCamera && this._state.mode === PLAYBACK_MODE.ARCHIVE) {
            const state = this._state as ArchivePlaybackState;

            if (!this.vms.selectedCamera.isThereRecord(state.currentTime)) {
                const nextChunk = this.vms.selectedCamera.getNextRecord(state.currentTime);
                if (nextChunk) {
                    const wasVisible = !this.isBeyondVisibleRange;

                    const was = this._state.currentTime;
                    const nextChunkStart = nextChunk.start;
                    const diff = nextChunkStart - (this._state as ArchivePlaybackState).currentTime;
                    this._state.currentTime = nextChunkStart;
                    this._state.startTime += diff;
                    this._log('jump', diff, 'was', was, 'diff', diff, new Date(diff + this.timeline.visibleRange.start));

                    // TODO: request scroll jump animation
                    // this.timeline.jumpScrollTo(this._state.currentTime)
                    if (wasVisible) {
                        this.timeline.jumpScrollTo(diff + this.timeline.visibleRange.start, true);
                    }

                    // TODO: maybe the logic here should be very different, actually
                } else {
                    const lastChunk = this.vms.selectedCamera.archive.slice(-1).pop();
                    const LAST_MINUTE_SIZE = 1.5 * 60 * 1000; // 1.5 minutes
                    const lastMinuteStartMs: ms = Date.now() - LAST_MINUTE_SIZE;
                    if (lastChunk && lastChunk.end < state.currentTime || state.currentTime >= lastMinuteStartMs) {
                        this.canPlayLive ? this.playLive() : this.stop();
                    }
                }
            }
        }
    }

    public changeTransport (st: PlaybackTransport) {
        if (this._state.transport === st) {
            return;
        }
        this._state.transport = st;
        switch (this._state.mode) {
            case PLAYBACK_MODE.STOPPED:
                break;
            case PLAYBACK_MODE.LIVE:
                this.stop();
                setTimeout(() => this.playLive(), 0);
                break;
            case PLAYBACK_MODE.ARCHIVE:
                const t = this._state.currentTime;
                this.stop();
                setTimeout(() => this.playArchive(t), 0);
                break;
        }
    }

    public changeQuality (q: PlaybackQuality) {
        if (this._state.quality === q) {
            return;
        }
        this._log('changeQuality', this._state.quality, '->', q);
        this._state.quality = q;
        switch (this._state.mode) {
            case PLAYBACK_MODE.STOPPED:
                break;
            case PLAYBACK_MODE.LIVE:
                this.stop();
                setTimeout(() => this.playLive(), 0);
                break;
            case PLAYBACK_MODE.ARCHIVE:
                const t = this._state.currentTime;
                this.stop();
                setTimeout(() => this.playArchive(t), 0);
                break;
        }
        // if (this.state.mode === PLAYBACK_MODE.STOPPED) {
        //   return
        // }
        // const was = this.state.sourceUrl
        // this.state.sourceUrl = this.state.sourceUrl
        //   .replace('?lo', '%QUALITY%').replace('?hi', '%QUALITY%').replace('?', '%QUALITY%')
        //   .replace('%QUALITY', '?' + (q === 'auto' ? '' : q.slice(0, 2)))
        // if (was !== this.state.sourceUrl) {
        //   console.log('playback: changing stream quality, from', was, 'to', this.state.sourceUrl)
        //   this._emit()
        // } else {
        //   console.log('no real source change', this.state.sourceUrl)
        // }
    }
}

export default PlaybackService;
