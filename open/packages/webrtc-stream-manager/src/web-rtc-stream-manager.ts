// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { Observable, BehaviorSubject, timer, Subject, combineLatest, firstValueFrom, from, NEVER, interval } from 'rxjs';
import { filter, shareReplay, switchMap, take, map, delay, takeUntil, tap, distinctUntilChanged, debounceTime, bufferCount, timeout } from 'rxjs/operators';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { FrameTracker, FocusTracker, MosScoreTracker, BytesReceivedTracker } from './trackers';
import { MediaServerPeerConnection } from './media-server-peer-connection';
import { SignalingMessage, PlaybackDetails, ConnectionError, SdpInit, IceInit, ErrorMsg, StreamQuality, IntRange, MimeInit, StreamOrUrl, AvailableStreams, ApiVersions, Stream, RequiresTranscoding, isRequiresTranscoding } from './types';
import { BaseTracker } from './trackers/base-tracker';
import { ConnectionQueue, WithSkip, calculateElementFocus, calculateWindowFocusThreshold, getConnectionKey } from './utils';

type StreamsConfig = AvailableStreams | AvailableStreams[];

/**
 * Manages connection negotation using websockets as well as webRTC peer connections to mediaservers.
 *
 * Reuses peer connections when possible and only opens websocket connection for negotiating connections.
 */

export class WebRTCStreamManager {
    /** Time series to average */
    static PERFORMANCE_SAMPLE_SIZE = 5000

    /** For Tracking existing connections */
    static EXISTING_CONNECTIONS: Record<string, WebRTCStreamManager> = {};

    static AUTHENTICATED_HOSTS: Record<string, Promise<Boolean>> = {};

    /** Configure how often performance tuning as well as connection cleanup happens  */
    static SYNC_INTERVAL = 1000;

    /** Force sync to happen outside the normal sync interval would mostly be used for when playback position is updated */
    static forceSync$ = new BehaviorSubject('');

    static position = 0;

    /** Default Stream for new streams. Dependent on MOS score. */
    static INITIAL_STREAM: AvailableStreams = null;

    /** Used to trigger sync events such as performance tuning and connection cleanup */
    static sync$ = WebRTCStreamManager.forceSync$.pipe(
        switchMap(() => timer(0, WebRTCStreamManager.SYNC_INTERVAL)),
        tap(() => Object.values(WebRTCStreamManager.EXISTING_CONNECTIONS).forEach(connection => connection.updateTrackerMetrics(performance.now()))),
        delay(500),
        shareReplay({ refCount: false, bufferSize: 1 })
    );

    /** Current connections observable used gettings current metric values from trackers */
    static connections$ = WebRTCStreamManager.sync$.pipe(
        filter(iteration => iteration % 3 === 0),
        map(() => Object.entries(WebRTCStreamManager.EXISTING_CONNECTIONS))
    )

    /** Whether to log current playback performance details */
    static SHOW_STATS = true;

    /** Default stats handler, could be overriden */
    static STATS_HANDLER: (frameInfo: PlaybackDetails) => void = console.info;

    /**
     * Factory static method that accepts method selector and returns an observable of the current
     * playback details related to that selector.
     *
     * @returns Observable<PlaybackDetails> - Observable of current playback details
     */
    static detailFactory(method: 'getMetrics' | 'getSuggestedStreams') {
        return WebRTCStreamManager.connections$.pipe(
            map(connections => connections.reduce(
                (summary, [webRtcUrl, connection]) => {
                    const players = connection.getPlayerCount();
                    const stream = connection.currentStream()
                    const current = method === 'getMetrics'
                        ? {
                            stream,
                        } : {
                            quality: stream ? StreamQuality.low : StreamQuality.high
                        }
                    return {
                        ...summary,
                        [webRtcUrl]: {
                            ...connection[method](),
                            players,
                            ...current
                        },
                    }
                },
                {} as PlaybackDetails
            )),
            filter(details => {
                return this.SHOW_STATS && !!Object.keys(details).length
            })
        )
    }

    /**
     * Tracker instances used for performance tuning.
     *
     * Might make this configurable with custom trackers in the future.
     *
     * If we do we'll want to tighten up the type to require one instance of MosScoreTracker
     * or a a class derived from MosScoreTracker.
     */
    protected performanceTrackers: BaseTracker<unknown>[] = [
        new FrameTracker(WebRTCStreamManager.PERFORMANCE_SAMPLE_SIZE),
        new FocusTracker(WebRTCStreamManager.PERFORMANCE_SAMPLE_SIZE),
        new MosScoreTracker(WebRTCStreamManager.PERFORMANCE_SAMPLE_SIZE),
        new BytesReceivedTracker(WebRTCStreamManager.PERFORMANCE_SAMPLE_SIZE)
    ]

