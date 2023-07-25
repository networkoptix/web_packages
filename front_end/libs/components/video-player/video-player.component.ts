/* eslint-disable */
import { Component, ElementRef, EventEmitter, HostBinding, Input, Output, TemplateRef, ViewChild, booleanAttribute } from '@angular/core';
import { v4 as uuid } from 'uuid';

import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxSystemCamera } from '@services/system.service/camera-manager/camera-manager-types';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ConnectionError, WebRTCStreamManager } from '@openLibs/webrtc-stream-manager';
import { BehaviorSubject, firstValueFrom, Observable, of, shareReplay, Subject, switchMap, tap, interval, startWith, map, timer, scan, takeUntil, filter } from 'rxjs';
import staticLang from '@common/language/language_i18n_static.json';
import { LayoutItem } from '@services/system-api.types';
import { Translatable } from '@pipes/nx-translate.types';

type DrawImagePartialTuple = [number, number, number, number];

type DrawImageFullTuple = [number, number, number, number, number, number, number, number];

class FpsTracker {
    private frames: number[] = [];

    public reportFrame() {
        this.frames.push(Date.now())
    }

    public get currentFps(): number {
        this.frames = this.frames.filter(frame => frame > Date.now() - 1000 * this.sampleSizeSeconds);
        return this.frames.length / this.sampleSizeSeconds;
    }

