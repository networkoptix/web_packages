/* eslint-disable */
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { v4 as uuid } from 'uuid';

import { IBool, CoercedBoolInput } from '@decorators/ibool';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxSystemCamera } from '@services/system.service/camera-manager/camera-manager-types';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ConnectionError, WebRTCStreamManager } from './WebRTCStreamManager';
import { filter, map } from 'rxjs';

@UntilDestroy()
@Component({
    selector: 'nx-video-player',
    templateUrl: 'video-player.component.html',
    styleUrls: ['video-player.component.scss']
})
export class NxVideoPlayerComponent {
    @Input() camera: NxSystemCamera;
    @Input() rotation: number;
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
        WebRTCStreamManager.connect(this.camera.webRtcUrl, this.webRtcPlayerRef.nativeElement).pipe(
            untilDestroyed(this)
        ).subscribe(([stream, error]) => {
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
        });
    }
}
