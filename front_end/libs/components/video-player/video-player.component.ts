/* eslint-disable */
import { Component, ElementRef, EventEmitter, HostBinding, Injector, Input, Output, TemplateRef, ViewChild, effect, runInInjectionContext, signal } from '@angular/core';
import { v4 as uuid } from 'uuid';

import { NxSystemCamera } from '@services/system.service/camera-manager/camera-manager-types';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ConnectionError, WebRTCStreamManager, AvailableStreams, TargetStream } from '@openLibs/webrtc-stream-manager';
import {
    firstValueFrom,
    of,
    shareReplay,
    Subject,
    switchMap,
    tap,
    interval,
    startWith,
    map,
    timeout,
    catchError
} from 'rxjs';
import staticLang from '@language_static';
import { LayoutItem } from '@services/system-api.types/layouts.types';
import { Translatable } from '@pipes/nx-translate.types';
import { NxAppStateService } from '@services/nx-app-state.service';
import { Resolution } from '@services/layout-state/store/layouts-resolution/resolution.types';
import { nxConfig } from '@services/nx-config/config';

type DrawImagePartialTuple = [number, number, number, number];

type DrawImageFullTuple = [number, number, number, number, number, number, number, number];

// Not using for now.
// class FpsTracker {
//     private frames: number[] = [];

//     public reportFrame() {
//         this.frames.push(Date.now())
//     }

//     public get currentFps(): number {
//         this.frames = this.frames.filter(frame => frame > Date.now() - 1000 * this.sampleSizeSeconds);
//         return this.frames.length / this.sampleSizeSeconds;
//     }

//     constructor(private sampleSizeSeconds: number = 10) { }
// }

@UntilDestroy()
@Component({
    selector: 'nx-video-player',
    templateUrl: 'video-player.component.html',
    styleUrls: ['video-player.component.scss']
})
export class NxVideoPlayerComponent {
    camera$$ = signal<NxSystemCamera | null>(null)
    @Input({ required: true }) set camera(camera: NxSystemCamera) {
        this.camera$$.set(camera);
    };

    get camera(): NxSystemCamera | null {
        return this.camera$$();
    }
    @Input() rotation: number;
    @Input() zoom: Pick<LayoutItem, 'zoomTop' | 'zoomRight' | 'zoomBottom' | 'zoomLeft'>;
    @Input() lostConnectionPlaceholder: TemplateRef<any>;
    @Input() skipCredentialsCheck: boolean = false;

    resolution$$ = signal(Resolution.AUTO)
    @Input() set resolution(resolution: Resolution) {
        this.resolution$$.set(resolution);
    }

    @Output() showPtz = new EventEmitter<NxSystemCamera>();
    @Output() showError = new EventEmitter<ConnectionError>();

    connectionEstablished: boolean;
    @ViewChild('originalStream') originalStream: ElementRef<HTMLVideoElement>;
    @ViewChild('zoomCanvas') zoomCanvas: ElementRef<HTMLCanvasElement>;
    @ViewChild('webRtcStream') webRtcStreamRef: ElementRef<HTMLVideoElement>;
    @HostBinding('class') get class() {
        const { paused, currentTime } = this.webRtcStreamRef?.nativeElement || { paused: true, currentTime: 0 };
        this.connectionEstablished ||= !paused && currentTime > 1000;
        return this.connectionEstablished ? 'playing' : '';
    }

    static POSTER_RETRIES = 5
    static POSTER_INTERVAL = 5

    CONFIG = nxConfig;
    playerId: string;
    offset = 0;

    posterFailures = 0
    error = '';
    loading = true;
    lostConnection = false;
    streamManager = WebRTCStreamManager;

    connection: WebRTCStreamManager | null;

    ribbon$ = new Subject<{
        message: Translatable,
        type: 'info' | 'error' | 'success' | 'warning',
        duration?: number,
    }>();

    ribbonContent$ = this.ribbon$.pipe(
        switchMap(
            ribbonContent => ribbonContent.duration
                ? interval(ribbonContent.duration).pipe(map(() => null), startWith(ribbonContent))
                : of(ribbonContent)),
        shareReplay({ bufferSize: 1, refCount: false }),
        untilDestroyed(this),
    );

    document = document;

