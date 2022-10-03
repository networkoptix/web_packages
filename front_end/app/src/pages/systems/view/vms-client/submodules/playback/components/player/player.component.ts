import { HttpClient } from '@angular/common/http';
import {
    Component,
    OnInit,
    AfterViewInit,
    OnDestroy,
    Output,
    EventEmitter,
    ElementRef,
} from '@angular/core';
import { Subscription } from 'rxjs';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { PlaybackTransport } from '@view/view.types';
import { LoggerDecorator } from '@view/vms-client/utils';
import VmsState from '@vms-client/submodules/vms/datatypes/VmsState';
import VideoManagementSystemService from '@vms-client/submodules/vms/services/vms.service';
import generateClickDubleClickPair from '@vms-client/utils/generateClickDubleClickPair';

import {
    ArchivePlaybackState,
    PlaybackState,
    PLAYBACK_MODE,
    LivePlaybackState,
} from '../../datatypes/PlaybackState';
import PlaybackService from '../../services/playback.service';

@Component({
    selector: 'player',
    templateUrl: './player.component.html',
    styleUrls: ['./player.component.scss']
})
@LoggerDecorator('PLAYER (WRAPPER) ::', true)
export class PlayerComponent implements OnInit, OnDestroy, AfterViewInit {
    _log: Function
    _warn: Function

    LANG: LanguageI18NStaticTypes;

    @Output() videoDblClick = new EventEmitter<boolean>();

    protected playbackSubscription: Subscription;
    protected vmsSubscription: Subscription;
    public transport: PlaybackTransport;

    public showOverlay: boolean = false;
    public errorEncryption: boolean = false;
    public errorPlayback: boolean = false;
    public errorPlaybackDescription: string;

    public rotateDeg: number = 0

    private transportChangeByError: boolean = false;

    public handleClick: (e: MouseEvent) => void

    private serverErrors = {
        cannotDecrypt: 'Cannot decrypt media',
        setupPassword: 'Please set up camera password'
    }

    constructor (
        translateService: NxLanguageProviderService,
        public http: HttpClient,
        public playback: PlaybackService,
        protected vms: VideoManagementSystemService,
        protected self: ElementRef
    ) {
        this.LANG = translateService.translations;
        this.onPlaybackSubjectChange = this.onPlaybackSubjectChange.bind(this);
        this.onVmsSubjectChange = this.onVmsSubjectChange.bind(this);
        this.handleClick = generateClickDubleClickPair(
            (e) => this.onClick(e),
            (e) => this.onDblClick(e)
        );
    }

    public ngOnInit (): void {
        this.onPlaybackSubjectChange(this.playback.state);
        this.onVmsSubjectChange(this.vms.state);
    }

    public ngAfterViewInit (): void {
        this.playbackSubscription = this.playback.subject.subscribe(
            this.onPlaybackSubjectChange
        );
        this.vmsSubscription = this.vms.subject.subscribe(
            this.onVmsSubjectChange
        );
    }

    public ngOnDestroy (): void {
        this.playbackSubscription.unsubscribe();
        this.vmsSubscription.unsubscribe();
    }

    public onPlaybackSubjectChange (s: PlaybackState | ArchivePlaybackState) {
        if (s.transport !== this.transport) {
            this.transport = s.transport;
        }

        this.errorPlayback = (<ArchivePlaybackState> s).error?.length > 0;
        // No translation at this time ... we should re-jigger error messages
        this.errorPlaybackDescription = (<ArchivePlaybackState> s).error;

        this.errorEncryption = (<ArchivePlaybackState> s).encrypted;
        this.showOverlay = !this.errorEncryption && !this.errorPlayback
            ? this.showOverlay
            : false;
    }

    public onVmsSubjectChange (s: VmsState) {
        this.rotateDeg = this.vms.selectedCamera?.rotation || 0;
    }

    public onBufferingChange (s: number) {
        /*
        s is the timeout value for when the player waits.
        s === 0 means we loaded and need the overlay.
        s === 1 means we started playing.
        s > 1 means the player fired a waiting event and we need to move the time back by that much.
         */
        this._log('on buffering change', s, this.playback.state);
        setTimeout(() => { this.showOverlay = s === 0; }, 0);
        if (s > 1 && 'currentTime' in this.playback.state) {
            this.playback.pause();
            setTimeout(() => this.playback.playArchive(
                (<ArchivePlaybackState|LivePlaybackState> this.playback.state).currentTime - s
            ));
        } else if (s === 1) {
            switch (this.playback.state.mode) {
                case PLAYBACK_MODE.LIVE:
                case PLAYBACK_MODE.ARCHIVE:
                    this.transportChangeByError = false;
                    if (
                        !this.playback.state.started &&
                        !(<ArchivePlaybackState> this.playback.state).paused
                    ) {
                        this._log('triggering handle started');
                        this.playback.handleStarted();
                    }
                    break;
            }
        }
    }

    public videoEnded(event: boolean) {
        this.playback.playLive();
    }

    public videoErrorEventHandler (event: any) {
        const { player } = event.target;
        const toggleTransport = () => {
            this.transportChangeByError = true;
            this.playback.changeTransport(
                this.playback.state.transport !== 'hls' ? 'hls' : 'webm'
            );
        };
        const errorCode = player?.error()?.code;
        if (
            [
                MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED,
                MediaError.MEDIA_ERR_DECODE
            ].includes(errorCode) && // code: 4, 3
            !this.transportChangeByError
        ) {
            toggleTransport();
        } else if (player && ['abort', 'error'].includes(event.type)) {
            if (event.type === 'error' && this.transportChangeByError) {
                this.playback.setError(this.LANG.common.cameraStates.noFormat());
                return;
            }
            this.http.get(player.src())
                .subscribe((response: any) => {
                    switch (response?.error) {
                        case '4':
                            if (response.errorString === this.serverErrors.cannotDecrypt) {
                                this.playback.unplayableArchive();
                            } else if (
                                !this.transportChangeByError &&
                                response.errorString !== this.serverErrors.setupPassword
                            ) {
                                toggleTransport();
                            } else {
                                this.playback.setError(response.errorString);
                            }
                            break;
                        default:
                            break;
                    }
                }, (error) => {
                    if (error.name !== 'HttpErrorResponse') {
                        this.playback.setError(error.message);
                    }
                });
        }
    }

    public onClick (e: MouseEvent) {
        if (this.playback.canPause) {
            this.playback.pause();
        } else if (this.playback.canUnpause) {
            this.playback.unpause();
        } else if (this.playback.canStop) {
            this.playback.stop();
        } else if (this.playback.canPlayLive) {
            this.playback.playLive();
        }
    }

    public onDblClick (e: MouseEvent) {
        this.videoDblClick.emit(true);
    }
}

export default PlayerComponent;
