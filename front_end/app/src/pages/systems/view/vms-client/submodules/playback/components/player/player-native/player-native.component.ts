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
    HostListener,
    OnChanges,
} from '@angular/core';
import Hls from 'hls.js';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subscription } from 'rxjs';

import {
    WebClientUxService
} from '@view/services/webclient-ux.service';
import {
    assertNever,
    LoggerDecorator,
    BASE64_SINGLE_TRANSPARENT_PIXEL
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
    selector: 'player-native',
    templateUrl: './player-native.component.html',
    styleUrls: ['./player-native.component.scss']
})
@LoggerDecorator('NATIVE PLAYER ::', true)
export class PlayerNativeComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {
    _log: Function;
    _warn: Function;

    @Input() rotation: number;

    LANG: LanguageI18NStaticTypes;

    @Output() bufferingChange = new EventEmitter<boolean>();

    @ViewChild('video') videoView: ElementRef<HTMLVideoElement>;
    @ViewChild('videoSource') videoSourceView: ElementRef<HTMLSourceElement>;

    protected get $video(): HTMLVideoElement {
        return this.videoView?.nativeElement;
    }

    protected playbackSubscription: Subscription;
    protected state: PlaybackState;
    protected readonly isMobile: boolean;

    constructor(
        languageService: NxLanguageProviderService,
        deviceService: DeviceDetectorService,
        public playback: PlaybackService,
        public ux: WebClientUxService,
        private http: HttpClient
    ) {
        this.LANG = languageService.translations;
        this.isMobile = deviceService.isMobile() || deviceService.isTablet();
        this.onPlaybackSubjectChange = this.onPlaybackSubjectChange.bind(this);
    }

    public ngOnInit(): void {
    }

    videoErrorEventHandler = (event: any): void => {
        if (
            this.videoView?.nativeElement.error?.code ===
            MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
        ) {
            this.playback.setError(this.LANG.common.cameraStates.noFormat());
        }

        if (this.videoView && this.videoView.nativeElement.error) {
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
                }, error => {
                    if (error.status !== 0) {
                        this.playback.setError(error.message);
                    }
                });
        }

        if (
            this.videoView?.nativeElement.error?.message ===
            'PIPELINE_ERROR_EXTERNAL_RENDERER_FAILED'
        ) {
            this.playback.pause();
            this.playback.unpause();
            this._log('PIPELINE_ERROR_EXTERNAL_RENDERER_FAILED ->');
        }
    };

    public ngAfterViewInit(): void {
        this.playbackSubscription = this.playback.subject.subscribe(
            this.onPlaybackSubjectChange
        );
        this.videoView.nativeElement.addEventListener(
            'error',
            this.videoErrorEventHandler
        );
        this._handleRotation();
    }

    public ngOnChanges(): void {
        this._handleRotation();
    }

    // @ts-expect-error
    @HostListener('window:resize', ['$event'])
    protected _handleRotation(): void {
        if (!this.videoView) {
            return;
        }
        if (this.state.transport !== 'hls') {
            // ensures that we strip rotation and width modifications.
            this.videoView.nativeElement.style = undefined;
            return;
        }

        if (Math.abs(this.rotation % 180) === 90) {
            this.videoView.nativeElement.style.width =
                `${this.videoView.nativeElement.parentElement.getBoundingClientRect().height}px`;
            this.videoView.nativeElement.style.transform = `rotate(${this.rotation}deg)`;
        } else {
            this.videoView.nativeElement.style.width = '100%';
            this.videoView.nativeElement.style.transform =
                this.rotation ? `rotate(${this.rotation}deg)` : '';
        }
    }

    public ngOnDestroy(): void {
        this.videoView?.nativeElement.removeEventListener(
            'error',
            this.videoErrorEventHandler
        );
        this.playbackSubscription.unsubscribe();
        this.$video.pause();
        this.$video.src = '';
    }

    public onPlaybackSubjectChange(s: PlaybackState): void {
        const prevState = { ...this.state };
        this.state = { ...s };
        this._reactOnPlaybackStateChange(prevState);
    }

    private pauseVideo(): void {
        this.$video.pause();
        // remind player it have poster to show (Safari)
        const poster = this.videoView.nativeElement.getAttribute('poster');
        this.videoView.nativeElement.setAttribute(
            'poster',
            poster || BASE64_SINGLE_TRANSPARENT_PIXEL
        );
    }

    protected _reactOnPlaybackStateChange(prevState: PlaybackState): void {
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

    protected _startPlayback(): void {
        this._log('starting playback', { ...this.state });
        // @ts-expect-error
        const sourceUrl = this.state?.sourceUrl || '';
        // Non-Hls videos are rotate by the server so we need to rotate the poster image.
        // Hls videos the video element is rotated so the poster doesn't need to be.
        // @ts-expect-error
        const posterUrl = `${this.state?.posterUrl}&rotate=${this.state.transport !== 'hls' ? this.rotation : 0}` || null;

        this.videoView.nativeElement.setAttribute(
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
                if (!Hls.isSupported() && !this.isMobile) {
                    this._warn('Hls is not supported on this device');
                    break;
                }
            // eslint-disable-next-line no-fallthrough
            case 'mp4':
            case 'webm':
                // case 'mpegts':
                // case 'mpjpeg':
                // case 'mkv':
                this._log('correct source format', sourceUrlExtension, sourceUrl);
                switch (this.state.mode) {
                    case PLAYBACK_MODE.LIVE:
                        this._log('setting LIVE source');
                        this.bufferingChange.emit(true);
                        this.videoView.nativeElement.src = sourceUrl;
                        this.videoSourceView.nativeElement.src = sourceUrl;
                        break;
                    case PLAYBACK_MODE.ARCHIVE:
                        this._log('setting ARCHIVE source');
                        this.bufferingChange.emit(true);
                        this.videoView.nativeElement.src = sourceUrl;
                        this.videoSourceView.nativeElement.src = sourceUrl;
                        break;
                    default:
                        this._warn('playback requested in wrong mode');
                }
                break;
            default:
                this._warn('wrong source format', sourceUrlExtension, sourceUrl);
                break;
        }
    }

    public onVideoCanPlay(e: MediaStreamEvent): void {
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

    public onVideoEnded(e: MediaStreamEvent): void {
        this._log('video ended');
        this.playback.playLive();
    }
}
