import { Injectable, OnDestroy, isDevMode } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { PlaybackQuality, PlaybackTransport } from '@view/view.types';
import { TimelineService } from '@vms-client/submodules/timeline/services/timeline.service';
import { VideoManagementSystemService } from '@vms-client/submodules/vms/services/vms.service';
import { assertNever } from '@vms-client/utils';
import { ms, percentage } from '@vms-client/utils/type-aliases';

import {
    PLAYBACK_MODE,
    PlaybackState,
    createInitialStoppedState,
    createInitialArchiveState,
    createInitialLiveState,
    ArchivePlaybackState
} from '../datatypes/PlaybackState';

@Injectable({
    providedIn: 'root'
})
export class PlaybackService implements OnDestroy {
    protected _logPrefix: string = 'PLAYBACK_SERVICE ::';
    protected _logDisable: boolean = true;

    protected _log(...args: any[]) {
        if (isDevMode() && !this._logDisable) {
            // eslint-disable-next-line no-useless-call
            console.log.apply(console, [this._logPrefix, ...arguments]);
        }
    }

    protected _warn(...args: any[]) {
        if (isDevMode() && !this._logDisable) {
            // eslint-disable-next-line no-useless-call
            console.warn.apply(console, [this._logPrefix, ...arguments]);
        }
    }

    protected extractDimensions(): number[] {
        let { quality, transport } = this._state;

        let height = null;
        let width = null;
        if (quality) {
            // If its hls we need to find another transport w/ a similar quality
            if (transport === 'hls') {
                const transportsAndResolutions =
                    this.vms.selectedCamera.availableTransportsAndResolutions;
                const transports = Object.keys(transportsAndResolutions);
                if (transports.length > 1) {
                    const parsedQuality = quality === 'hi' ? 'high' : 'low';
                    const nonHlsTransport = transports.find(_transport =>
                        _transport !== 'hls' &&
                            parsedQuality in transportsAndResolutions[_transport]
                    );
                    if (nonHlsTransport) {
                        quality = transportsAndResolutions[nonHlsTransport][parsedQuality];
                    }
                }
            }
            // If quality is missing x then there were no other transports w/ the same quality.
            if (quality.includes('x')) {
                [width, height] = quality.split('x');
            }
        }
        return [parseInt(width), parseInt(height)];
    }

    constructor(
        protected vms: VideoManagementSystemService,
        protected timeline: TimelineService
    ) {
        this._animationFrameRequestHandler =
            requestAnimationFrame(() => this.onAnimationFrame());
    }

    protected _animationFrameRequestHandler: number;

    public onAnimationFrame(): void {
        this.handleAnimationFrame();
        setTimeout(() => {
            this._animationFrameRequestHandler = requestAnimationFrame(() =>
                this.onAnimationFrame()
            );
        }, this.timeline.renderFps);
    }

    public ngOnDestroy(): void {
        cancelAnimationFrame(this._animationFrameRequestHandler);
    }

    protected _subject = new BehaviorSubject<PlaybackState>(
        createInitialStoppedState()
    );

    protected _emit(): void {
        this._subject.next(this.state);
        // console.log('playback emit', this.state.mode === PLAYBACK_MODE.ARCHIVE && this.state.currentTime)
    }

    public get subject(): BehaviorSubject<PlaybackState> {
        return this._subject;
    }

    public livePaused$ = new BehaviorSubject<boolean | 'restartVideo'>(false);

    public get livePaused() {
        return <boolean | 'restartVideo'>!!this.livePaused$.value;
    }

    public set livePaused(value: boolean | 'restartVideo') {
        this.livePaused$.next(value);
    }

    protected _state: PlaybackState = createInitialStoppedState();

    public get state(): PlaybackState {
        return this._state;
    }

    public get modeLiteral(): string {
        return PLAYBACK_MODE[this._state.mode];
    }

