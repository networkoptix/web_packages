import {
    Component,
    OnDestroy,
    ElementRef,
    ViewChild,
    Input,
    Output,
    EventEmitter,
    ViewEncapsulation,
    OnChanges,
} from '@angular/core';
import type videojs from 'video.js';

import { NgChanges } from '@utils/ng-changes';
import {
    LoggerDecorator,
    BASE64_SINGLE_TRANSPARENT_PIXEL
} from '@vms-client/utils';

import { PLAYBACK_MODE } from '../../../datatypes/PlaybackState';

@Component({
    selector: 'player-js',
    templateUrl: 'player-js.component.html',
    styleUrls: ['player-js.component.scss'],
    encapsulation: ViewEncapsulation.None
})
@LoggerDecorator('JS PLAYER ::', true)
export class PlayerJsComponent implements OnDestroy, OnChanges {
    _log: Function;
    _warn: Function;

    @Input() mode: number;
    @Input() paused: boolean;
    @Input() posterUrl: string;
    @Input() rotation: number;
    @Input() sourceUrl: string;
    @Input() transportError: boolean;

    @Output() bufferingChange = new EventEmitter<number>();
    @Output() videoEnded = new EventEmitter<boolean>();
    @Output() videoError = new EventEmitter<any>();

    @ViewChild('video', { static: true }) videoView: ElementRef<HTMLVideoElement>;

    actualRotation = 0;
    private player: videojs.Player;
    private hasPlayed = false;
    protected transport = '';

    // For lazy loading player
    #videojs: videojs;

    async initPlayer(): Promise<void> {
        if (this.player) return;

        let videoJsAutoRetry = 0;
        let stallTimer;
        const waitingTime = 8 * 1000;
        const options = {
            autoplay: true,
            inactivityTimeout: 0
        };

        const resetTimer = () => {
            stallTimer && clearTimeout(stallTimer);
            stallTimer = undefined;
        };

        this.#videojs ||= await import('video.js').then(m => m.default);

        this.player = this.#videojs(this.videoView.nativeElement, options);

        this.player.on('canplay', () => {
            this.player.play();
        });

        this.player.on('playing', () => {
            this.hasPlayed = true;
            this.bufferingChange.emit(1);
        });

        this.player.on('waiting', () => {
            if (!stallTimer) {
                this.hasPlayed = false;
                stallTimer = setTimeout(() => {
                    this.bufferingChange.emit(waitingTime);
                }, waitingTime);
            }
            if (this.hasPlayed) {
                resetTimer();
            }
        });

        this.player.on('timeupdate', () => {
            resetTimer();
        });

        this.player.on('ended', () => {
            this._log('video ended');
            this.videoEnded.emit(true);
        });

        this.player.on('error', err => {
            this.videoError.emit(err);
        });

        this.player.on('abort', err => {
            this.hasPlayed = false;
            !this.paused && this.videoError.emit(err);
        });

        this.player.tech(true).on('retryplaylist', () => {
            ++videoJsAutoRetry;
            if (videoJsAutoRetry > 2) {
                this.bufferingChange.emit(2);
                videoJsAutoRetry = 0;
            }
        });
    }

    public ngOnChanges(changes: NgChanges<PlayerJsComponent>): void {
        const prevMode = changes.mode?.previousValue || -1;
        this.mode = this.mode ?? PLAYBACK_MODE.LIVE;

        if (
            this.videoView && (
                changes.mode ||
                changes.sourceUrl ||
                changes.posterUrl ||
                changes.paused
            )
        ) {
            if (this.sourceUrl) {
                this.transport = this.sourceUrl?.includes('m3u8') ? 'hls' : 'webm';
            }
            this._calculateRotation();
            this.initPlayer().then(() => this._reactOnPlaybackStateChange(prevMode));
        }
    }

    private _calculateRotation(): void {
        let rotation = this.rotation;
        if (this.transport !== 'hls') {
            rotation = 0;
        }
        this.actualRotation = rotation;
    }

    ngOnDestroy(): void {
        // destroy player
        if (this.player) {
            this.player.dispose();
        }
    }

    protected _reactOnPlaybackStateChange(prevMode: number): void {
        const isPaused = this.player.paused() || false;
        switch (this.mode) {
            case PLAYBACK_MODE.STOPPED:
                if (this.hasPlayed && !isPaused) {
                    this.player.pause();
                }
                this._log('react on stopped');
                this.bufferingChange.emit(1);
                break;
            case PLAYBACK_MODE.LIVE:
            case PLAYBACK_MODE.ARCHIVE:
                if (this.player && prevMode !== this.mode && !this.paused) {
                    this.player.reset();
                    this.hasPlayed = false;
                    this._startPlayback();
                }
                if (this.mode === PLAYBACK_MODE.ARCHIVE && this.paused) {
                    if (this.hasPlayed && !isPaused) {
                        this.player.pause();
                        this._log('react on pause');
                        this.bufferingChange.emit(1);
                    }
                }
                break;
            default:
                throw Error('Client is in a broken state');
        }
    }

    protected _startPlayback(): void {
        this._log(`starting playback source: ${this.sourceUrl}\t poster: ${this.posterUrl}`);

        const sourceUrl = this.sourceUrl || null;
        let posterUrl = BASE64_SINGLE_TRANSPARENT_PIXEL;

        if (this.posterUrl && !this.posterUrl.includes('rotate')) {
            posterUrl = `${this.posterUrl}&rotate=${this.transport !== 'hls' && this.rotation || 0}`;
        }

        if (!sourceUrl) {
            this._warn('ordered start playback request with empty sourceUrl');
            return;
        }

        if (!['m3u8', 'webm'].some(transport => sourceUrl.includes(transport))) {
            this._warn('wrong source format', sourceUrl);
            return;
        }

        const source = { src: sourceUrl, type: 'video/webm' };
        if (sourceUrl.includes('m3u8')) {
            source.type = 'application/x-mpegURL';
        }
        this._log('correct source format', sourceUrl);
        if ([1, 2].includes(this.mode)) {
            this._log('setting source (1-ARCHIVE, 2-LIVE)', this.mode);
            this.bufferingChange.emit(0);
            this.player.src(source);
            this.player.poster(posterUrl);
        } else {
            this._warn('playback requested in wrong mode');
        }
    }
}
