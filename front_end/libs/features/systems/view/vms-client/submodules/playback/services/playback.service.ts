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
    providedIn: 'root',
})
export class PlaybackService {
    private extractDimensions(): number[] {
        let { quality, transport } = this.state;

        let height: string = null;
        let width: string = null;
        if (quality) {
            // If its hls we need to find another transport w/ a similar quality
            if (transport === 'hls') {
                const transportsAndResolutions =
                    this.vms.selectedCamera.availableTransportsAndResolutions;
                const transports = Object.keys(transportsAndResolutions);
                if (transports.length > 1) {
                    const parsedQuality = quality === 'hi' ? 'high' : 'low';
                    const nonHlsTransport = transports.find(
                        _transport =>
                            _transport !== 'hls' &&
                            parsedQuality in transportsAndResolutions[_transport],
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

    constructor(private vms: VideoManagementSystemService, private timeline: TimelineService) {
        interval(0, animationFrameScheduler)
            .pipe(untilDestroyed(this))
            .subscribe(() => this.onAnimationFrame());
    }

    private onAnimationFrame(): void {
        const thisFrameTime = Date.now();
        if (this.previousFrameTime === undefined) {
            this.previousFrameTime = thisFrameTime;
            return;
        }

        switch (this.state.mode) {
            case PLAYBACK_MODE.STOPPED:
                break;

            case PLAYBACK_MODE.LIVE:
                this.state.currentTime = Date.now();
                this.emit();
                break;

            case PLAYBACK_MODE.ARCHIVE:
                const diff = thisFrameTime - this.previousFrameTime;

                /* Jump over the gap if needed */
                if (
                    this.vms.selectedCamera &&
                    this.state.mode === PLAYBACK_MODE.ARCHIVE &&
                    !this.state.paused
                ) {
                    const state = this.state;

                    if (!this.vms.selectedCamera.isThereRecord(state.currentTime)) {
                        const nextChunk = this.vms.selectedCamera.getNextRecord(state.currentTime);
                        if (nextChunk) {
                            const wasVisible = !this.isBeyondVisibleRange;
                            const nextChunkStart = nextChunk.start;
                            const diff = nextChunkStart - this.state.currentTime;
                            this.state.currentTime = nextChunkStart;
                            this.state.startTime += diff;

                            // TODO: request scroll jump animation
                            // this.timeline.jumpScrollTo(this._state.currentTime)
                            if (wasVisible) {
                                this.timeline.jumpScrollTo(
                                    diff + this.timeline.visibleRange.start,
                                    false,
                                );
                            }

                            // TODO: maybe the logic here should be very different, actually
                        } else {
                            const lastChunk = this.vms.selectedCamera.archive.slice(-1).pop();
                            const LAST_MINUTE_SIZE = 1.5 * 60 * 1000; // 1.5 minutes
                            const lastMinuteStartMs: ms = Date.now() - LAST_MINUTE_SIZE;
                            if (
                                (lastChunk && lastChunk.end < state.currentTime) ||
                                state.currentTime >= lastMinuteStartMs
                            ) {
                                if (this.canPlayLive) {
                                    this.playLive();
                                } else {
                                    this.stop();
                                }
                            }
                        }
                    }
                }

                if (this.state.started && !this.state.paused) {
                    this.state.currentTime += diff;

                    if (!this.isBeyondVisibleRange) {
                        const marginMs = this.timeline.canvasWidthToDuration(100);
                        // make time marker appear fixed while the timeline scrolls, not the contrary
                        if (
                            this.state.currentTime > this.timeline.visibleRange.start + marginMs &&
                            this.state.currentTime < this.timeline.visibleRange.end
                        ) {
                            this.timeline.jumpScrollTo(this.timeline.visibleRange.start + diff);
                        }
                    }

                    this.emit();
                }
        }

        this.previousFrameTime = thisFrameTime;
    }

    subject = new BehaviorSubject<PlaybackState>(createInitialStoppedState());

    private emit(): void {
        this.subject.next(this.state);
        // console.log('playback emit', this.state.mode === PLAYBACK_MODE.ARCHIVE && this.state.currentTime)
    }

    private livePaused$ = new BehaviorSubject<boolean | 'restartVideo'>(false);

    get livePaused(): boolean | 'restartVideo' {
        return !!this.livePaused$.value;
    }

    set livePaused(value: boolean | 'restartVideo') {
        this.livePaused$.next(value);
    }

    state: PlaybackState = createInitialStoppedState();

    get canPlayLive(): boolean {
        if (!this.vms.selectedCamera?.isLive) {
            return false;
        }
        switch (this.state.mode) {
            case PLAYBACK_MODE.STOPPED:
                return true;
            case PLAYBACK_MODE.LIVE:
                return false;
            case PLAYBACK_MODE.ARCHIVE:
                return true;
            default:
                assertNever(this.state);
        }
    }

    playLive(): void {
        this.livePaused = false;
        const [width, height] = this.extractDimensions();
        this.state = createInitialLiveState(
            this.vms.selectedCamera.getVideoUrl(this.state.transport, this.state.quality),
            this.state.quality,
            this.state.transport,
            this.vms.selectedCamera.getPosterUrl(undefined, width, height),
        );

        this.emit();
    }

    playArchive(t: ms, paused = false): void {
        if (!this.vms.selectedCamera?.hasArchive) {
            this.playLive();
            return;
        }
        if (this.state.mode === PLAYBACK_MODE.ARCHIVE) {
            this.stop();
            setTimeout(() => this.playArchive(t, paused), 0);
            return;
        }
        if (!paused) {
            const LAST_MINUTE_SIZE = 9e4; // 1.5 minutes
            const isThereRecord = this.vms.selectedCamera.isThereRecord(t);
            const nextRecord = this.vms.selectedCamera.getNextRecord(t);
            if (t > Date.now() - LAST_MINUTE_SIZE || (!isThereRecord && !nextRecord)) {
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
        this.state = createInitialArchiveState(
            this.vms.selectedCamera.getVideoUrl(this.state.transport, this.state.quality, t),
            t,
            this.state.quality,
            this.state.transport,
            this.vms.selectedCamera.getPosterUrl(
                this.vms.selectedCamera.isThereRecord(t) ? t : undefined,
                width,
                height,
            ),
        );
        this.state.paused = paused;

        this.emit();
    }

    unplayableArchive(): void {
        (<ArchivePlaybackState>this.state).encrypted = true;
        this.emit();
    }

    setError(error: string): void {
        this.state.error = error;
        this.emit();
    }

    stop(withError: string = ''): void {
        this.state = createInitialStoppedState(this.state.quality, this.state.transport);
        this.state.error = withError;
        this.emit();
    }

    pause(): void {
        switch (this.state.mode) {
            case PLAYBACK_MODE.STOPPED:
                break;
            case PLAYBACK_MODE.LIVE:
                if (this.vms.selectedCamera.isRecording || this.vms.selectedCamera.hasArchive) {
                    this.playArchive(Date.now(), true);
                } else {
                    this.stop();
                }
                break;
            case PLAYBACK_MODE.ARCHIVE:
                if (!this.state.paused) {
                    this.state.paused = true;
                    this.emit();
                }
                break;
            default:
                assertNever(this.state);
        }
    }

    unpause(): void {
        switch (this.state.mode) {
            case PLAYBACK_MODE.STOPPED:
                break;
            case PLAYBACK_MODE.LIVE:
                break;
            case PLAYBACK_MODE.ARCHIVE:
                if (this.state.paused) {
                    // this._state.paused = false
                    // this._emit()
                    this.playArchive(this.state.currentTime);
                }
                break;
            default:
                assertNever(this.state);
        }
    }

    handleStarted(): void {
        switch (this.state.mode) {
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
                this.state.started = true;
                this.emit();
                break;
            case PLAYBACK_MODE.ARCHIVE:
                this.state.started = true;
                this.state.paused = false;
                this.emit();
                break;
            default:
                assertNever(this.state);
        }
    }

    private previousFrameTime: ms;

    get isBeyondVisibleRange(): boolean {
        switch (this.state.mode) {
            case PLAYBACK_MODE.STOPPED:
                return false;
            case PLAYBACK_MODE.LIVE:
                return true;
            case PLAYBACK_MODE.ARCHIVE:
                return (
                    this.state.currentTime < this.timeline.visibleRange.start ||
                    this.state.currentTime > this.timeline.visibleRange.end
                );
            default:
                return false;
        }
    }

    get relativeOffset(): percentage {
        switch (this.state.mode) {
            case PLAYBACK_MODE.STOPPED:
                return 0.0;
            case PLAYBACK_MODE.LIVE:
                return 1.0;
            case PLAYBACK_MODE.ARCHIVE:
                return (
                    (this.state.currentTime - this.timeline.visibleRange.start) /
                    this.timeline.visibleRange.duration
                );
            default:
                return 0.0;
        }
    }

    get canPause(): boolean {
        switch (this.state.mode) {
            case PLAYBACK_MODE.STOPPED:
                return false;
            case PLAYBACK_MODE.LIVE:
                return true;
            case PLAYBACK_MODE.ARCHIVE:
                return !this.state.paused;
            default:
                assertNever(this.state);
        }
    }

    get canUnpause(): boolean {
        switch (this.state.mode) {
            case PLAYBACK_MODE.STOPPED:
                return false;
            case PLAYBACK_MODE.LIVE:
                return false;
            case PLAYBACK_MODE.ARCHIVE:
                return this.state.paused;
            default:
                assertNever(this.state);
        }
    }

    get canStop(): boolean {
        switch (this.state.mode) {
            case PLAYBACK_MODE.STOPPED:
                return false;
            case PLAYBACK_MODE.LIVE:
                return true;
            case PLAYBACK_MODE.ARCHIVE:
                return true;
            default:
                assertNever(this.state);
        }
    }

    changeTransport(st: PlaybackTransport): void {
        if (
            this.state.transport === st ||
            !this.vms.selectedCamera.availableTransports.includes(st)
        ) {
            return;
        }
        this.state.transport = st;
        switch (this.state.mode) {
            case PLAYBACK_MODE.STOPPED:
                break;
            case PLAYBACK_MODE.LIVE:
                this.stop();
                setTimeout(() => this.playLive(), 0);
                break;
            case PLAYBACK_MODE.ARCHIVE:
                const t = this.state.currentTime;
                this.stop();
                setTimeout(() => this.playArchive(t), 0);
                break;
        }
    }

    changeQuality(q: PlaybackQuality): void {
        if (this.state.quality === q) {
            return;
        }
        this.state.quality = q;
        switch (this.state.mode) {
            case PLAYBACK_MODE.STOPPED:
                break;
            case PLAYBACK_MODE.LIVE:
                this.stop();
                setTimeout(() => this.playLive(), 0);
                break;
            case PLAYBACK_MODE.ARCHIVE:
                const t = this.state.currentTime;
                this.stop();
                setTimeout(() => this.playArchive(t), 0);
                break;
        }
    }

    private prevState: PlaybackState;

    save(): void {
        this.prevState = { ...this.state };
    }

    restore(hasArchive = false): void {
        if (hasArchive && this.prevState.mode === PLAYBACK_MODE.ARCHIVE) {
            this.playArchive(this.prevState.currentTime, this.prevState.paused);
        } else {
            this.playLive();
        }
    }
}