    public get canPlayLive(): boolean {
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

    public canPlayArchive(t: ms) {
        return this.vms.selectedCamera?.hasArchive;
    }

    public playLive() {
        this.livePaused = false;
        if (!this.canPlayLive) {
            return;
        }
        const [width, height] = this.extractDimensions();
        this._state = createInitialLiveState(
            this.vms.selectedCamera.getVideoUrl(
                this._state.transport,
                this._state.quality
            ),
            this._state.quality,
            this._state.transport,
            this.vms.selectedCamera.getPosterUrl(undefined, width, height)
        );
        this._log(
            'started live',
            this._state.quality,
            this._state.currentTime,
            this._state.sourceUrl
        );
        this._emit();
    }

    public playArchive(t: ms, paused = false) {
        if (!this.canPlayArchive(t)) {
            this.playLive();
            return;
        }
        if (this._state.mode === PLAYBACK_MODE.ARCHIVE) {
            this.stop();
            setTimeout(() => this.playArchive(t, paused), 0);
            return;
        }
        if (!paused) {
            const LAST_MINUTE_SIZE = 9e4; // 1.5 minutes
            const isThereRecord = this.vms.selectedCamera.isThereRecord(t);
            const nextRecord = this.vms.selectedCamera.getNextRecord(t);
            if (
                t > Date.now() - LAST_MINUTE_SIZE ||
                (!isThereRecord && !nextRecord)
            ) {
                return this.playLive();
            } else if (!isThereRecord) {
                t = this.vms.selectedCamera.getNextRecord(t)?.start;
                if (!t) {
                    this.playLive();
                    return;
                }
            }
        }
        const [width, height] = this.extractDimensions();
        this._state = createInitialArchiveState(
            this.vms.selectedCamera.getVideoUrl(
                this._state.transport,
                this._state.quality,
                t
            ),
            t,
            this._state.quality,
            this._state.transport,
            this.vms.selectedCamera.getPosterUrl(
                this.vms.selectedCamera.isThereRecord(t) ? t : undefined,
                width,
                height
            )
        );
        this._state.paused = paused;
        this._log(
            'archive playback initiated',
            t,
            paused,
            this._state.quality,
            this._state.currentTime,
            this._state.sourceUrl
        );
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

    public stop(withError: string = '') {
        this._log('PLAYBACK.STOP()', withError);
        this._state = createInitialStoppedState(
            this._state.quality,
            this._state.transport
        );
        this._state.error = withError;
        this._emit();
    }

    public pause() {
        switch (this._state.mode) {
            case PLAYBACK_MODE.STOPPED:
                this._warn('PAUSE request while playback mode is STOPPED');
                break;
            case PLAYBACK_MODE.LIVE:
                if (
                    this.vms.selectedCamera.isRecording ||
                    this.vms.selectedCamera.hasArchive
                ) {
                    this._log('camera is recording, transition to archive playback');
                    this.playArchive(Date.now(), true);
                } else {
                    this._log('camera is not recording, playback stop');
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

    public unpause() {
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

    public handleStarted(): void {
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

    protected _previousFrameTime: ms;

    public handleAnimationFrame() {
        const thisFrameTime = Date.now();
        if (this._previousFrameTime === undefined) {
            this._previousFrameTime = thisFrameTime;
            return;
        }

        switch (this._state.mode) {
            case PLAYBACK_MODE.STOPPED:
                break;

            case PLAYBACK_MODE.LIVE:
                this._state.currentTime = Date.now();
                this._emit();
                break;

            case PLAYBACK_MODE.ARCHIVE:
                const diff = thisFrameTime - this._previousFrameTime;

                this._jumpOverTheGapIfNeeded();

                if (this._state.started && !this._state.paused) {
                    // this._log('started', diff, this._state.currentTime)
                    this._state.currentTime += diff;

                    if (!this.isBeyondVisibleRange) {
                        const marginMs = this.timeline.canvasWidthToDuration(100);
                        // make time marker appear fixed while the timeline scrolls, not the contrary
                        if (
                            this._state.currentTime > this.timeline.visibleRange.start + marginMs &&
                            this._state.currentTime < this.timeline.visibleRange.end
                        ) {
                            this.timeline.jumpScrollTo(
                                this.timeline.visibleRange.start + diff
                            );
                        }
                    }

                    this._emit();
                } else {
                    // this._log('not started')
                }
        }

        this._previousFrameTime = thisFrameTime;
    }

    public get isBeyondVisibleRange(): boolean {
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

    public get relativeOffset(): percentage {
        switch (this._state.mode) {
            case PLAYBACK_MODE.STOPPED:
                return 0.0;
            case PLAYBACK_MODE.LIVE:
                return 1.0;
            case PLAYBACK_MODE.ARCHIVE:
                return (this._state.currentTime - this.timeline.visibleRange.start) /
                    this.timeline.visibleRange.duration;
            default:
                return 0.0;
        }
    }

    public handlePaused(): void {
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

    public handleUnpaused(): void {
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

    public get canPause(): boolean {
        switch (this._state.mode) {
            case PLAYBACK_MODE.STOPPED:
                return false;
            case PLAYBACK_MODE.LIVE:
                return true;
            case PLAYBACK_MODE.ARCHIVE:
                return !this._state.paused;
            default:
                assertNever(this._state);
        }
    }

    public get canUnpause(): boolean {
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

    public get canStop(): boolean {
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

    private _jumpOverTheGapIfNeeded() {
        if (
            this.vms.selectedCamera &&
            this._state.mode === PLAYBACK_MODE.ARCHIVE &&
            !this._state.paused
        ) {
            const state = this._state as ArchivePlaybackState;

            if (!this.vms.selectedCamera.isThereRecord(state.currentTime)) {
                const nextChunk = this.vms.selectedCamera.getNextRecord(
                    state.currentTime
                );
                if (nextChunk) {
                    const wasVisible = !this.isBeyondVisibleRange;

                    const was = this._state.currentTime;
                    const nextChunkStart = nextChunk.start;
                    const diff = nextChunkStart -
                        (this._state as ArchivePlaybackState).currentTime;
                    this._state.currentTime = nextChunkStart;
                    this._state.startTime += diff;
                    this._log(
                        'jump',
                        diff,
                        'was',
                        was,
                        'diff',
                        diff,
                        new Date(diff + this.timeline.visibleRange.start)
                    );

                    // TODO: request scroll jump animation
                    // this.timeline.jumpScrollTo(this._state.currentTime)
                    if (wasVisible) {
                        this._log(
                            'jumbScroll',
                            diff,
                            diff + this.timeline.visibleRange.start
                        );
                        this.timeline.jumpScrollTo(
                            diff + this.timeline.visibleRange.start,
                            false
                        );
                    }

                    // TODO: maybe the logic here should be very different, actually
                } else {
                    const lastChunk = this.vms.selectedCamera.archive.slice(-1).pop();
                    const LAST_MINUTE_SIZE = 1.5 * 60 * 1000; // 1.5 minutes
                    const lastMinuteStartMs: ms = Date.now() - LAST_MINUTE_SIZE;
                    if (
                        lastChunk && lastChunk.end < state.currentTime ||
                        state.currentTime >= lastMinuteStartMs
                    ) {
                        this.canPlayLive ? this.playLive() : this.stop();
                    }
                }
            }
        }
    }

    public changeTransport(st: PlaybackTransport) {
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

    public changeQuality(q: PlaybackQuality) {
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
    }

    protected _prevState: PlaybackState;

    public save() {
        this._prevState = { ...this.state };
        this._log('PLAYBACK STATE SAVED', { ...this.state });
    }

    public restore(hasArchive = false) {
        this._log('PLAYBACK SAVE RESTORE', hasArchive, { ...this._prevState });
        if (hasArchive && this._prevState.mode === PLAYBACK_MODE.ARCHIVE) {
            this._log('trying to start archive from the same place');
            this.playArchive(this._prevState.currentTime, this._prevState.paused);
        } else {
            this._log('trying to play live');
            this.playLive();
        }
    }
}
