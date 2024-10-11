/* eslint-disable */
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, HostBinding, Injector, Input, NgZone, Output, TemplateRef, ViewChild, computed, effect, inject, input, runInInjectionContext, signal } from '@angular/core';
import { v4 as uuid } from 'uuid';

import { NxSystemCamera } from '@services/system.service/camera-manager/camera-manager-types';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ConnectionError, WebRTCStreamManager, AvailableStreams, TargetStream, throttleByFrameRate } from '@openLibs/webrtc-stream-manager';
import {
    of,
    shareReplay,
    Subject,
    switchMap,
    tap,
    interval,
    startWith,
    map,
    merge,
    timer,
    throttle,
    BehaviorSubject,
} from 'rxjs';
import staticLang from '@language_static';
import { LayoutItem } from '@services/system-api.types/layouts.types';
import { Translatable } from '@pipes/nx-translate.types';
import { NxAppStateService } from '@services/nx-app-state.service';
import { Resolution } from '@services/layout-state/store/layouts-resolution/resolution.types';
import { nxConfig } from '@services/nx-config/config';
import { cleanId } from '@utils/general';

import { NxFisheyeViewerComponent } from '../fisheye-viewer/fisheye-viewer.component';
import { CommonModule } from '@angular/common';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxRotateDirective } from '@directives/nx-rotate.directive';
import { PipesModule } from '@pipes/pipes.module';
import { ServiceModule } from '@services/services.module';
import { isDewarpingCapable } from '@utils/general';
import { NxVideoPlayingDirective } from '@directives/video-playing.directive';
import { NxVideoPlayerQueueService } from './video-player-queue.service';
import { toSignal } from '@angular/core/rxjs-interop';

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
    styleUrls: ['video-player.component.scss'],
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, NxRotateDirective, PipesModule, NxPreLoaderComponent, ServiceModule, NxFisheyeViewerComponent, NxVideoPlayingDirective],
})
export class NxVideoPlayerComponent {
    private appStateService = inject(NxAppStateService);
    camera$$ = input.required<NxSystemCamera>({ alias: 'camera' });
    muted$$ = input(true, { alias: 'muted' });
    volume$$ = input(1, { alias: 'volume' });

    playerQueue = inject(NxVideoPlayerQueueService);

    isMuted$$ = computed(() => this.muted$$() || !this.appStateService.userInteracted$$());

    volume$ = computed(() => this.muted$$() ? 0 : this.volume$());

    setVolumeEffect = effect(() => {
        if (!this.webRtcStreamRef?.nativeElement) {
            return;
        }
        this.webRtcStreamRef.nativeElement.volume = this.volume$$();
    })

    get camera(): NxSystemCamera {
        return this.camera$$();
    }
    @Input() rotation: number;
    renderParams = input.required<Pick<LayoutItem, 'zoomTop' | 'zoomRight' | 'zoomBottom' | 'zoomLeft' | 'dewarpingParams' | 'id'>>();

    @Input() lostConnectionPlaceholder: TemplateRef<any>;
    @Input() skipCredentialsCheck: boolean = false;

    resolution$$ = input.required<Resolution>({ alias: 'resolution' })

    showFisheye = input.required<boolean>()

