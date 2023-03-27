/* eslint-disable */
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { v4 as uuid } from 'uuid';

import { IBool, CoercedBoolInput } from '@decorators/ibool';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxSystemCamera } from '@services/system.service/camera-manager/camera-manager-types';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ConnectionError, WebRTCStreamManager } from '@openLibs/webrtc-stream-manager';
import { filter, map, Observable, switchMap, tap } from 'rxjs';

@UntilDestroy()
@Component({
    selector: 'nx-video-player',
    templateUrl: 'video-player.component.html',
    styleUrls: ['video-player.component.scss']
})
export class NxVideoPlayerComponent {
    @Input() camera: NxSystemCamera;
    @Input() rotation: number;
    /**
     * Pings the server to allow NxCurrentRelayInterceptor to map to resolved relay instance.
     */
    @Input() pingServer: () => Observable<unknown>;
    @IBool() @Input() controls: CoercedBoolInput = false;
    @IBool() @Input() autoplay: CoercedBoolInput = false;
    @IBool() @Input() autopause: CoercedBoolInput = false;

    @Output() showPtz = new EventEmitter<NxSystemCamera>();
    @Output() showError = new EventEmitter<ConnectionError>();

    @ViewChild('webRtcPlayer') webRtcPlayerRef: ElementRef<HTMLVideoElement>;

    static POSTER_RETRIES = 5
    static POSTER_INTERVAL = 5

    CONFIG: IConfig;
    playerId: string;
    offset = 0;
    poster$ = WebRTCStreamManager.sync$.pipe(untilDestroyed(this), filter((val) => val % NxVideoPlayerComponent.POSTER_INTERVAL && this.webRtcPlayerRef?.nativeElement.paused && this.posterFailures < NxVideoPlayerComponent.POSTER_RETRIES), map(() => `${this.camera.previewUrl}&hash=${uuid()}`))
    posterFailures = 0
    error = '';
    loading = true;
    streamManager = WebRTCStreamManager;

    document = document;

    toggleFullScreen(): void {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            this.elRef.nativeElement.requestFullscreen({ navigationUI: 'hide' })
        }
    }

    handleLoad(success = false): void {
        this.posterFailures = success ? 0 : this.posterFailures + 1
    }

    constructor(
        configService: NxConfigService,
        private elRef: ElementRef
    ) {
        this.CONFIG = configService.config;
        this.playerId = uuid();
    }

    ngOnInit(): void {
        this.handleLoad();
    }

    ngAfterViewInit(): void {
        const stream$ = this.pingServer().pipe(
            switchMap(() => WebRTCStreamManager.connect(this.camera.webRtcUrl, this.webRtcPlayerRef.nativeElement)),
            tap(([stream, error]) => {
                if (stream) {
                    this.webRtcPlayerRef.nativeElement.srcObject = stream;
                    this.webRtcPlayerRef.nativeElement.muted = true;
                    this.webRtcPlayerRef.nativeElement.autoplay = true;
                }

                if (error) {
                    // this.error = error;
                    this.showError.emit(error);
                }
                this.loading = false;
            }))

        /**
         * There seems to be a bug on initiating the WebRTC connection from the server side that allows the connection to be established even if the credentials are wrong.
         *
         * This is a workaround to check for the 403 error using the previewUrl and display the correct error message.
         *
         * This could probably be removed once the server side bug is fixed.
         */
        this.camera.previewUrl
            .pipe(
                map(blob => blob !== ''),
                switchMap(authorized => {
                    if (authorized) {
                        return stream$;
                    }
                    this.showError.emit(ConnectionError.authorization);
                    return Promise.resolve();
                }),
                untilDestroyed(this)
            ).subscribe();
    }
}
