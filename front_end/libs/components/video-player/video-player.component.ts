/* eslint-disable */
import { Component, ElementRef, EventEmitter, HostBinding, Input, Output, ViewChild } from '@angular/core';
import { v4 as uuid } from 'uuid';

import { IBool, CoercedBoolInput } from '@decorators/ibool';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxSystemCamera } from '@services/system.service/camera-manager/camera-manager-types';
import { UntilDestroy } from '@ngneat/until-destroy';
import { ConnectionError, WebRTCStreamManager } from '@openLibs/webrtc-stream-manager';
import { BehaviorSubject, firstValueFrom, Observable, switchMap, tap } from 'rxjs';
import { NxToastService } from '@dialogs/toast.service';
import staticLang from '@common/language/language_i18n_static.json';

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
    @Input() fullScreenTarget: HTMLElement;

    @Output() showPtz = new EventEmitter<NxSystemCamera>();
    @Output() showError = new EventEmitter<ConnectionError>();

    connectionEstablished: boolean;
    @ViewChild('posterImage') posterImageRef: ElementRef<HTMLImageElement>;
    @ViewChild('webRtcPlayer') webRtcPlayerRef: ElementRef<HTMLVideoElement>;
    @HostBinding('class') get class() {
        if (document.fullscreenElement === this.fullScreenTarget) {
            return 'fullscreen'
        }
        const { paused, currentTime } = this.webRtcPlayerRef?.nativeElement || { paused: true, currentTime: 0 };
        this.connectionEstablished ||= !paused && currentTime > 1000;
        return this.connectionEstablished ? 'playing' : '';
    }

    static POSTER_RETRIES = 5
    static POSTER_INTERVAL = 5

    CONFIG: IConfig;
    playerId: string;
    offset = 0;

    posterFailures = 0
    error = '';
    loading = true;
    lostConnection = false;
    streamManager = WebRTCStreamManager;

    document = document;

    toggleFullScreen(): void {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            const aspect = this.elRef.nativeElement.scrollWidth / this.elRef.nativeElement.scrollHeight;
            this.elRef.nativeElement.style.maxHeight = `${100 / aspect}vw`
            this.elRef.nativeElement.style.maxWidth = `${100 * aspect}vh`
            this.fullScreenTarget.requestFullscreen({ navigationUI: 'hide' })
        }
    }

    handleLoad(success = false): void {
        this.posterFailures = success ? 0 : this.posterFailures + 1
    }

    poster = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

    updatePosterSize = (): void => {
        this.posterImageRef.nativeElement.style.maxWidth = `${Math.round(this.webRtcPlayerRef.nativeElement.scrollWidth)}px`;
        this.posterImageRef.nativeElement.style.maxHeight = `${Math.round(this.webRtcPlayerRef.nativeElement.scrollHeight)}px`;
    }

    updatePoster = async (): Promise<void> => {
        if (!this.webRtcPlayerRef || this.webRtcPlayerRef.nativeElement.videoWidth < 32) {
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = this.webRtcPlayerRef.nativeElement.videoWidth;
        canvas.height = this.webRtcPlayerRef.nativeElement.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(this.webRtcPlayerRef.nativeElement, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL();

        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

        let allBlack = data.every(v => v === 0);

        if (!allBlack && dataUrl !== 'data:,') {
            this.poster = dataUrl;
            this.updatePosterSize()
            await new Promise(resolve => this.posterImageRef.nativeElement.onload = resolve)
        }
    }

    constructor(
        configService: NxConfigService,
        private elRef: ElementRef,
        private toastService: NxToastService,
    ) {
        this.CONFIG = configService.config;
        this.playerId = uuid();
    }

    reconnect$ = new BehaviorSubject<void>(null);

    _queuedReconnect: Promise<void>;

    async queueReconnect() {
        const serverOffline = () => firstValueFrom(this.pingServer().pipe(
            switchMap(async res => {
                await new Promise(resolve => setTimeout(resolve, 5000));
                return !res;
            })
        ));

        if (!this._queuedReconnect) {
            this._queuedReconnect = (async () => {
                let timesPinged = 0;
                while (await serverOffline()) {
                    console.info(`Unavailable server pinged ${++timesPinged} time(s), waiting for 5 seconds before trying again.`);
                }
                this.connectionEstablished = false;
                this.reconnect$.next();
                this._queuedReconnect = null;
            })()
        }

        return this._queuedReconnect;
    }

    ngOnInit(): void {
        this.handleLoad();
    }

    ngAfterViewInit(): void {
        const { streams: [primary, secondary] } = this.camera.addParams.mediaStreams ? JSON.parse(this.camera.addParams.mediaStreams) : { streams: [] };
        const codecH265 = 173;
        const primaryIsH265 = primary?.codec === codecH265;
        const hasSecondary = secondary && secondary.codec !== codecH265;

        if (primaryIsH265) {
            return this.showError.emit(ConnectionError.transcodingDisabled)
        }

        this.reconnect$.pipe(
            switchMap(this.pingServer),
            switchMap(() => WebRTCStreamManager.connect(this.camera.webRtcUrl, this.webRtcPlayerRef.nativeElement, hasSecondary)),
            tap(async ([stream, error]) => {
                await this.updatePoster();

                if (this.poster) {
                    this.posterImageRef.nativeElement.style.zIndex = '2';
                }

                if (stream) {
                    this.webRtcPlayerRef.nativeElement.srcObject = stream;
                    this.webRtcPlayerRef.nativeElement.muted = true;
                    this.webRtcPlayerRef.nativeElement.autoplay = true;

                    while (this.webRtcPlayerRef.nativeElement.paused || this.webRtcPlayerRef.nativeElement.currentTime < 1) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }

                    this.posterImageRef.nativeElement.style.zIndex = '0';
                    this.connectionEstablished = true;

                    if (this.lostConnection) {
                        this.toastService.notify({ value: staticLang.layouts.toasts.reconnected, params: { name: this.camera.name } }, 'success');
                        this.lostConnection = false;
                    }
                }

                if (error) {
                    if (error === ConnectionError.lostConnection) {
                        if (!this.lostConnection) {
                            this.lostConnection = true;
                            this.queueReconnect();
                            this.toastService.notify({ value: staticLang.layouts.toasts.connectionLost, params: { name: this.camera.name } }, 'warning');
                        }
                        return;
                    } else {
                        this.showError.emit(error);
                    }
                }

                this.loading = false;
            })).subscribe()
    }
}