    /**
     * Checks if mos score is adequate on open connections to allow for high quality stream.
     */
    static calculateAdequateMosScore() {
        const openConnections = Object.keys(WebRTCStreamManager.EXISTING_CONNECTIONS).length;
        const mosScoreAverage = openConnections ? Object.values(WebRTCStreamManager.EXISTING_CONNECTIONS).reduce((total, connection) => {
            const mosScore = connection.getMetrics().mosScore as number || WebRTCStreamManager.HIGH_QUALITY_MOS_THRESHOLD;
            return mosScore + total
        }, 0) / openConnections : WebRTCStreamManager.HIGH_QUALITY_MOS_THRESHOLD;
        return mosScoreAverage >= WebRTCStreamManager.HIGH_QUALITY_MOS_THRESHOLD;
    }

    /**
     * Checks element focus and MOS quality to determine whether to use high or low quality stream.
     *
     * Low focus always uses low quality stream. High focus gets high quality stream
     * if MOS score is above threshold.
     *
     * @param videoElement - Video element to calculate focus score.
     * @returns stream - 0 for primary high quality, 1 for secondary low quality
     */
    static getInitialStream(videoElement: HTMLVideoElement): AvailableStreams {
        /** Calculate initial stream if it hasn't been set */
        WebRTCStreamManager.INITIAL_STREAM ??= WebRTCStreamManager.calculateAdequateMosScore() ? AvailableStreams.PRIMARY : AvailableStreams.SECONDARY;
        const addequateFocus = calculateElementFocus(videoElement) >= WebRTCStreamManager.HIGH_QUALITY_FOCUS_THRESHOLD;
        return addequateFocus ? WebRTCStreamManager.INITIAL_STREAM : AvailableStreams.SECONDARY;
    }

    /** Playback details for use in either logging during development or for performance tuning */
    static PLAYBACK_DETAILS$ = WebRTCStreamManager.detailFactory('getMetrics');

    static SUGGESTED_STREAMS$ = WebRTCStreamManager.detailFactory('getSuggestedStreams');

    /** Stream Switching Algorithm Parameters */

    static HIGH_QUALITY_FOCUS_THRESHOLD: IntRange<0, 6> = 2;

    static FOCUS_SCORE_MULTIPLIER = 5;

    static HIGH_QUALITY_FOCUS_SCORE_THRESHOLD = WebRTCStreamManager.HIGH_QUALITY_FOCUS_THRESHOLD * WebRTCStreamManager.FOCUS_SCORE_MULTIPLIER;

    static HIGH_QUALITY_FOCUS_SCORE_BASELINE = 320;

    static HIGH_QUALITY_MOS_THRESHOLD: IntRange<0, 6> = 3;

    static LOW_QUALITY_MOS_THRESHOLD: IntRange<0, 6> = 3;

    cooldownLock: ReturnType<typeof setTimeout>;

    aquireLock = (cooloffSeconds: number) => {
        this.cooldownLock = setTimeout(() => {
            this.cooldownLock = null;
        }, cooloffSeconds * 1000);
    }

