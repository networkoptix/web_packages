import {
    Component, AfterViewInit, OnDestroy,
    ElementRef, ViewChild, Output,
    EventEmitter, ViewEncapsulation
}                                                                        from '@angular/core';
import { HttpClient }                                                    from '@angular/common/http';
import { Subscription }                                                  from 'rxjs';
import PlaybackService                                                   from '../../../services/playback.service';
import { PlaybackState, PLAYBACK_MODE, PLAYBACK_ERROR }                  from '../../../datatypes/PlaybackState';
import { assertNever, LoggerDecorator, BASE64_SINGLE_TRANSPARENT_PIXEL } from '@pages/systems/view/vms-client/utils';
import { WebClientUxService }                                            from '@pages/systems/view/services/webclient-ux.service';
import videojs                                                           from 'video.js';

@Component({
    selector      : 'player-js',
    templateUrl   : 'player-js.component.html',
    styleUrls     : ['player-js.component.scss'],
    encapsulation : ViewEncapsulation.None
})
@LoggerDecorator('JS PLAYER ::', true)
export class PlayerJsComponent implements OnDestroy, AfterViewInit {
    _log: Function;
    _warn: Function;

    @Output() bufferingChange = new EventEmitter<boolean>();

    @ViewChild('video') videoView: ElementRef;

    player: videojs.Player;

    protected playbackSubscription: Subscription
    protected state: PlaybackState

    constructor(
        private http: HttpClient,
        public playback: PlaybackService,
        public ux: WebClientUxService
    ) {
        this.onPlaybackSubjectChange = this.onPlaybackSubjectChange.bind(this);
    }

    ngAfterViewInit(): void {
        const options = { autoplay: true };
        this.player = videojs(this.videoView.nativeElement, options);

        // this.player.errors();

        this.player.on('ready', () => {
            this.player.play();
        });

        this.player.on('playing', () => {
            this.bufferingChange.emit(false);
        });

        this.player.on('ended', () => {
            this._log('video ended');
            this.playback.stop();
        });

        // this.player.on('error', (err) => {
        //     debugger;
        // });

        this.videoView.nativeElement.addEventListener('error', (event: any) => {
            if (event.target.error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) { // code: 4
                // if 'webm' switch to 'hlc'
                this.playback.changeTransport('hls');
                return;
            }
            // media errors should be debugged while serving webadmin locally
            // as local proxy cannot be set to relay address and when returned result is JSON (error)
            // will trigger CORB -- TT
            if (event.target.error.message.startsWith(PLAYBACK_ERROR.DEMUXER_ERROR_COULD_NOT_OPEN)) {
                this.http.get(event.target.src)
                    .subscribe((response: any) => {
                        switch (response.error) {
                            case '4':
                                if (response.errorString === 'Cannot decrypt media') {
                                    this.playback.unplayableArchive();
                                } else {
                                    this.playback.setError(response.errorString);
                                }
                                break;
                        }
                    });
            }
        });

        this.playbackSubscription = this.playback.subject.subscribe(this.onPlaybackSubjectChange);
        this.ux.alternateFullScreen$.subscribe(fullscreen => {
            if (!fullscreen) return;
            try {
                this.videoView.nativeElement.webkitEnterFullscreen();
            } catch (e) {
                console.error(e);
            }
        });
    }

    ngOnDestroy(): void {
        // destroy player
        if (this.player) {
            this.player.dispose();
        }
        this.playbackSubscription.unsubscribe();
    }

    public onPlaybackSubjectChange(s: PlaybackState) {
        const prevState = { ...this.state };
        this.state = { ...s };
        this._reactOnPlaybackStateChange(prevState);
    }

    protected _reactOnPlaybackStateChange(prevState: PlaybackState) {
        switch (this.state.mode) {
            case PLAYBACK_MODE.STOPPED:
                this.player.pause();
                this.player.src('');
                this._log('react on stopped');
                this.bufferingChange.emit(false);
                break;
            case PLAYBACK_MODE.LIVE:
            case PLAYBACK_MODE.ARCHIVE:
                if (prevState.mode !== this.state.mode) {
                    this._startPlayback();
                }
                if (this.state.mode === PLAYBACK_MODE.ARCHIVE && this.state.paused) {
                    this.player.pause();
                    this._log('react on pause');
                    this.bufferingChange.emit(false);
                }
                break;
            default:
                assertNever(this.state);
        }
    }

    protected _startPlayback() {
        this._log('starting playback', { ...this.state });

        let sourceUrl = null;
        let posterUrl = BASE64_SINGLE_TRANSPARENT_PIXEL;
        if ('sourceUrl' in this.state) {
            sourceUrl = this.state.sourceUrl;
        }
        if ('posterUrl' in this.state) {
            posterUrl = this.state.posterUrl;
        }

        if (!sourceUrl) {
            this._warn('ordered start playback request with empty sourceUrl');
            return;
        }

        const sourceUrlMainPart = sourceUrl.split('?')[0];
        const sourceUrlParts = sourceUrlMainPart.split('.');
        const sourceUrlExtension = sourceUrlParts[sourceUrlParts.length - 1];

        const options = { sources: [{ src: sourceUrl, type: '' }] };
        switch (sourceUrlExtension) {
            case 'mp4':
                options.sources[0].type = 'video/mp4';
                break;
            case 'webm':
                options.sources[0].type = 'video/webm';
                break;
            case 'm3u8':
                options.sources[0].type = 'application/x-mpegURL';
        }

        switch (sourceUrlExtension) {
            case 'mp4':
            case 'webm':
            case 'm3u8':
                this._log('correct source format', sourceUrlExtension, sourceUrl);
                if ([1, 2].includes(this.state.mode)) {
                    this._log('setting source (1-ARCHIVE, 2-LIVE)', this.state.mode);
                    this.bufferingChange.emit(true);
                    this.player.src({ src: sourceUrl, type: options.sources[0].type });
                    this.player.poster(posterUrl);
                    if (this.player.paused()) {
                        this.player.play();
                    }
                } else {
                    this._warn('playback requested in wrong mode');
                }
                break;
            default:
                this._warn('wrong source format', sourceUrlExtension, sourceUrl);
                break;
        }
    }
}

export default PlayerJsComponent;
