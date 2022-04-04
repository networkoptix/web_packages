import { HttpClient } from '@angular/common/http';
import {
    Component,
    OnInit,
    AfterViewInit,
    OnDestroy,
    ElementRef,
    ViewChild,
    Input,
    Output,
    EventEmitter,
    OnChanges,
    HostListener,
} from '@angular/core';
import Hls from 'hls.js';
import { Subscription } from 'rxjs';

import {
    WebClientUxService
} from '@view/services/webclient-ux.service';
import {
    assertNever,
    LoggerDecorator,
    BASE64_SINGLE_TRANSPARENT_PIXEL,
} from '@vms-client/utils';

import {
    LanguageI18NStaticTypes
} from '../../../../../../../../../../language_i18n_static_types';
import {
    NxLanguageProviderService
} from '../../../../../../../../../services/nx-language-provider';
import { PlaybackState, PLAYBACK_MODE } from '../../../datatypes/PlaybackState';
import { PlaybackService } from '../../../services/playback.service';

@Component({
    selector: 'player-hls',
    templateUrl: './player-hls.component.html',
    styleUrls: ['./player-hls.component.scss']
})
@LoggerDecorator('HLS PLAYER ::', true)
export class PlayerHlsComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {
    _log: Function;
    _warn: Function;

    @Input() rotation: number;

    LANG: LanguageI18NStaticTypes;
    fatalErrorTimer;

    @ViewChild('video') videoView: ElementRef<HTMLVideoElement>;
    @ViewChild('videoSource') videoSourceView: ElementRef<HTMLSourceElement>;

    @Output() bufferingChange = new EventEmitter<boolean>();

    protected get $video(): HTMLVideoElement {
        return this.videoView?.nativeElement;
    }

    protected playbackSubscription: Subscription;
    protected state: PlaybackState;

    constructor(
        languageService: NxLanguageProviderService,
        private http: HttpClient,
        public playback: PlaybackService,
        public ux: WebClientUxService
    ) {
        this.LANG = languageService.translations;
        this.onPlaybackSubjectChange = this.onPlaybackSubjectChange.bind(this);
    }

    public ngOnInit(): void {
    }

    videoErrorEventHandler = (event: any) => {
        if (event.fatal && event.type === 'networkError') {
            // manifestLoadTimeOut ... etc. hls.js already tried to recover - nothing else can be done.
            this.playback.setError(this.LANG.common.cameraStates.errorLoading());
        }

        const sourceUrl =
            this.state.mode !== PLAYBACK_MODE.STOPPED && this.state?.sourceUrl;
        if (sourceUrl && this.videoView?.nativeElement) {
            this.http.get(sourceUrl)
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
                });
        }
    };

    public ngAfterViewInit(): void {
        this.playbackSubscription = this.playback.subject.subscribe(
            this.onPlaybackSubjectChange
        );
        this.$video.addEventListener('error', this.videoErrorEventHandler);
        this._handleRotation();
    }

    public ngOnChanges(): void {
        this._handleRotation();
    }

    @HostListener('window:resize', ['$event'])
    protected _handleRotation() {
        if (!this.videoView) {
            return;
        }
        if (Math.abs(this.rotation % 180) === 90) {
            this.$video.style.width =
                `${this.videoView.nativeElement.parentElement.getBoundingClientRect().height}px`;
            this.$video.style.transform = `rotate(${this.rotation}deg)`;
        } else {
            this.$video.style.width = '100%';
            this.$video.style.transform = this.rotation
                ? `rotate(${this.rotation}deg)`
                : '';
        }
    }

    public ngOnDestroy(): void {
        this.$video.removeEventListener('error', this.videoErrorEventHandler);
        this.playbackSubscription.unsubscribe();
        this.hls?.destroy();
    }

    public onPlaybackSubjectChange(s: PlaybackState) {
        const prevState = { ...this.state };
        this.state = { ...s };
        this._reactOnPlaybackStateChange(prevState);
    }

    private pauseVideo() {
        this.$video.pause();
        // remind player it have poster to show (Safari)
        const poster = this.videoView.nativeElement.getAttribute('poster');
        this.videoView.nativeElement.setAttribute(
            'poster',
            poster || BASE64_SINGLE_TRANSPARENT_PIXEL
        );
    }

    protected _reactOnPlaybackStateChange(prevState: PlaybackState) {
        switch (this.state.mode) {
            case PLAYBACK_MODE.STOPPED:
                this.pauseVideo();
                this._log('react on stopped');
                this.bufferingChange.emit(false);
                break;
            case PLAYBACK_MODE.LIVE:
            case PLAYBACK_MODE.ARCHIVE:
                if (prevState.mode !== this.state.mode) {
                    this._startPlayback();
                }
                if (
                    this.state.mode === PLAYBACK_MODE.ARCHIVE &&
                    this.state.paused
                ) {
                    this.pauseVideo();
                    this._log('react on pause');
                    this.bufferingChange.emit(false);
                }
                break;
            default:
                assertNever(this.state);
        }
    }

    private setErrorEvent(data) {
        return setTimeout(() => {
            console.error('HLS error, cannot recover', data.details);
            this.fatalErrorTimer = undefined;
            if (data?.response === undefined) {
                this.videoErrorEventHandler(data);
            } else {
                this.playback.setError(data.response.text || '');
            }
        }, 30 * 1000);
    }

    protected hls: Hls;

    protected _startPlayback() {
        this._log('starting playback', { ...this.state });
        // @ts-expect-error
        const sourceUrl = this.state?.sourceUrl || '';
        // @ts-expect-error
        const posterUrl = `${this.state?.posterUrl}&rotate=0` || null;

        this.$video.setAttribute(
            'poster',
            posterUrl || BASE64_SINGLE_TRANSPARENT_PIXEL
        );

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
                            this.fatalErrorTimer = this.setErrorEvent(data);
                        }
                        // TODO: try to switch to WEBM or another alternative stream here
                        switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                // try to recover network error
                                this._warn(
                                    'network error encountered, try to recover',
                                    data.details
                                );
                                this.fatalErrorTimer = this.setErrorEvent(data);
                                this.hls.startLoad();
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                this._warn(
                                    'media error encountered, try to recover',
                                    data.details
                                );
                                this.hls?.recoverMediaError();
                                if (this.hls && this.fatalErrorTimer) {
                                    clearTimeout(this.fatalErrorTimer);
                                }
                                break;
                            default:
                                console.error(
                                    'HLS error, cannot recover',
                                    data.details
                                );
                                this.hls.destroy();
                                this.hls = undefined;
                                break;
                        }
                    });
                    this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                        this._log('HLS manifest parsed');
                    });
                    this.hls.on(Hls.Events.FRAG_LOADED, () => {
                        this._log('HLS Fragment Loaded');
                        this.fatalErrorTimer && clearTimeout(this.fatalErrorTimer);
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

    public onVideoCanPlay(e: MediaStreamEvent) {
        this._log('video can play', this.state.mode, this.state);
        this.bufferingChange.emit(false);
        switch (this.state.mode) {
            case PLAYBACK_MODE.LIVE:
                this.$video.play();
                this._log('LIVE play()');
                break;
            case PLAYBACK_MODE.ARCHIVE:
                if (!this.state.paused) {
                    this.$video.play();
                    this._log('ARCHIVE play()');
                } else {
                    this._log('ARCHIVE could play but remains stopped');
                }
        }
    }

    public onVideoEnded(e: MediaStreamEvent) {
        this._log('video ended');
        this.playback.playLive();
    }
}