    /**
     * The PRIORITIZED$ is used to determine the targetStream based on MOS.
     *
     * If the average MOS is above the HIGH_QUALITY_MOS_THRESHOLD then the targetStream is 0.
     *
     * If the average MOS is below the LOW_QUALITY_MOS_THRESHOLD then the targetStream is 1.
     *
     * The shouldUpdateStream is true if the curren MOS is not within the thresholds.
     *
     * If shouldUpdateStream is true then the details are sorted by priority in the order they should be switched.
     *
     * The first connection to that can be siwtched is updated.
     */
    static PRIORITIZED$ = WebRTCStreamManager.connections$.pipe(
        filter(connections => !!connections.length),
        map((connections) => connections.map(([_, connection]) => ({
            connection,
            ...connection.getPriority(),
            stream: connection.currentStream()
        }))),
        map(details => {
            const mosAverage = details.reduce((total, { mos }) => total + mos as IntRange<0, 6>, WebRTCStreamManager.LOW_QUALITY_MOS_THRESHOLD) / details.length
            const targetStream = !details.length || mosAverage >= WebRTCStreamManager.HIGH_QUALITY_MOS_THRESHOLD ? 0 : 1
            WebRTCStreamManager.INITIAL_STREAM = targetStream

            const shouldUpdateStream = targetStream ? mosAverage < WebRTCStreamManager.LOW_QUALITY_MOS_THRESHOLD : mosAverage > WebRTCStreamManager.HIGH_QUALITY_MOS_THRESHOLD;
            details = details.sort((a, b) => targetStream ? a.priority - b.priority : b.priority - a.priority)

            return {
                targetStream,
                shouldUpdateStream,
                details
            }
        }),
        tap(({ targetStream, shouldUpdateStream, details }) => {
            WebRTCStreamManager.HIGH_QUALITY_FOCUS_SCORE_THRESHOLD = calculateWindowFocusThreshold(WebRTCStreamManager.HIGH_QUALITY_FOCUS_SCORE_BASELINE);
            // console.info(`Focus threshold: ${WebRTCStreamManager.HIGH_QUALITY_FOCUS_SCORE_THRESHOLD}`)
            const getCameraId = (connection: WebRTCStreamManager) => {
                const webRtcUrl = connection.webRtcUrlFactory();
                return getConnectionKey(webRtcUrl)
            };

            const coolOff = (fn: (param: typeof details[number]) => boolean) => (cooloffSeconds?: number) => (param: typeof details[number]) => {
                if (param.connection.cooldownLock || !fn(param)) {
                    return false;
                }

                param.connection.aquireLock(cooloffSeconds);

                return true;
            }

            const canUpgrade = ({ stream, priority, mos }: typeof details[number]) => stream === 1 && priority > WebRTCStreamManager.HIGH_QUALITY_FOCUS_SCORE_THRESHOLD && mos > WebRTCStreamManager.HIGH_QUALITY_MOS_THRESHOLD;

            const canDowngrade = ({ stream, connection }: typeof details[number]) => connection.availableStreams.includes(AvailableStreams.SECONDARY) && stream === 0;

            const downgradeLowPriority = () => details.filter(coolOff(canDowngrade)()).forEach(({ priority, connection }) => {
                if (priority < WebRTCStreamManager.HIGH_QUALITY_FOCUS_SCORE_THRESHOLD) {
                    console.info(`Downgrading camera ${getCameraId(connection)} due to low priority/focus`)
                    connection.aquireLock(5);
                    connection.updateStream(AvailableStreams.SECONDARY)
                }
            })

            const downgradeConnnectionQuality = () => details.filter(coolOff(canDowngrade)()).forEach(({ mos, connection }) => {
                if (mos < WebRTCStreamManager.LOW_QUALITY_MOS_THRESHOLD) {
                    console.info(`Downgrading camera ${getCameraId(connection)} due to low connection quality`)
                    connection.aquireLock(90);
                    connection.updateStream(AvailableStreams.SECONDARY)
                }
            })

            if (shouldUpdateStream) {
                const updateTarget = details.find(targetStream ? coolOff(canDowngrade)(30) : coolOff(canUpgrade)(15))
                if (updateTarget) {
                    updateTarget.connection?.updateStream(targetStream as 0 | 1)
                    console.info(`Switching camera ${getCameraId(updateTarget.connection)} (${updateTarget.priority}) to ${targetStream ? 'low' : 'high'} quality`)
                } else {
                    console.info(`No cameras available to switch to ${targetStream ? 'low' : 'high'} quality`)
                }
            }

            downgradeLowPriority();
            downgradeConnnectionQuality();
        })
    )

    /** Subscriptions for tuning instances */

    /** Stats logger subcription, only adding as a static property in case we want to be able to unsubscribe */
    static STATS = WebRTCStreamManager.PLAYBACK_DETAILS$.pipe(
        tap(connectionStats => {
            Object.entries(connectionStats).forEach(([indentifier, stats]) => {
                if (typeof stats === 'object' && 'bytesReceived' in stats && !stats.bytesReceived) {
                    const connection = WebRTCStreamManager.EXISTING_CONNECTIONS[indentifier];
                    if(connection?.peerConnection?.connectionState === 'connected') {
                        console.info(`No bytes received for ${indentifier}. Reconnecting`);
                        WebRTCStreamManager.EXISTING_CONNECTIONS[indentifier].close(1);
                    }
                }
            })
        })
    ).subscribe(WebRTCStreamManager.STATS_HANDLER);

    /** Table listing streams suggested by each tracker. Used primarily for tweaking main algorithm. */
    static SUGGESTED_STREAMS = WebRTCStreamManager.SUGGESTED_STREAMS$.subscribe(WebRTCStreamManager.STATS_HANDLER);

    /**
     * Subscription to the PRIORITIZED$ observable.
     *
     * Actual stream tuning happens withing the PRIORITIZED$ observable.
     *
     * This subscription is only for logging and debugging purposes.
     *
     * Schema for observable:
     *
     * {
     *     targetStream: number;
     *     shouldUpdateStream: boolean;
     *     details: {
     *         stream: 0 | 1;
     *         priority: number;
     *         mos: number;
     *         fps: number;
     *         connection: WebRTCStreamManager;
     *     }[];
     * }
     *
     * The details are sorted ascending by priority if targetStream is 1, or descending if targetStream is 1.
     *
     * The shouldUpdateStream is used within PRIORITIZED$ to determine if the stream should be updated.
     *
     * If the stream should be updated it will iterate through the details to find the first
     * connection that can be updated.
     */
    static PRIORITIZED = WebRTCStreamManager.PRIORITIZED$.subscribe();