    dewarpingParams$$ = computed(() => {
        if (this.showFisheye()) {
            const dewarpingParamsCamera = this.camera$$()?.dewarpingParams;
            if (dewarpingParamsCamera && isDewarpingCapable(dewarpingParamsCamera)) {
                const dewarpingParamsItem = this.renderParams().dewarpingParams
                return {
                    dewarpingParamsCamera,
                    dewarpingParamsItem,
                };
            }
        }
    })

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
        throttleByFrameRate(),
        shareReplay({ bufferSize: 1, refCount: false }),
        untilDestroyed(this),
    );

    document = document;

    constructor(
        private injector: Injector,
        public cdr: ChangeDetectorRef,
    ) {
        this.playerId = uuid();
        if (this.CONFIG.trafficRelayHost) {
            WebRTCStreamManager.RELAY_URL = this.CONFIG.trafficRelayHost;
        }
    }

    calculateCropParams = (drawParams: DrawImagePartialTuple): DrawImagePartialTuple => {
        const { zoomTop, zoomRight, zoomBottom, zoomLeft } = this.renderParams() || {};
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

        if ((['zoomTop', 'zoomBottom', 'zoomRight', 'zoomLeft'] as const).every(key => !this.renderParams()?.[key])) {
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
        try {
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
        } catch {
            // Not sure why this sometimes throws an error.;
        }
    }

    streamCleanup = async (stream?: MediaStream): Promise<void> => {
        if (this.webRtcStreamRef.nativeElement.srcObject && this.webRtcStreamRef.nativeElement.srcObject instanceof MediaStream) {
            const currentStream = this.webRtcStreamRef.nativeElement.srcObject;
            if (currentStream !== stream) {
                this.webRtcStreamRef.nativeElement.srcObject = null;
            }
            if (!stream) {
                await new Promise(resolve => setTimeout(resolve, 100));
                if (this.connection?.mediaStream$.observed) {
                    return;
                }
            }
            currentStream.getTracks().forEach(track => {
                track.stop();
                currentStream.removeTrack(track);
            });
        }
    }

    ngZone = inject(NgZone);

    dequeue$ = new BehaviorSubject(0);

    async ngAfterViewInit(): Promise<void> {
        if (!this.camera) {
            return;
        }

        this.originalStream.nativeElement.onblur = event => event.preventDefault();
        this.webRtcStreamRef.nativeElement.volume = this.volume$$();

        const availableStreams: AvailableStreams[] = this.camera.parameters.mediaStreams?.streams?.map(({ encoderIndex }) => encoderIndex).filter(stream => stream !== -1) ?? [AvailableStreams.SECONDARY, AvailableStreams.PRIMARY];
        const hasSecondary = availableStreams.includes(AvailableStreams.SECONDARY);
        const targetStream = availableStreams.length ? TargetStream.AUTO : hasSecondary ? TargetStream.LOW : TargetStream.HIGH;

        this.cdr.detach();
        this.hasChanges$.pipe(throttle(() => timer(500), { leading: false, trailing: true }), throttleByFrameRate(), untilDestroyed(this)).subscribe(() => this.cdr.detectChanges());

        const startStream = () => WebRTCStreamManager.connect({ cameraId: this.camera.id, systemId: this.camera.systemId, serverId: cleanId(this.camera.parentId), accessToken: this.camera.getAccessToken, targetStream }, this.originalStream.nativeElement);

        await this.playerQueue.queue(this);

        this.ngZone.runOutsideAngular(() => startStream().pipe(
            tap(async ([stream, error, connection]) => {
                this.connection = connection;
                this.connection.playbackRateUpdateCallback = (rate: number) => this.playbackRate$$.set(rate);
                this.syncAvailableStreams(connection, hasSecondary)
                this.streamCleanup(stream);
                if (stream) {
                    this.webRtcStreamRef.nativeElement.srcObject = await this.zoomStream(stream);
                    this.webRtcStreamRef.nativeElement.autoplay = true;

                    while (this.webRtcStreamRef.nativeElement.paused) {
                        await new Promise(resolve => setTimeout(resolve, 10));
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
            untilDestroyed(this)
        ).subscribe(() => {
            this.notifyChanges();
            this.dequeue$.next(Date.now());
        }));
    }

    changesNotifier$ = new Subject<number>();

    hasChanges$ = merge(this.changesNotifier$, this.ribbonContent$, this.dequeue$)

    notifyChanges(): void {
        this.changesNotifier$.next(Date.now());
    }

    notifyChangesEffect = effect(() => {
        this.resolution$$();
        this.muted$$();
        this.camera$$();
        this.renderParams();
        this.showFisheye();
        this.dewarpingParams$$();
        this.notifyChanges();
        this.debugInfo$$();
    });

    ngOnDestroy(): void {
        this.streamCleanup();
        this.dequeue$.next(Date.now());
    }

    actualResolution$$ = toSignal(timer(100, 250).pipe(map(() => {
        const video = this.webRtcStreamRef.nativeElement;
        const width = video.videoWidth;
        const height = video.videoHeight;
        if ([width, height].every(Boolean)) {
            return `${width} x ${height}`
        }
    })));

    playbackRate$$ = signal(1);

    debugInfo$$ = computed(() => {
        const selectedResolutionString = (this.resolution$$() || Resolution.AUTO).padEnd(5);
        const actualResolution = this.actualResolution$$();
        const actualResolutionString = actualResolution ? actualResolution.padEnd(12) : '';
        const playbackRateString = this.playbackRate$$().toFixed(2).padEnd(6);
        return `${selectedResolutionString}${actualResolutionString}${playbackRateString}`.trim();
    });
}
