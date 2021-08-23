import {
    Component, AfterViewInit, OnDestroy,
    ElementRef, ViewChild, Input, Output,
    EventEmitter, ViewEncapsulation, OnChanges, SimpleChanges
} from '@angular/core';
import { PLAYBACK_MODE }                                    from '../../../datatypes/PlaybackState';
import { LoggerDecorator, BASE64_SINGLE_TRANSPARENT_PIXEL } from '@pages/systems/view/vms-client/utils';
import videojs                                              from 'video.js';

@Component({
    selector      : 'player-js',
    templateUrl   : 'player-js.component.html',
    styleUrls     : ['player-js.component.scss'],
    encapsulation : ViewEncapsulation.None
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

    @Output() bufferingChange = new EventEmitter<boolean>();
    @Output() videoEnded = new EventEmitter<boolean>();
    @Output() videoError = new EventEmitter<any>();

    @ViewChild('video', { static: true }) videoView: ElementRef;

    actualRotation = 0;
    private player: videojs.Player;
    protected transport = '';

    constructor() {}

    initPlayer(): void {
        let stallTimer;
        const options = {
            autoplay           : true,
            maxPlaylistRetries : 3,
            inactivityTimeout  : 0,
        };
        this.player = videojs(this.videoView.nativeElement, options);


        this.player.on('ready', () => {
            this.player.play();
        });

        this.player.on('playing', () => {
            stallTimer && clearTimeout(stallTimer);
            this.bufferingChange.emit(false);
        });

        this.player.on('waiting', () => {
            stallTimer && clearTimeout(stallTimer);
            stallTimer = setTimeout(() => {
                this._startPlayback();
            }, 10 * 1000);
        });

        this.player.on('ended', () => {
            this._log('video ended');
            this.videoEnded.emit(true);
        });

        this.player.on('error', (err) => {
            this.videoError.emit(err);
        });

        this.player.on('abort', (err) => {
            !this.paused && this.videoError.emit(err);
        });
    }

    public ngOnChanges (changes: SimpleChanges): void {
        const prevMode = changes.mode?.previousValue || -1;
        this.mode = this.mode ?? PLAYBACK_MODE.LIVE;

        if (this.videoView && (changes.mode || changes.sourceUrl || changes.posterUrl || changes.paused)) {
            this.transport = this.sourceUrl && this.sourceUrl?.includes('m3u8') ? 'hls' : 'webm' || '';
            this._calculateRotation();
            this._reactOnPlaybackStateChange(prevMode);
        }
    }

    private _calculateRotation() {
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

    protected _reactOnPlaybackStateChange(prevMode: number) {
        !this.player && this.initPlayer();
        const isPaused = this.player.paused() || false;
        switch (this.mode) {
            case PLAYBACK_MODE.STOPPED:
                if (prevMode === PLAYBACK_MODE.STOPPED) {
                    !isPaused && this.player.pause();
                }
                this._log('react on stopped');
                this.bufferingChange.emit(false);
                break;
            case PLAYBACK_MODE.LIVE:
            case PLAYBACK_MODE.ARCHIVE:
                if (this.player && prevMode !== this.mode && !this.paused) {
                    this._startPlayback();
                }
                if (this.mode === PLAYBACK_MODE.ARCHIVE && this.paused) {
                    !isPaused && this.player.pause();
                    this._log('react on pause');
                    this.bufferingChange.emit(false);
                }
                break;
            default:
                throw Error('Client is in a broken state');
        }
    }

    protected _startPlayback() {
        this._log(`starting playback source: ${this.sourceUrl}\t poster: ${this.posterUrl}`);

        const sourceUrl = this.sourceUrl || null;
        let posterUrl = BASE64_SINGLE_TRANSPARENT_PIXEL;

        if (this.posterUrl) {
            posterUrl = `${this.posterUrl}&rotate=${this.transport !== 'hls' ? this.rotation : 0}`;
        }

        if (!sourceUrl) {
            this._warn('ordered start playback request with empty sourceUrl');
            return;
        }

        if (!['m3u8', 'webm'].some((transport) => sourceUrl.includes(transport))) {
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
            this.bufferingChange.emit(true);
            this.player.src(source);
            this.player.poster(posterUrl);
            if (this.player.paused()) {
                setTimeout(() => this.player.play().catch(() => this._log('pause was called in start playback')));
            }
        } else {
            this._warn('playback requested in wrong mode');
        }
    }
}