    static CONNECTION_CLEANUP = WebRTCStreamManager.sync$.pipe(
        map(() => new WeakMap(
            Object.entries(WebRTCStreamManager.EXISTING_CONNECTIONS).map(([
                _, connection
            ]) => [connection, connection.mediaStream$.observed])
        )),
        bufferCount(5, 1),
        tap((values) => {
            Object.entries(WebRTCStreamManager.EXISTING_CONNECTIONS).forEach(([webRtcUrl, connection]) => {
                const observedEntries = values.map((map) => map.get(connection)).map(observed => observed === undefined || observed);
                const notObserved = observedEntries.every(observed => !observed);
                if (notObserved) {
                    connection.close();
                    WebRTCStreamManager.EXISTING_CONNECTIONS[webRtcUrl]?.closeNotifier$.next('close')
                    delete WebRTCStreamManager.EXISTING_CONNECTIONS[webRtcUrl];
                }
            })
        })
    ).subscribe()


    /**
     * WebRTCStreamManager factory to either return existing instance to reuse exiting connection or instantiates instance.
     *
     * If accessToken is passed in it will attempt to login to the mediaserver using cookie authentication before connecting.
     *
     * Relay redirects are automatically resolved to ensure that the connection is made to the correct host.
     *
     * @param webRtcUrlFactory () => string
     * @param videoElement HTMLVideoElement
     * @param availableStreamsOrHasSecondary StreamsConfig | boolean - A boolean if secondary stream is available,
     * an array of available streams, or a single stream.
     * @param accessToken string
     * @returns Observable<[StreamOrUrl, ConnectionError, WebRTCStreamManager]>
     */
    static connect(
        webRtcUrlFactory: (params?: Record<string, unknown>) => string,
        videoElement?: HTMLVideoElement,
        targetStreams?: StreamsConfig,
        accessToken?: string,
        allowTranscoding?: boolean,
    ): Observable<[StreamOrUrl, ConnectionError, WebRTCStreamManager]>
    static connect(
        webRtcUrlFactory: (params?: Record<string, unknown>) => string,
        videoElement?: HTMLVideoElement,
        hasSecondary?: boolean,
        accessToken?: string,
        allowTranscoding?: boolean,
    ): Observable<[StreamOrUrl, ConnectionError, WebRTCStreamManager]>
    static connect(
        webRtcUrlFactory: (params?: Record<string, unknown>) => string,
        videoElement?: HTMLVideoElement,
        targetStreamsOrHasSecondary: StreamsConfig | boolean = [AvailableStreams.PRIMARY, AvailableStreams.SECONDARY],
        accessToken: string = null,
        allowTranscoding: boolean = false,
    ): Observable<[StreamOrUrl, ConnectionError, WebRTCStreamManager]> {
        const connectionKey = getConnectionKey(webRtcUrlFactory());
        const availableStreams = Array.isArray(targetStreamsOrHasSecondary) ? targetStreamsOrHasSecondary : targetStreamsOrHasSecondary ? [AvailableStreams.PRIMARY, AvailableStreams.SECONDARY] : [AvailableStreams.PRIMARY];

        WebRTCStreamManager.EXISTING_CONNECTIONS[connectionKey] ||= new WebRTCStreamManager(
            webRtcUrlFactory,
            videoElement,
            availableStreams,
            accessToken,
            allowTranscoding,
            connectionKey,
        );

        WebRTCStreamManager.EXISTING_CONNECTIONS[connectionKey].registerElement(videoElement);

        return WebRTCStreamManager.EXISTING_CONNECTIONS[connectionKey].mediaStream$.pipe(
            filter(res => !!res),
            takeUntil(WebRTCStreamManager.EXISTING_CONNECTIONS[connectionKey].closeNotifier$),
        );
    }

    static getInstance(cameraId: string): WebRTCStreamManager | null {
        return WebRTCStreamManager.EXISTING_CONNECTIONS[cameraId] || null;
    }

    static closeAll(): void {
        Object.values(WebRTCStreamManager.EXISTING_CONNECTIONS).forEach(connection => connection.close());
    }

    /**
     * Updates the position for stream for all WebRtcStreamManager instances.
     *
     * @param position - position in ms
     */
    static updatePosition(position = 0): void {
        WebRTCStreamManager.position = Math.round(position);
        Object.values(WebRTCStreamManager.EXISTING_CONNECTIONS).forEach(connection => {
            if (connection.getPlayerCount()) {
                connection.updatePosition(position);
            }
        });
    }

