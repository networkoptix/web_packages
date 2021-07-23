import { Component, OnInit, AfterViewInit, OnDestroy, Output, EventEmitter, ElementRef } from '@angular/core';
import PlaybackService from '../../services/playback.service';
import { ArchivePlaybackState, PlaybackState, PLAYBACK_MODE } from '../../datatypes/PlaybackState';
import { Subscription } from 'rxjs';
import { PlaybackTransport } from '@pages/systems/view/view.types';
import { LoggerDecorator } from '@pages/systems/view/vms-client/utils';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { LanguageI18NStaticTypes } from '../../../../../../../../../language_i18n_static_types';
import { NxUtilsService } from '@services/utils.service';
import VideoManagementSystemService from '../../../vms/services/vms.service';
import VmsState from '../../../vms/datatypes/VmsState';

@Component({
    selector    : 'player',
    templateUrl : './player.component.html',
    styleUrls   : ['./player.component.scss']
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

    public get useNativePlayer () {
        const isMobile = this.utilsService.isMobile() || this.utilsService.isTablet();
        return isMobile || (
            this.transport === 'webm' ||
            this.transport === 'rtsp' ||
            // this.transport === 'mpegts' ||
            this.transport === 'mjpeg' ||
            this.transport === 'mp4'
            // || this.transport === 'mkv'
        );
    }

    public get useHlsPlayer () {
        const isNotMobile = !(this.utilsService.isMobile() || this.utilsService.isTablet());
        return isNotMobile && this.transport === 'hls';
    }

    public get useJsPlayer() {
        return false;
    }

    constructor (
        translateService: NxLanguageProviderService,
        public playback: PlaybackService,
        protected vms: VideoManagementSystemService,
        private utilsService: NxUtilsService,
        protected self: ElementRef,
    ) {
        this.LANG = translateService.translations;
        this.onPlaybackSubjectChange = this.onPlaybackSubjectChange.bind(this);
        this.onVmsSubjectChange = this.onVmsSubjectChange.bind(this)
    }

    public ngOnInit (): void {
        this.onPlaybackSubjectChange(this.playback.state);
        this.onVmsSubjectChange(this.vms.state);
    }

    public ngAfterViewInit (): void {
        this.playbackSubscription = this.playback.subject.subscribe(this.onPlaybackSubjectChange);
        this.vmsSubscription = this.vms.subject.subscribe(this.onVmsSubjectChange);
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
        this.showOverlay = !this.errorEncryption && !this.errorPlayback ? this.showOverlay : false;
    }

    public onVmsSubjectChange (s: VmsState) {
        this.rotateDeg = this.vms.selectedCamera?.rotation || 0;
    }

    public onBufferingChange (s: boolean) {
        this._log('on buffering change', s, this.playback.state);
        setTimeout(() => { this.showOverlay = s; }, 0);
        if (!s) {
            switch (this.playback.state.mode) {
                case PLAYBACK_MODE.LIVE:
                case PLAYBACK_MODE.ARCHIVE:
                    if (!this.playback.state.started && !(<ArchivePlaybackState> this.playback.state).paused) {
                        this._log('triggering handle started');
                        this.playback.handleStarted();
                    }
                    break;
            }
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
