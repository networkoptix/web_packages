import {
    Component,
    OnInit,
    AfterViewInit,
    OnDestroy,
    ElementRef,
    ViewChild,
    Output,
    EventEmitter
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import PlaybackService from '../../../services/playback.service';
import { PlaybackState, PLAYBACK_ERROR, PLAYBACK_MODE } from '../../../datatypes/PlaybackState';
import { Subscription } from 'rxjs';
import Hls from 'hls.js';
import { assertNever, LoggerDecorator, BASE64_SINGLE_TRANSPARENT_PIXEL } from '@pages/systems/view/vms-client/utils';
import { WebClientUxService } from '@pages/systems/view/services/webclient-ux.service';

@Component({
    selector    : 'player-hls',
    templateUrl : './player-hls.component.html',
    styleUrls   : ['./player-hls.component.scss']
})
@LoggerDecorator('HLS PLAYER ::', true)
export class PlayerHlsComponent implements OnInit, OnDestroy, AfterViewInit {
    _log: Function
    _warn: Function

    @ViewChild('video') videoView: ElementRef;
    @ViewChild('videoSource') videoSourceView: ElementRef;

    @Output() bufferingChange = new EventEmitter<boolean>();

    protected get $video (): HTMLVideoElement {
        return this.videoView?.nativeElement;
    }

    protected playbackSubscription: Subscription
    protected state: PlaybackState

    constructor (
        private http: HttpClient,
        public playback: PlaybackService,
        public ux: WebClientUxService
    ) {
        this.onPlaybackSubjectChange = this.onPlaybackSubjectChange.bind(this);
    }

    public ngOnInit (): void {
    }

    videoErrorEventHandler = (event: any) => {
        if (this.videoView?.nativeElement.error?.code !== MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
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
                        default:
                            break;
                    }
                }, (error) => {
                    this.playback.setError(error.message);
                });
        }
    }

    public ngAfterViewInit (): void {
        this.playbackSubscription = this.playback.subject.subscribe(this.onPlaybackSubjectChange);
        this.ux.alternateFullScreen$.subscribe(fullscreen => {
            if (!fullscreen) return;
            try {
                this.videoView.nativeElement.webkitEnterFullscreen();
            } catch (e) {
                console.error(e);
            }
        });

        this.videoView.nativeElement.addEventListener('error', this.videoErrorEventHandler);
    }

    public ngOnDestroy (): void {
        this.videoView?.nativeElement.removeEventListener('error', this.videoErrorEventHandler);
        this.playbackSubscription.unsubscribe();
        this.hls?.destroy();
    }

    public onPlaybackSubjectChange (s: PlaybackState) {
        const prevState = { ...this.state };
        this.state = { ...s };
        this._reactOnPlaybackStateChange(prevState);
    }

    protected _reactOnPlaybackStateChange (prevState: PlaybackState) {
        switch (this.state.mode) {
            case PLAYBACK_MODE.STOPPED:
                this.$video.pause();
                this._log('react on stopped');
                this.bufferingChange.emit(false);
                break;
            case PLAYBACK_MODE.LIVE:
            case PLAYBACK_MODE.ARCHIVE:
                if (prevState.mode !== this.state.mode) {
                    this._startPlayback();
                }
                if (this.state.mode === PLAYBACK_MODE.ARCHIVE && this.state.paused) {
                    this.$video.pause();
                    this._log('react on pause');
                    this.bufferingChange.emit(false);
                }
                break;
            default:
                assertNever(this.state);
        }
    }

    protected hls: Hls

    protected _startPlayback () {
        this._log('starting playback', { ...this.state });
        // @ts-ignore
        const sourceUrl = this.state?.sourceUrl || '';
        // @ts-ignore
        const posterUrl = this.state?.posterUrl || null;

        this.videoView.nativeElement.setAttribute('poster', posterUrl || BASE64_SINGLE_TRANSPARENT_PIXEL);

        if (!sourceUrl) {
            this._warn('ordered start playback request with empty sourceUrl');
            return;
        }

        const sourceUrlMainPart = sourceUrl.split('?')[0];
        const sourceUrlParts = sourceUrlMainPart.split('.');
        const sourceUrlExtension = sourceUrlParts[sourceUrlParts.length - 1];

        switch (sourceUrlExtension) {
            case 'm3u8':
                this._log('correct extension', sourceUrlExtension, sourceUrl);
                if (this.hls) {
                    this.hls.destroy();
                    this.hls = undefined;
                }
                if (Hls.isSupported()) {
                    this._log('HLS is supported');
                    this.hls = new Hls();
                    this.hls.loadSource(sourceUrl);
                    this.hls.attachMedia(this.$video);
                    this.bufferingChange.emit(true);

                    this.hls.on(Hls.Events.ERROR, (event, data) => {
                        this._warn('HLS PLAYER HLS.js ERROR', event, data);
                        if (data.fatal) {
                            // TODO: try to switch to WEBM or another alternative stream here
                            switch (data.type) {
                                case Hls.ErrorTypes.NETWORK_ERROR:
                                    // try to recover network error
                                    this._warn('fatal network error encountered, try to recover');
                                    this.hls.startLoad();
                                    break;
                                case Hls.ErrorTypes.MEDIA_ERROR:
                                    this._warn('fatal media error encountered, try to recover');
                                    this.hls.recoverMediaError();
                                    break;
                                default:
                                    console.error('HLS error, cannot recover');
                                    this.hls.destroy();
                                    this.hls = undefined;
                                    break;
                            }
                        }
                    });
                    this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                        this._log('HLS manifest parsed');
                        // this._playVideo()
                        // console.log('PLAY 3 (HLS)')
                    });
                    this.hls.on(Hls.Events.FRAG_LOADED, () => {
                        this._log('HLS Fragment Loaded');
                        // if (this.playback.state.mode !== PLAYBACK_MODE.STOPPED) {
                        //   if (!this.playback.state.started) {
                        //     // console.log('HLS it was the first fragment')
                        //     // this.playback.handleStarted()
                        //   }
                        // }
                    });
                } else {
                    this._warn('HLS is not supported');
                }
                break;
            default:
                this._warn('wrong source format', sourceUrlExtension, sourceUrl);
                break;
        }
    }

    public onVideoCanPlay (e: MediaStreamEvent) {
        this._log('video can play', this.state.mode, this.state);
        this.bufferingChange.emit(false);
        switch (this.state.mode) {
            case PLAYBACK_MODE.LIVE:
                this.videoView.nativeElement.play();
                this._log('LIVE play()');
                break;
            case PLAYBACK_MODE.ARCHIVE:
                if (!this.state.paused) {
                    this.videoView.nativeElement.play();
                    this._log('ARCHIVE play()');
                } else {
                    this._log('ARCHIVE could play but remains stopped');
                }
        }
    }

    public onVideoEnded (e: MediaStreamEvent) {
        this._log('video ended');
        this.playback.stop();
    }
}

export default PlayerHlsComponent;