    private position$ = new BehaviorSubject(new WithSkip(0));
    private stream$ = new BehaviorSubject(new WithSkip(AvailableStreams.PRIMARY));
    public readonly apiVersion: ApiVersions;

    /**
     * Updates the position for stream for WebRtcStreamManager instance.
     * @param position - position in ms
     * @param clearStream - stop current stream immediately
     */
    updatePosition(position: number, clearStream = false): void {
        if (clearStream) {
            this.stopCurrentStream();
            this.mediaStream$.next([null, null, this]);
        }
        const useDataChannelUpdate = this.peerConnection?.remoteDataChannel?.readyState === 'open';
        if (useDataChannelUpdate) {
            this.peerConnection.remoteDataChannel.send(JSON.stringify({ position }));
        }
        this.position$.next(new WithSkip(position, useDataChannelUpdate));
    }

    /** Internal */
    private peerConnection: MediaServerPeerConnection;
    private wsConnectionUrl = '';
    private wsConnection: WebSocketSubject<SignalingMessage>;
    private videoElements: HTMLVideoElement[] = [];

    /** Public methods and properties */
    /** Updates whenever the mediasserver sends a new stream */
    mediaStream$ = new BehaviorSubject<[StreamOrUrl, ConnectionError, WebRTCStreamManager]>(null);

    /**
     * Get current count of players connected to stream.
     *
     * @returns number
     */
    public getPlayerCount(): number {
        return this.videoElements.length;
    }

    /**
     * Returns currently playing stream.
     *
     * @returns number - 0 or 1
     */
    public currentStream(): 0 | 1 {
        return this.stream$.value.value
    }

    /**
     * Checks if any players connected to an WebRtcStreamManager instance are currently playing.
     * @returns boolean
     */
    public getPlaying(): boolean {
        return this.videoElements.some(({ paused }) => !paused);
    }

    /**
     * Checks if any players connected to any WebRtcStreamManager instance are currently playing.
     *
     * @returns boolean
     */
    static getPlaying(): boolean {
        return Object.values(WebRTCStreamManager.EXISTING_CONNECTIONS).some(connection => connection.getPlaying()
        );
    }

    public togglePlaying(play: boolean): void {
        this.videoElements.forEach(el => {
            if (play) {
                el.play();
            } else {
                el.pause();
            }
        });
    }

    static togglePlaying(play?: boolean): void {
        play = typeof play === 'boolean' ? play : !this.getPlaying();
        Object.values(WebRTCStreamManager.EXISTING_CONNECTIONS).forEach(connection => connection.togglePlaying(play)
        );
    }

    /**
     * Update video player refs for all trackers.
     */
    public updateTrackerRefs() {
        this.performanceTrackers.forEach((tracker) => {
            tracker.updatePlayers(this.videoElements);
        })
    }

    /**
     * Trigger sampling of metrics for all registered trackers.
     *
     * @param now - number
     */
    public updateTrackerMetrics(now: number) {
        this.performanceTrackers.forEach((tracker) => {
            tracker.updateMetric(now);
        })
    }

    /**
     * Sync all trackers to reference current peer connection.
     */
    public updateTrackerConnections() {
        this.performanceTrackers.forEach((tracker) => {
            tracker.updateConnection(this.peerConnection)
        })
    }

    /**
     * Merges all metrics from registered trackers into a single object.
     *
     * @returns metrics - Record<string, unknown>
     */
    public getMetrics() {
        return this.performanceTrackers.reduce((acc, tracker) => ({
            ...acc,
            ...tracker.toMetric()
        }), {} as Record<string, unknown>)
    }

    /**
     * Returns aggregated priority score and mos score for connection using registered trackers.
     *
     * @returns { priority: number, mos: number, fps: number }
     */
    public getPriority() {
        return {
            priority: this.performanceTrackers.reduce((acc, tracker) => acc + tracker.toPriority(), 0),
            mos: <number>this.performanceTrackers.find((tracker) => tracker instanceof MosScoreTracker)?.toMetric().mosScore || 0,
            fps: <number>this.performanceTrackers.find((tracker) => tracker instanceof FrameTracker)?.toMetric().fps ?? Infinity
        }
    }

    public getSuggestedStreams() {
        return this.performanceTrackers.reduce((acc, tracker) => ({
            ...acc,
            ...tracker.toSuggestedStream()
        }), {})
    }