    constructor(private sampleSizeSeconds: number = 10) { }
}

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
    @Input({ transform: booleanAttribute }) controls: boolean = false;
    @Input({ transform: booleanAttribute }) autoplay: boolean = false;
    @Input({ transform: booleanAttribute }) autopause: boolean = false;
    @Input() fullScreenTarget: HTMLElement;
    @Input() showFullScreenButton: boolean = true;
    @Input() zoom: Pick<LayoutItem, 'zoomTop' | 'zoomRight' | 'zoomBottom' | 'zoomLeft'>;
    @Input() lostConnectionPlaceholder: TemplateRef<any>;
    @Input() skipCredentialsCheck: boolean = false;

    @Output() showPtz = new EventEmitter<NxSystemCamera>();
    @Output() showError = new EventEmitter<ConnectionError>();

    connectionEstablished: boolean;
    @ViewChild('originalStream') originalStream: ElementRef<HTMLVideoElement>;
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

    connection: WebRTCStreamManager;

    ribbon$ = new Subject<{
        message: Translatable,
        type: 'info' | 'error' | 'success' | 'warning',
        duration?: number,
    }>();

    ribbonContent$ = this.ribbon$.pipe(
        switchMap(
            ribbonContent => ribbonContent.duration
                ? interval(ribbonContent.duration).pipe(map(() => null), startWith(ribbonContent))
                : of(ribbonContent)), shareReplay({ bufferSize: 1, refCount: false }
                )
    );

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

    constructor(
        configService: NxConfigService,
        private elRef: ElementRef,
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

    calculateCropParams = (drawParams: DrawImagePartialTuple): DrawImagePartialTuple => {
        const { zoomTop, zoomRight, zoomBottom, zoomLeft } = this.zoom || {};
        const [_x, _y, width, height] = drawParams;

        if ([zoomTop, zoomRight, zoomBottom, zoomLeft].some(Boolean)) {
            const zoomHeight = (zoomBottom - zoomTop) * height;
            const zoomWidth = (zoomRight - zoomLeft) * width;
            const y = height * zoomTop;
            const x = width * zoomLeft;
            return [x, y, zoomWidth, zoomHeight];
        }

        return drawParams;
    }

    zoomStreamCleanup: () => void;

    zoomStream = async (stream: MediaStream): Promise<MediaStream> => {
        this.zoomStreamCleanup?.();

        const video = this.originalStream.nativeElement;
        video.autoplay = true;
        video.muted = true;
        video.srcObject = stream;
        const canvas = this.document.createElement('canvas');

        this.zoomStreamCleanup = () => {
            stream.getTracks().forEach(track => track.stop());
        }

        await new Promise(resolve => {
            video.onplaying = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const drawParams: DrawImagePartialTuple = [0, 0, canvas.width, canvas.height];
                const cropParams: DrawImagePartialTuple = this.calculateCropParams(drawParams);
                const ctx = canvas.getContext('2d');

                const updateFrame = (now?: number, metadata?: { mediaTime: number }) => {
                    if (!metadata || metadata.mediaTime > 1) {
                        const drawImageParams: DrawImageFullTuple = [...cropParams, ...drawParams];
                        ctx.drawImage(video, ...drawImageParams);
                        resolve(null);
                    }
                    this.fpsTracker.reportFrame();

                    video.requestVideoFrameCallback(updateFrame);
                }

                updateFrame();
            }
        })

        return canvas.captureStream();
    }

    cancelMonitoringFps$ = new Subject<void>();

    stopMonitoringFps(): void {
        this.connection = null;
        this.cancelMonitoringFps$.next();
    }

    fpsTracker = new FpsTracker(5);

    monitorFps(connection: WebRTCStreamManager): void {
        const monitoringStarted = !!this.connection;
        this.connection = connection;

        if (!monitoringStarted) {
            const bufferSize = 60;
            timer(5000, 1000).pipe(
                map(() => this.fpsTracker.currentFps),
                scan((acc, curr) => [...acc, curr].slice(-bufferSize), []),
                filter(buffer => buffer.length > bufferSize / 4),
                takeUntil(this.cancelMonitoringFps$),
                untilDestroyed(this),
            ).subscribe(fps => {
                const lastFramesFrozen = (lastNumFrames: number = fps.length) => !fps.slice(-lastNumFrames).some(Boolean)
                this.lostConnection = lastFramesFrozen(bufferSize / 2);
                this.loading = !this.lostConnection && lastFramesFrozen(bufferSize / 10);

                console.log(`FPS for ${this.camera.name}`, fps)

                if (lastFramesFrozen() && fps.length === bufferSize) {
                    this.queueReconnect();
                }
            })
        }
    }

    ngAfterViewInit(): void {
        const [primary, secondary] = this.camera.parameters.mediaStreams?.streams ?? [];
        const codecH265 = 173;
        const codecMjpeg = 7;
        const primaryIsH265 = primary?.codec === codecH265;
        const primaryIsMJPEG = primary?.codec === codecMjpeg;
        const hasSecondary = secondary && ![codecH265, codecMjpeg].includes(secondary.codec);

        if (primaryIsH265) {
            return this.showError.emit(ConnectionError.transcodingDisabled)
        }

        if (primaryIsMJPEG) {
            return this.showError.emit(ConnectionError.mjpegDisabled)
        }

        const stream$ = this.reconnect$.pipe(
            switchMap(this.pingServer),
            switchMap(() => WebRTCStreamManager.connect(this.camera.webRtcUrl, this.originalStream.nativeElement, hasSecondary)),
            tap(async ([stream, error, connection]) => {
                if (stream) {
                    this.monitorFps(connection);
                    this.webRtcPlayerRef.nativeElement.srcObject = await this.zoomStream(stream);
                    this.webRtcPlayerRef.nativeElement.muted = true;
                    this.webRtcPlayerRef.nativeElement.autoplay = true;

                    while (this.webRtcPlayerRef.nativeElement.paused || this.webRtcPlayerRef.nativeElement.currentTime < 1) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }

                    this.connectionEstablished = true;

                    if (this.lostConnection) {
                        if (!this.lostConnectionPlaceholder) {
                            this.ribbon$.next({
                                message: { value: staticLang.layouts.toasts.reconnected, params: { name: this.camera.name } },
                                type: 'success',
                                duration: 5000,
                            })
                        }
                        this.lostConnection = false;
                    }
                }

                if (error) {
                    this.stopMonitoringFps();
                    if (error === ConnectionError.lostConnection) {
                        if (!this.lostConnection) {
                            this.lostConnection = true;
                            this.queueReconnect();
                            if (!this.lostConnectionPlaceholder) {
                                this.ribbon$.next({
                                    message: { value: staticLang.layouts.toasts.connectionLost, params: { name: this.camera.name } },
                                    type: 'warning',
                                });
                            }
                        }
                        return;
                    } else {
                        this.showError.emit(error);
                    }
                }

                this.loading = false;
            }),
            untilDestroyed(this),
        );

        if (this.skipCredentialsCheck) {
            stream$.subscribe();
            return;
        }

        /**
         * Checks for authorization issues by fetching the preview image. Specifically for default password error.
         */
        this.camera.previewUrl
            .pipe(
                switchMap(async objectgUrl => {
                    const text = await fetch(objectgUrl).then(r => r.blob()).then(b => b.text()).catch(() => null);
                    return text !== 'unauthorized';
                }),
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