    constructor(
        private appStateService: NxAppStateService,
        private injector: Injector,
    ) {
        this.playerId = uuid();
        WebRTCStreamManager.RELAY_URL = this.CONFIG.trafficRelayHost;
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

    zoomStream = async (stream: MediaStream): Promise<MediaStream> => {
        const video = this.originalStream.nativeElement as HTMLVideoElement & { captureStream: () => MediaStream };
        const canvas = this.zoomCanvas.nativeElement;
        video.autoplay = true;
        video.muted = true;
        video.srcObject = stream;

        if ((['zoomTop', 'zoomBottom', 'zoomRight', 'zoomLeft'] as const).every(key => !this.zoom?.[key])) {
            return video.captureStream();
        }

        await new Promise(resolve => {
            const startHandlingStream = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const drawParams: DrawImagePartialTuple = [0, 0, canvas.width, canvas.height];
                const cropParams: DrawImagePartialTuple = this.calculateCropParams(drawParams);
                const ctx = canvas.getContext('2d');

                const updateFrame = (now?: number, metadata?: { mediaTime: number }) => {
                    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                        return startHandlingStream();
                    }

                    if (metadata?.mediaTime) {
                        const drawImageParams: DrawImageFullTuple = [...cropParams, ...drawParams];
                        ctx && ctx.drawImage(video, ...drawImageParams);
                        resolve(null);
                    }

                    video.requestVideoFrameCallback(updateFrame);
                }

                updateFrame();
            }
            video.onplaying = startHandlingStream
        })

        const newStream = canvas.captureStream();
        stream.getAudioTracks().forEach(track => newStream.addTrack(track));

        return newStream;
    }

    syncAvailableStreams(connection: WebRTCStreamManager, hasSecondary: boolean): void {
        runInInjectionContext(this.injector, () => {
            effect(() => {
                const resolution = this.resolution$$() || Resolution.AUTO;
                const autoResStreams = [AvailableStreams.PRIMARY, AvailableStreams.SECONDARY]

                const streamLookup: Record<Resolution, AvailableStreams[]> = {
                    [Resolution.AUTO]: autoResStreams,
                    [Resolution.HIGH]: [autoResStreams[0]],
                    [Resolution.LOW]: [autoResStreams[1] || autoResStreams[0]],
                    [Resolution.CUSTOM]: autoResStreams
                }

                connection.updateAvailableStreams(streamLookup[resolution])
            })
        });
    }

    ngAfterViewInit(): void {
        if (!this.camera) {
            return;
        }

        const availableStreams: AvailableStreams[] = this.camera.parameters.mediaStreams?.streams?.map(({ encoderIndex }) => encoderIndex).filter(stream => stream !== -1) ?? [AvailableStreams.SECONDARY, AvailableStreams.PRIMARY];
        const hasSecondary = availableStreams.includes(AvailableStreams.SECONDARY);
        const targetStream = availableStreams.length ? TargetStream.AUTO : hasSecondary ? TargetStream.LOW : TargetStream.HIGH

        const stream$ = WebRTCStreamManager.connect({ cameraId: this.camera.id, systemId: this.camera.systemId, accessToken: this.camera.accessToken, targetStream }, this.originalStream.nativeElement).pipe(
            tap(async ([stream, error, connection]) => {
                this.syncAvailableStreams(connection, hasSecondary)
                if (stream) {
                    this.webRtcStreamRef.nativeElement.srcObject = await this.zoomStream(stream);
                    // Checks if user has interacted to unmute
                    this.webRtcStreamRef.nativeElement.muted = await firstValueFrom(
                        this.appStateService.userInteracted$.pipe(
                            map(() => false),
                            timeout(10),
                            catchError(() => of(true)),
                        ),
                    );
                    this.webRtcStreamRef.nativeElement.autoplay = true;

                    while (this.webRtcStreamRef.nativeElement.paused) {
                        await new Promise(resolve => setTimeout(resolve, 10));
                    }

                    if (this.webRtcStreamRef.nativeElement.muted) {
                        // Unmute and autoplay when user interacts with the page
                        this.appStateService.userInteracted$.pipe(untilDestroyed(this)).subscribe(() => {
                            this.webRtcStreamRef.nativeElement.muted = false;
                            this.webRtcStreamRef.nativeElement.autoplay = true;
                        })
                    }

                    while (!this.webRtcStreamRef.nativeElement.currentTime) {
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
                    if (error === ConnectionError.lostConnection) {
                        if (!this.lostConnection) {
                            this.lostConnection = true;
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