    /**
     * Registers video element for performance tracking.
     *
     * @param videoElement HTMLVideoElement
     * @returns void
     */
    public registerElement = (videoElement?: HTMLVideoElement): void => {
        // Fix type issue with requestVideoFrameCallback
        const element = videoElement as HTMLVideoElement & {
            requestVideoFrameCallback?: (number: unknown) => void;
        };

        if (!element) {
            return;
        }

        this.videoElements.push(videoElement);
        this.updateTrackerRefs()
        const root = videoElement.getRootNode();

        const observer = new MutationObserver(() => {
            if (!root.contains(element)) {
                this.videoElements.splice(this.videoElements.indexOf(element), 1);
                this.updateTrackerRefs()
            }
        });
        observer.observe(root, { childList: true, subtree: true });
        this.updatePosition(this.position$.value.value);
    };

    /** Subject ot trigger closing open websocket observables */
    private closeWsConnectionNotifier$ = new Subject<string>();

    private closeWsConnection = (): void => {
        this.closeWsConnectionNotifier$.next('close');
        this.wsConnection = null;
        this.wsConnectionUrl = '';
    }

    public closeNotifier$ = new Subject();


    /**
     * Stop all tracks on the stream to ensure mediaserver resources are freed up.
     */
    private stopCurrentStream = (): void => {
        const currentSource = this.mediaStream$.value?.[0]

        if (!currentSource || typeof currentSource === 'string') {
            return;
        }

        currentSource.getTracks().forEach(track => track.stop())
    };

    /** Peer Connection Helpers */
    /**
     * Handles cleaning up connections when no longer in use.
     */
    public close = (retryAfterSeconds: false | number = false): void => {
        this.stopCurrentStream();
        this.closeWsConnection();
        this.peerConnection?.close();
        this.peerConnection = null;
        this.performanceTrackers.forEach((tracker) => {
            tracker.connection = null;
        })

        if (retryAfterSeconds) {
            setTimeout(this.start, retryAfterSeconds * 1000)
        } else {
            this.closeNotifier$.next('close');
            delete WebRTCStreamManager.EXISTING_CONNECTIONS[getConnectionKey(this.webRtcUrlFactory())];
        }
    };

    /**
     * Updates the stream used for connection.
     *
     * @param stream - 0 | 1
     */
    public updateStream(stream: AvailableStreams): void {
        const updateToStream = stream ? AvailableStreams.SECONDARY : AvailableStreams.PRIMARY;
        const useDataChannelUpdate = this.peerConnection?.remoteDataChannel?.readyState === 'open';
        if (this.availableStreams.includes(updateToStream)) {
            if (useDataChannelUpdate) {
                this.peerConnection.remoteDataChannel.send(JSON.stringify({ stream: updateToStream }));
            }
            this.stream$.next(new WithSkip(stream ? AvailableStreams.SECONDARY : AvailableStreams.PRIMARY, useDataChannelUpdate));
        }
    }

    /**
     * Updates the stream used for connection.
     *
     * @param stream - 0 | 1
     */
    public updateAvailableStreams(streams: AvailableStreams[]): void {
        this.availableStreams = streams?.length ? streams: [AvailableStreams.PRIMARY];
        if (!this.availableStreams.includes(this.currentStream())) {
            this.updateStream(this.availableStreams[0])
        }
    }

    private mediaSource: MediaSource = null;
    private sourceBuffer: SourceBuffer = null;
    private mseDataBuffer: BufferSource[] = [];

    private appendBuffer = () => {
        if (this.sourceBuffer.updating) {
            return;
        }
        const nextSource = this.mseDataBuffer.shift();
        if (nextSource) {
            console.log('appending buffer')
            this.sourceBuffer.appendBuffer(nextSource);
        }
    }

    private initializeMse = (mimeType: string): void => {
        if (!MediaSource || !MediaSource.isTypeSupported(mimeType)) {
            this.mediaStream$.next([null, ConnectionError.transcodingDisabled, this]);
            return;
        }

        if (!this.mediaSource) {
            this.mediaSource = new MediaSource();
            this.mediaStream$.next([URL.createObjectURL(this.mediaSource), null, this]);
            this.mediaSource.onsourceopen = () => {
                console.log(`ms is opened: ${mimeType}`);
                this.sourceBuffer = this.mediaSource.addSourceBuffer(mimeType);
                this.sourceBuffer.onupdateend = this.appendBuffer;
            }
        }

    }

