import { Injectable } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { animationFrameScheduler, BehaviorSubject, interval } from 'rxjs';

import { PlaybackQuality, PlaybackTransport } from '@view/view.types';
import { TimelineService } from '@vms-client/submodules/timeline/services/timeline.service';
import { VideoManagementSystemService } from '@vms-client/submodules/vms/services/vms.service';
import { ms, percentage } from '@vms-client/utils/type-aliases';

import { assertNever } from '../../../utils';
import {
    PLAYBACK_MODE,
    PlaybackState,
    createInitialStoppedState,
    createInitialArchiveState,
    createInitialLiveState,
    ArchivePlaybackState,
} from '../datatypes/PlaybackState';

@UntilDestroy()
@Injectable({
    providedIn: 'root'
})
export class PlaybackService {
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
        interval(0, animationFrameScheduler)
            .pipe(untilDestroyed(this))
            .subscribe(() => {
                this._onAnimationFrame();
            });
    }

    public _onAnimationFrame(): void {
        this.handleAnimationFrame();
    }

    public _subject = new BehaviorSubject<PlaybackState>(
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

    public playLive(): void {
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

        this._emit();
    }

    public unplayableArchive(): void {
        (<ArchivePlaybackState> this._state).encrypted = true;
        this._emit();
    }

    public setError(error): void {
        this._state.error = error;
        this._emit();
    }

    public stop(withError: string = ''): void {
        this._state = createInitialStoppedState(
            this._state.quality,
            this._state.transport
        );
        this._state.error = withError;
        this._emit();
    }

    public pause(): void {
        switch (this._state.mode) {
            case PLAYBACK_MODE.STOPPED:
                break;
            case PLAYBACK_MODE.LIVE:
                if (
                    this.vms.selectedCamera.isRecording ||
                    this.vms.selectedCamera.hasArchive
                ) {
                    this.playArchive(Date.now(), true);
                } else {
                    this.stop();
                }
                break;
            case PLAYBACK_MODE.ARCHIVE:
                if (!this._state.paused) {
                    this._state.paused = true;
                    this._emit();
                }
                break;
            default:
                assertNever(this._state);
        }
    }

    public unpause(): void {
        switch (this._state.mode) {
            case PLAYBACK_MODE.STOPPED:
                break;
            case PLAYBACK_MODE.LIVE:
                break;
            case PLAYBACK_MODE.ARCHIVE:
                if (this._state.paused) {
                    // this._state.paused = false
                    // this._emit()
                    this.playArchive(this._state.currentTime);
                }
                break;
            default:
                assertNever(this._state);
        }
    }

    public handleStarted(): void {
        switch (this._state.mode) {
            case PLAYBACK_MODE.STOPPED:
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

    public handleAnimationFrame(): void {
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
                break;
            case PLAYBACK_MODE.LIVE:
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
                break;
            case PLAYBACK_MODE.LIVE:
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

    private _jumpOverTheGapIfNeeded(): void {
        if (
            this.vms.selectedCamera &&
            this._state.mode === PLAYBACK_MODE.ARCHIVE &&
            !this._state.paused
        ) {
            const state = this._state;

            if (!this.vms.selectedCamera.isThereRecord(state.currentTime)) {
                const nextChunk = this.vms.selectedCamera.getNextRecord(
                    state.currentTime
                );
                if (nextChunk) {
                    const wasVisible = !this.isBeyondVisibleRange;
                    const nextChunkStart = nextChunk.start;
                    const diff = nextChunkStart - (this._state).currentTime;
                    this._state.currentTime = nextChunkStart;
                    this._state.startTime += diff;

                    // TODO: request scroll jump animation
                    // this.timeline.jumpScrollTo(this._state.currentTime)
                    if (wasVisible) {
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

    public changeTransport(st: PlaybackTransport): void {
        if (this._state.transport === st || !this.vms.selectedCamera.availableTransports.includes(st)) {
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

    public changeQuality(q: PlaybackQuality): void {
        if (this._state.quality === q) {
            return;
        }
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

    public save(): void {
        this._prevState = { ...this.state };
    }

    public restore(hasArchive = false): void {
        if (hasArchive && this._prevState.mode === PLAYBACK_MODE.ARCHIVE) {
            this.playArchive(this._prevState.currentTime, this._prevState.paused);
        } else {
            this.playLive();
        }
    }
}
