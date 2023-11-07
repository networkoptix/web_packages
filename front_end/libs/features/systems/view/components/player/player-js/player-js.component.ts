import { CommonModule } from '@angular/common';
import {
    Component,
    OnDestroy,
    ElementRef,
    ViewChild,
    Input,
    Output,
    EventEmitter,
    OnChanges,
    ViewEncapsulation,
} from '@angular/core';
import type videojs from 'video.js';

import { NgChanges } from '@utils/ng-changes';

import { PLAYBACK_MODE } from '../../../datatypes/PlaybackState';

const BASE64_SINGLE_TRANSPARENT_PIXEL =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

@Component({
    selector: 'nx-player-js',
    templateUrl: 'player-js.component.html',
    styleUrls: ['player-js.component.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [CommonModule],
})
export class PlayerJsComponent implements OnDestroy, OnChanges {
    @Input() mode: number;
    @Input() paused: boolean;
    @Input() posterUrl: string;
    @Input() rotation: number;
    @Input() sourceUrl: string;
    @Input() transportError: boolean;
    @Input() authorization: string;

    @Output() bufferingChange = new EventEmitter<number>();
    @Output() videoEnded = new EventEmitter<boolean>();
    @Output() videoError = new EventEmitter<Event>();

    @ViewChild('video', { static: true }) videoView: ElementRef<HTMLVideoElement>;

    actualRotation = 0;
    private player: videojs.Player;
    private hasPlayed = false;
    protected transport = '';
    private readonly xRuntimeGuid = 'x-runtime-guid';

    // For lazy loading player
    #videojs: typeof videojs;

    private supportsNativeHls(): boolean {
        const video = document.createElement('video');
        const supportsHls = !!(
            video.canPlayType('application/vnd.apple.megURL') || video.canPlayType('audio/mpegurl')
        );
        video.remove();
        return supportsHls;
    }

    async initPlayer(): Promise<void> {
        if (this.player) {
            return;
        }

        let videoJsAutoRetry = 0;
        let stallTimer: number | null;
        const waitingTime = 8 * 1000;
        const nativeSupport = this.supportsNativeHls();
        const options = {
            autoplay: true,
            inactivityTimeout: 0,
            html5: {
                vhs: {
                    overrideNative: nativeSupport,
                },
                nativeVideoTracks: !nativeSupport,
                nativeAudioTracks: !nativeSupport,
                nativeTextTracks: !nativeSupport,
            },
        };

        const resetTimer = (): void => {
            if (stallTimer) {
                clearTimeout(stallTimer);
            }
            stallTimer = null;
        };

        this.#videojs ||= await import('video.js').then(m => m.default);
        this.#videojs.Vhs.xhr.beforeRequest = options => {
            if (!options.headers) {
                options.headers = {};
            }
            if (this.authorization) {
                options.headers[this.xRuntimeGuid] = this.authorization;
            }
        };

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
                stallTimer = window.setTimeout(() => {
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
            this.videoEnded.emit(true);
        });

        this.player.on('error', err => {
            this.videoError.emit(err);
        });

        this.player.on('abort', err => {
            this.hasPlayed = false;
            if (!this.paused) {
                this.videoError.emit(err);
            }
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
            this.videoView &&
            (changes.mode || changes.sourceUrl || changes.posterUrl || changes.paused)
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
                        this.bufferingChange.emit(1);
                    }
                }
                break;
            default:
                throw Error('Client is in a broken state');
        }
    }

    protected _startPlayback(): void {
        const sourceUrl = this.sourceUrl || null;
        const posterUrl = this.posterUrl || BASE64_SINGLE_TRANSPARENT_PIXEL;

        // If the poster is already rotate I am not sure if this is needed anymore.
        // if (this.posterUrl && !this.posterUrl.includes('rotate')) {
        //     posterUrl = `${this.posterUrl}&rotate=${this.transport !== 'hls' && this.rotation || 0}`;
        // }

        if (!sourceUrl) {
            return;
        }

        if (!['m3u8', 'webm'].some(transport => sourceUrl.includes(transport))) {
            return;
        }

        const source = { src: sourceUrl, type: 'video/webm' };
        if (sourceUrl.includes('m3u8')) {
            source.type = 'application/x-mpegURL';
        }
        if ([1, 2].includes(this.mode)) {
            this.bufferingChange.emit(0);
            this.player.src(source);
            this.player.poster(posterUrl);
        }
    }
}