    /**
     * Handles websocket messages to negotiate connection.
     *
     * @param message MessageEvent<string>
     */
    private gotMessageFromServer = (signal: SdpInit | IceInit | ErrorMsg | MimeInit): void => {
        this.initPeerConnection();
        if ('mime' in signal) {
            this.initializeMse(signal.mime);
        }

        if ('sdp' in signal) {
            this.peerConnection
                .setRemoteDescription(new RTCSessionDescription(signal.sdp))
                .then(() => {
                    // Only create answers in response to offers
                    if (signal.sdp.type === 'offer') {
                        this.peerConnection
                            .createAnswer()
                            .then(this.createdDescription)
                            .catch(this.errorHandler);
                    }
                })
                .catch(this.errorHandler);
        } else if ('ice' in signal) {
            this.peerConnection
                .addIceCandidate(new RTCIceCandidate(signal.ice))
                .catch(this.errorHandler);
        } else {
            this.close(1);
        }
    };

    /**
     * Sets up session description.
     *
     * @param description RTCSessionDescriptionInit
     */
    private createdDescription = (description: RTCSessionDescriptionInit): void => {
        console.log('got description');

        this.peerConnection
            .setLocalDescription(description)
            .then(() => {
                this.wsConnection.next({ sdp: this.peerConnection.localDescription });
            })
            .catch(this.errorHandler);
    };

    /**
     * Handles peer connection errors
     * @param error
     */
    private errorHandler = (error: unknown): void => {
        console.log(error);
        this.peerConnection.close();
        this.peerConnection = null;
        this.initPeerConnection();
        this.wsConnection?.next({ error });
    }

    /**
     * Returns existing WebSocket connection if it hasn't been closed else it opens a new connection.
     *
     * @returns WebSocket
     */
    private getOpenWebSocketConnection = (): WebSocketSubject<SignalingMessage> => {
        if (!this.wsConnection) {
            this.start();
        }
        return this.wsConnection;
    };

    /** Initialization helpers */
    /**
     * Initializes websocket connection for negotating peer connection.
     */
    start = async (lostConnection = false): Promise<void> => {
        const mediaStreamIdle = async (): Promise<boolean> => firstValueFrom(
            interval(100).pipe(
                switchMap(
                    val => this.mediaStream$.observed || val > 20
                        ? Promise.resolve(!this.mediaStream$.observed)
                        : NEVER
                )
            )
        );

        ConnectionQueue.runTask(async (complete, requeue) => {
            if (await mediaStreamIdle()) {
                complete();
                return this.close(false);
            }

            if (lostConnection) {
                this.mediaStream$.next([null, ConnectionError.lostConnection, this]);
                complete();
                return this.close(3);
            }

            const position = WebRTCStreamManager.position;
            const stream = this.currentStream();
            let webRtcUrl = this.webRtcUrlFactory({ position });

            if (!webRtcUrl.endsWith('&')) {
                webRtcUrl += '&';
            }

            webRtcUrl += `stream=${stream}&`;

            console.info('Starting stream')
            // console.table({ webRtcUrl, stream, position })
            const webRtcUrlObject = new URL(webRtcUrl);
            const relayHost = webRtcUrlObject.host;
            const serverId = webRtcUrlObject.searchParams.get('x-server-guid');

            const fallback = ({ parameters: { mediaStreams: { streams: [] as Stream[] } } }) as const;
            const streamInfoEndpoint =
                `https://${relayHost}/rest/v2/devices/${this.cameraId}?_keepDefault=true&_with=parameters.mediaStreams.streams.codec,parameters.mediaStreams.streams.encoderIndex`;
            const fetchStreams = fetch(
                streamInfoEndpoint,
                { headers: { authorization: `Bearer ${this.accessToken}` }}
                ).then(response => response.json() as Promise<typeof fallback>).catch(() => fallback);
            const resolvedHost = await fetch(`https://${relayHost}/api/ping?x-server-guid=${serverId}`).then(response => new URL(response.url).host).catch(() => false as const)

            if (resolvedHost) {
                webRtcUrl = webRtcUrl.replace(relayHost, resolvedHost);
            } else {
                return requeue();
            }

            if (this.peerConnection) {
                this.peerConnection.close();
                this.peerConnection = null;
            }

            const { parameters: { mediaStreams: { streams }}} = await fetchStreams;

            const targetStream = streams.find(({ encoderIndex }) => encoderIndex === stream);
            const requiresTranscoding = Object.values(RequiresTranscoding).filter(isRequiresTranscoding);

            if (requiresTranscoding && this.apiVersion !== ApiVersions.v1) {
                const mse = 'deliveryMethod=mse';
                if (webRtcUrl.includes('deliveryMethod=srtp')) {
                    webRtcUrl = webRtcUrl.replace('deliveryMethod=srtp', mse)
                } else {
                    webRtcUrl += `${mse}&`
                }
            } else if (!this.allowTranscoding && targetStream && requiresTranscoding.includes(targetStream.codec)) {
                  const alternateStream = this.availableStreams.filter(stream => stream !== targetStream.encoderIndex)[0]
                  if (typeof alternateStream === 'number' ) {
                    const alternateTarget = streams.find(({ encoderIndex }) => encoderIndex === alternateStream);
                    if (alternateTarget && !requiresTranscoding.includes(alternateTarget.codec)) {
                        this.updateAvailableStreams([alternateStream])
                        complete();
                        return this.close(1);
                    }
                  }
                  this.mediaStream$.next([null, targetStream.codec === RequiresTranscoding.MJPEG ? ConnectionError.mjpegDisabled : ConnectionError.transcodingDisabled, this]);
                  complete();
                  return this.close(15);
            }

            this.wsConnectionUrl = webRtcUrl;
            this.closeWsConnection();

            this.wsConnection = webSocket(
                webRtcUrl
            );

            this.wsConnection.pipe(takeUntil(this.closeWsConnectionNotifier$)).subscribe({
                next: this.gotMessageFromServer,
                error: (err: Error) => {
                    complete();
                    this.close(1);
                },
                complete,
            });

        }, new URL(this.webRtcUrlFactory()).host, 500);
        await firstValueFrom(this.mediaStream$.pipe(filter((stream) => !!stream), takeUntil(this.closeNotifier$), timeout({ first: 2500, with: () => Promise.resolve() })))
    };

