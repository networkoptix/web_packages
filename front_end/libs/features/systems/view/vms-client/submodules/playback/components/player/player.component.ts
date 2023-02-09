import { HttpClient } from '@angular/common/http';
import {
    Component,
    OnInit,
    AfterViewInit,
    Output,
    EventEmitter,
    ElementRef,
} from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import staticLang from '@common/language/language_i18n_static.json';
import { PlaybackTransport } from '@view/view.types';
import { VmsState } from '@vms-client/submodules/vms/datatypes/VmsState';
import { VideoManagementSystemService } from '@vms-client/submodules/vms/services/vms.service';
import { generateClickDubleClickPair } from '@vms-client/utils/generateClickDubleClickPair';

import {
    ArchivePlaybackState,
    PlaybackState,
    PLAYBACK_MODE,
    LivePlaybackState,
} from '../../datatypes/PlaybackState';
import { PlaybackService } from '../../services/playback.service';

@UntilDestroy()
@Component({
    selector: 'nx-player',
    templateUrl: './player.component.html',
    styleUrls: ['./player.component.scss']
})
export class PlayerComponent implements OnInit, AfterViewInit {
    LANG = staticLang;

    // Coercing playback state to ArchivePlaybackState
    // Was previously being cast as any in template
    // Currently not type safe for types other than ArchivePlaybackState and should be fixed
    PlaybackStateTemp: ArchivePlaybackState;

    @Output() videoDblClick = new EventEmitter<boolean>();

    public transport: PlaybackTransport;

    public showOverlay: boolean = false;
    public errorEncryption: boolean = false;
    public errorPlayback: boolean = false;
    public errorPlaybackDescription: string;

    public rotateDeg: number = 0;

    public handleClick: (e: MouseEvent) => void;

    private serverErrors = {
        cannotDecrypt: 'Cannot decrypt media',
        setupPassword: 'Please set up camera password'
    };

    constructor(
        public http: HttpClient,
        public playback: PlaybackService,
        protected vms: VideoManagementSystemService,
        protected self: ElementRef
    ) {
        this.handleClick = generateClickDubleClickPair(
            e => this.onClick(e),
            e => this.onDblClick(e)
        );
    }

    public ngOnInit(): void {
        this.onPlaybackSubjectChange(this.playback.state);
        this.onVmsSubjectChange(this.vms.state);
    }

    public ngAfterViewInit(): void {
        this.playback.subject
            .pipe(untilDestroyed(this))
            .subscribe((s: PlaybackState) => {
                this.onPlaybackSubjectChange(s);
            });

        this.vms.subject
            .pipe(untilDestroyed(this))
            .subscribe((s: VmsState) => {
                this.onVmsSubjectChange(s);
            });
    }

    public onPlaybackSubjectChange(s: PlaybackState | ArchivePlaybackState): void {
        if (s.transport !== this.transport) {
            this.transport = s.transport;
        }

        this.errorPlayback = (<ArchivePlaybackState>s).error?.length > 0;
        // No translation at this time ... we should re-jigger error messages
        this.errorPlaybackDescription = (<ArchivePlaybackState>s).error;

        this.errorEncryption = (<ArchivePlaybackState>s).encrypted;
        this.showOverlay = !this.errorEncryption && !this.errorPlayback
            ? this.showOverlay
            : false;
    }

    public onVmsSubjectChange(s: VmsState): void {
        this.rotateDeg = this.vms.selectedCamera?.rotation || 0;
    }

    public onBufferingChange(s: number): void {
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
            setTimeout(() => this.playback.playArchive(
                (<ArchivePlaybackState | LivePlaybackState> this.playback.state).currentTime - s
            ));
        } else if (s === 1) {
            switch (this.playback.state.mode) {
                case PLAYBACK_MODE.LIVE:
                case PLAYBACK_MODE.ARCHIVE:
                    if (
                        !this.playback.state.started &&
                        !(<ArchivePlaybackState> this.playback.state).paused
                    ) {
                        this.playback.handleStarted();
                    }
                    break;
            }
        }
    }

    public videoEnded(event: boolean): void {
        this.playback.playLive();
    }

    public videoErrorEventHandler(event: any): void {
        const { player } = event.target;
        if (player && ['abort', 'error'].includes(event.type)) {
            this.http.get(player.src(), { headers: { 'Accept-Language': 'en-US' } })
                .pipe(untilDestroyed(this))
                .subscribe((response: any) => {
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
                }, error => {
                    if (error.name !== 'HttpErrorResponse') {
                        this.playback.setError(error.message);
                    }
                });
        }
    }

    public onClick(e: MouseEvent): void {
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

    public onDblClick(e: MouseEvent): void {
        this.videoDblClick.emit(true);
    }
}
