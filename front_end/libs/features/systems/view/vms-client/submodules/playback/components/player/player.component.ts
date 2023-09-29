import { HttpClient } from '@angular/common/http';
import { Component, OnInit, AfterViewInit, Output, EventEmitter, effect } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { SessionStorageService } from 'ngx-webstorage';

import staticLang from '@language_static';
import { PlaybackTransport } from '@view/view.types';
import { VideoManagementSystemService } from '@vms-client/submodules/vms/services/vms.service';
import { generateClickDubleClickPair } from '@vms-client/utils/generateClickDubleClickPair';

import {
    ArchivePlaybackState,
    PlaybackState,
    PLAYBACK_MODE,
    PlayingState,
} from '../../datatypes/PlaybackState';
import { PlaybackService } from '../../services/playback.service';

@UntilDestroy()
@Component({
    selector: 'nx-player',
    templateUrl: './player.component.html',
    styleUrls: ['./player.component.scss'],
})
export class PlayerComponent implements OnInit, AfterViewInit {
    LANG = staticLang;

    // Coercing playback state to ArchivePlaybackState
    // Was previously being cast as any in template
    // FIXME: Currently not type safe for types other than ArchivePlaybackState and should be fixed
    PlaybackStateTemp: ArchivePlaybackState;

    @Output() videoDblClick = new EventEmitter<void>();

    private transport: PlaybackTransport;

    showOverlay: boolean = false;
    errorEncryption: boolean = false;
    errorPlayback: boolean = false;
    errorPlaybackDescription: string;

    rotateDeg: number = 0;

    handleClick: (e: MouseEvent) => void;

    private serverErrors = {
        cannotDecrypt: 'Cannot decrypt media',
        setupPassword: 'Please set up camera password',
    };
    private readonly xRuntimeGuid = 'x-runtime-guid';

    constructor(
        private sessionStorage: SessionStorageService,
        private http: HttpClient,
        public playback: PlaybackService,
        private vms: VideoManagementSystemService,
    ) {
        this.handleClick = generateClickDubleClickPair(
            e => this.onClick(),
            e => this.onDblClick(),
        );

        effect(() => {
            this.rotateDeg = this.vms.state().selectedCamera?.rotation || 0;
        });
    }

    fetchRuntime(): string {
        return this.sessionStorage.retrieve(`${this.vms.systemId()}-${this.xRuntimeGuid}`);
    }

    ngOnInit(): void {
        this.onPlaybackSubjectChange(this.playback.state);
    }

    ngAfterViewInit(): void {
        this.playback.subject.pipe(untilDestroyed(this)).subscribe(s => {
            this.onPlaybackSubjectChange(s);
        });
    }

    private onPlaybackSubjectChange(s: PlaybackState): void {
        if (s.transport !== this.transport) {
            this.transport = s.transport;
        }

        this.errorPlayback = s.error?.length > 0;
        // No translation at this time ... we should re-jigger error messages
        this.errorPlaybackDescription = s.error;

        this.errorEncryption = (<ArchivePlaybackState>s).encrypted;
        this.showOverlay = !this.errorEncryption && !this.errorPlayback ? this.showOverlay : false;
    }

    onBufferingChange(s: number): void {
        /*
        s is the timeout value for when the player waits.
        s === 0 means we loaded and need the overlay.
        s === 1 means we started playing.
        s > 1 means the player fired a waiting event and we need to move the time back by that much.
         */
        setTimeout(() => {
            this.showOverlay = s === 0;
        }, 0);
        if (s > 1 && 'currentTime' in this.playback.state) {
            this.playback.pause();
            setTimeout(() =>
                this.playback.playArchive((this.playback.state as PlayingState).currentTime - s),
            );
        } else if (s === 1) {
            switch (this.playback.state.mode) {
                case PLAYBACK_MODE.LIVE:
                case PLAYBACK_MODE.ARCHIVE:
                    if (
                        !this.playback.state.started &&
                        !(<ArchivePlaybackState>this.playback.state).paused
                    ) {
                        this.playback.handleStarted();
                    }
                    break;
            }
        }
    }

    videoEnded(_: boolean): void {
        this.playback.playLive();
    }

    videoErrorEventHandler(event: Event): void {
        // @ts-expect-error: Strange event.target
        // looks like a HTMLDivElement (div#nx-vjs-player) but with player property attached
        const player = event.target.player as videojs.VideoJsPlayer;
        if (player && ['abort', 'error'].includes(event.type)) {
            const headers = { 'Accept-Language': 'en-US' };
            const auth = this.fetchRuntime();
            if (auth) {
                headers[this.xRuntimeGuid] = auth;
            }
            this.http
                .get<any>(player.src(), { headers })
                .pipe(untilDestroyed(this))
                .subscribe(
                    response => {
                        switch (response?.error) {
                            case '4':
                                if (response.errorString === this.serverErrors.cannotDecrypt) {
                                    this.playback.unplayableArchive();
                                } else {
                                    this.playback.setError(response.errorString);
                                }
                                break;
                            default:
                                break;
                        }
                    },
                    error => {
                        /* HttpErrorResponse, but code 200 OK?
                        error.message: "Unexpected token '#', "#EXTM3U #"... is not valid JSON"
                        error.text: "#EXTM3U
                        #EXT-X-STREAM-INF:BANDWIDTH=5569848
                        https://8gpnqn65zm82ycwxzuvvm.relay.regress.cloud.hdw.mx:443/web/hls/01ea275f-287f-277b-6978-4cbcd93c4763.m3u8?authKey=ae689a9c-9ebc-4972-84f0-86b5b0f8845d&hi&chunked&sessionID=307&hi"
                        message: "Http failure during parsing for https://38b5790a-523a-4124-ac07-a958c4ad13c3.relay.regress.cloud.hdw.mx/web/hls/01ea275f-287f-277b-6978-4cbcd93c4763.m3u8?hi&"
                         */
                        if (error.name !== 'HttpErrorResponse') {
                            this.playback.setError(error.message);
                        }
                    },
                );
        }
    }

    private onClick(): void {
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

    onDblClick(): void {
        this.videoDblClick.emit();
    }
}