    /**
     * Initializes peer connection cleanup. Closes all websockets and peer connections when mediasource doesn't have any observers.
     */
    #initPeerConnectionCleanup = (): void => {
        WebRTCStreamManager.sync$
            .pipe(
                delay(WebRTCStreamManager.SYNC_INTERVAL),
                map(() => !this.mediaStream$.observed),
                bufferCount(5, 1),
                filter((buffer) => buffer.every((val) => val)),
                take(1)
            )
            .subscribe(() => this.close());
    };

    /**
     * Ensures that peer connection to mediaserver has been initialized.
     */
    private initPeerConnection = (): void => {
        this.peerConnection ||= new MediaServerPeerConnection(
            this.getOpenWebSocketConnection,
            this.closeWsConnection,
            this.start,
            stream => {
                console.log(stream);
                this.stopCurrentStream();
                this.mediaStream$.next([stream, null, this]);
            },
            buffer => {
                this.mseDataBuffer.push(buffer)
                if (!this.sourceBuffer.updating) {
                    console.log('updating buffer')
                    this.appendBuffer();
                }
            }
        );

        this.updateTrackerConnections();
    };

    /**
     * Do not use directly use factory WebRTCStreamManager.connect(webRtcUrlFactory) instead.
     *
     * @param webRtcUrlFactory (params: Record<string, unknown>) => string
     */
    private constructor(
        public webRtcUrlFactory: (params?: Record<string, unknown>) => string,
        videoElement?: HTMLVideoElement,
        private availableStreams: AvailableStreams[] = [AvailableStreams.PRIMARY, AvailableStreams.SECONDARY],
        private accessToken = '',
        public allowTranscoding = false,
        private cameraId = '',
    ) {
        const relayUrlObject = new URL(webRtcUrlFactory());
        const serverId = relayUrlObject.searchParams.get('x-server-guid');
        const version = relayUrlObject.searchParams.get('version') || ApiVersions.v1;
        this.apiVersion = Object.values(ApiVersions).find(apiVersion => apiVersion === version) || ApiVersions.v1;
        console.info(`Using API version ${this.apiVersion}`)
        const relayHost = relayUrlObject.host;
        this.updateStream(availableStreams.length === 1 ? availableStreams[0] : WebRTCStreamManager.getInitialStream(videoElement));

        WebRTCStreamManager.AUTHENTICATED_HOSTS[serverId || relayHost] ||= this.accessToken ? fetch(
            `https://${relayHost}/rest/v2/login/sessions/${this.accessToken}?setCookie=true&x-server-guid=${serverId}`,
            { credentials: 'include' }
        ).then(() => true).catch(() => false) : Promise.resolve(true);

        from(WebRTCStreamManager.AUTHENTICATED_HOSTS[serverId || relayHost]).pipe(switchMap(() => combineLatest([
            this.position$.pipe(filter(({ skip }) => !skip), map(({ value }) => value)),
            this.stream$.pipe(filter(({ skip }) => !skip), map(({ value }) => value))
        ])),
            distinctUntilChanged((prev, cur) => prev.every((val, i) => val === cur[i])),
            debounceTime(50)
        ).subscribe(() => this.start());
        this.#initPeerConnectionCleanup();
    }
}

// @ts-ignore Use for debugging
// window.toggleStreams = () =>  Object.values(WebRTCStreamManager.EXISTING_CONNECTIONS).forEach(connection => connection.updateStream(connection.stream$.value ? 0 : 1));
