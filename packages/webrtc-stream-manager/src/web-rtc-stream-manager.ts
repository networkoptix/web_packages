// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { Observable, BehaviorSubject, timer, Subject, combineLatest, firstValueFrom, from, NEVER, interval, fromEvent, merge, of, defer, throwError, Observer } from 'rxjs';
import { filter, shareReplay, switchMap, take, map, delay, takeUntil, tap, distinctUntilChanged, debounceTime, bufferCount, timeout, bufferTime, skipWhile, startWith, scan, throttleTime } from 'rxjs/operators';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { FocusTracker, MosScoreTracker, BytesReceivedTracker } from './trackers';
import { MediaServerPeerConnection } from './media-server-peer-connection';
import { SignalingMessage, PlaybackDetails, ConnectionError, SdpInit, IceInit, ErrorMsg, StreamQuality, IntRange, MimeInit, AvailableStreams, ApiVersions, Stream, RequiresTranscoding, isRequiresTranscoding, WebRtcUrlFactoryOrConfig, WebRtcUrlFactory, WebRtcUrlConfig, TargetStream, DataChannelMessage, isTimeStampMessage, isStreamChangeMessage, ConnectionType, isConfirmationMessage } from './types';
import { BaseTracker } from './trackers/base-tracker';
import { ConnectionQueue, WithSkip, getConnectionKey, createConnectionKey, cleanId, fetchWithRedirectAuthorization, cacheSuccess, streamSupported, frameRateTracker$, throttleByFrameRate, throttleByFrameRateScheduler$, generateRandomString, acquireLock, releaseLock } from './utils';

type StreamsConfig = AvailableStreams | AvailableStreams[];

const bufferUpdatingError = new Error('Buffer updating');

/**
 * Manages connection negotation using websockets as well as webRTC peer connections to mediaservers.
 *
 * Reuses peer connections when possible and only opens websocket connection for negotiating connections.
 */

export class WebRTCStreamManager {
    static RELAY_URL = '{systemId}.relay.vmsproxy.com'

    /** Time series to average */
    static PERFORMANCE_SAMPLE_SIZE = 5000

    /** Maximum number of seconds behind live when using MSE before attempting reconnect */
    static maxBehind = 10;

    /**
     * Prefix relay url to allow more than 6 websocket connections to the same host.
     *
     * Defaults to false until relay update is released on production.
     */
    static USE_RELAY_PREFIX = false;

    /** For Tracking existing connections */
    static EXISTING_CONNECTIONS: Record<string, WebRTCStreamManager> = {};

    static AUTHENTICATED_HOSTS: Record<string, Promise<Boolean>> = {};

    static logger?: Console;

    /** Configure how often performance tuning as well as connection cleanup happens  */
    static SYNC_INTERVAL = 1000;

    /** Force sync to happen outside the normal sync interval would mostly be used for when playback position is updated */
    static forceSync$ = new BehaviorSubject('');

    static position = 0;

    static getCurrentlyHighQuality = () => Object.values(WebRTCStreamManager.EXISTING_CONNECTIONS).filter(connection => connection.stream$.value.value === 0);
    static lowerAllStreams = () => this.getCurrentlyHighQuality().reduce((promise, connection) => promise.then(() => new Promise(resolve => setTimeout(resolve, 500))).then(() => connection.updateStream(1)), Promise.resolve());

    private static _INITIAL_STREAM = AvailableStreams.SECONDARY;

    static MAX_HIGH = 4;

    /** Default Stream for new streams. Dependent on MOS score. */
    static get INITIAL_STREAM() {
        if (Object.keys(WebRTCStreamManager.EXISTING_CONNECTIONS).length > WebRTCStreamManager.MAX_HIGH) {
            return AvailableStreams.SECONDARY;
        }
        return this._INITIAL_STREAM;
    };

    static set INITIAL_STREAM(stream: AvailableStreams) {
        this._INITIAL_STREAM = stream;
    }

    private static performanceIssueNotifier$ = new Subject<void>();

    static hasPerformanceIssues$ = this.performanceIssueNotifier$.pipe(
        switchMap(() => merge(
            of(true),
            timer(5_000).pipe(map(() => false))
        )),
        startWith(false),
    );

    /** Used to trigger sync events such as performance tuning and connection cleanup */
    static sync$ = WebRTCStreamManager.forceSync$.pipe(
        switchMap(() => timer(0, WebRTCStreamManager.SYNC_INTERVAL)),
        tap(() => Object.values(WebRTCStreamManager.EXISTING_CONNECTIONS).forEach(connection => connection.updateTrackerMetrics(performance.now()))),
        delay(500),
        throttleByFrameRate(),
        shareReplay({ refCount: false, bufferSize: 1 })
    );

    /** Current connections observable used gettings current metric values from trackers */
    static connections$ = WebRTCStreamManager.sync$.pipe(
        filter(iteration => iteration % 3 === 0),
        map(() => Object.entries(WebRTCStreamManager.EXISTING_CONNECTIONS)),
        throttleByFrameRate(),
    )

    static userInteracted$ = fromEvent(document, 'click').pipe(
        take(1),
        throttleByFrameRate(),
        shareReplay({ bufferSize: 1, refCount: false }),
    );

    /** Whether to log current playback performance details */
    static SHOW_STATS = true;

    /** Default stats handler, could be overriden */
    static STATS_HANDLER: (frameInfo: PlaybackDetails) => void = () => {}

    private streamNotAvailable = (stream: AvailableStreams) => !this.availableStreams.includes(stream) || this.disabledStreams.includes(stream);

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
            }),
            throttleByFrameRate(),
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
        new FocusTracker(WebRTCStreamManager.PERFORMANCE_SAMPLE_SIZE, WebRTCStreamManager.logger),
        new MosScoreTracker(WebRTCStreamManager.PERFORMANCE_SAMPLE_SIZE, WebRTCStreamManager.logger),
        new BytesReceivedTracker(WebRTCStreamManager.PERFORMANCE_SAMPLE_SIZE, WebRTCStreamManager.logger)
    ]

    /**
     * Checks if mos score is adequate on open connections to allow for high quality stream.
     */
    static calculateAdequateMosScore() {
        const mosValues = Object.values(WebRTCStreamManager.EXISTING_CONNECTIONS).map(connection => connection.getMetrics().mosScore as number).filter(mos => !!mos && !Number.isNaN(mos));

        if (!mosValues.length) {
            return true;
        }

        const mosAverage = mosValues.reduce((total, mos) => total + mos, 0) / mosValues.length;
        return mosAverage >= WebRTCStreamManager.HIGH_QUALITY_MOS_THRESHOLD;
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
    static getInitialStream(): AvailableStreams {
        return WebRTCStreamManager.INITIAL_STREAM
    }

    /** Playback details for use in either logging during development or for performance tuning */
    static PLAYBACK_DETAILS$ = WebRTCStreamManager.detailFactory('getMetrics');

    static SUGGESTED_STREAMS$ = WebRTCStreamManager.detailFactory('getSuggestedStreams');

    /** Stream Switching Algorithm Parameters */

    static HIGH_QUALITY_MOS_THRESHOLD: IntRange<0, 6> = 4;

    static LOW_QUALITY_MOS_THRESHOLD: IntRange<0, 6> = 3;

    cooldownLock: ReturnType<typeof setTimeout>;

    static cooldownLock: ReturnType<typeof setTimeout>;

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
            const mosValues = details.filter(({ mos }) => !!mos && !Number.isNaN(mos)).map(({ mos }) => mos);
            WebRTCStreamManager.INITIAL_STREAM = !details.length || Math.max(...mosValues) >= WebRTCStreamManager.HIGH_QUALITY_MOS_THRESHOLD ? 0 : 1;

            WebRTCStreamManager.logger?.info({ mosValues })

            return details.sort((a, b) => b.priority - a.priority)
        }),
        tap(async details => {
            const getCameraId = (connection: WebRTCStreamManager) => {
                const webRtcUrl = connection.webRtcUrlFactory();
                return getConnectionKey(webRtcUrl)
            };
            const { score, fps, maxFps } = (await firstValueFrom(frameRateTracker$));
            const clientSidePerformanceIssue = score < 50 && fps < 30;
            const clientPerformanceOptimal = fps > (maxFps < 60 ? 40 : 50);
            WebRTCStreamManager.INITIAL_STREAM = clientSidePerformanceIssue ? AvailableStreams.SECONDARY : AvailableStreams.PRIMARY;

            const streamsToUpgrade =
            details.length >= WebRTCStreamManager.MAX_HIGH ? [] : details
                .filter(({ stream, mos, connection }) => {
                    if (connection.streamNotAvailable(stream)) {
                    return false;
                    }

                    if (
                    clientSidePerformanceIssue ||
                    stream === AvailableStreams.PRIMARY
                    ) {
                    return false;
                    }

                    const hasSecondary = connection.availableStreams.includes(
                    AvailableStreams.SECONDARY
                    );
                    if (!hasSecondary) {
                    return true;
                    }

                    if (connection.allElementsSmall()) {
                    return false;
                    }

                    return (
                    clientPerformanceOptimal &&
                    mos > WebRTCStreamManager.HIGH_QUALITY_MOS_THRESHOLD
                    );
                })
                .map((state) => ({ ...state, upgrade: true }));
            const streamsToDowngrade = details.filter(({ stream, mos, connection }) => {
                if (connection.streamNotAvailable(stream)) {
                    return false;
                }
                const hasPrimary = connection.availableStreams.includes(AvailableStreams.PRIMARY);
                if (stream === AvailableStreams.SECONDARY) {
                    return false;
                }

                if (!hasPrimary || connection.allElementsSmall()) {
                    return true;
                }

                return clientSidePerformanceIssue || mos < WebRTCStreamManager.LOW_QUALITY_MOS_THRESHOLD;
            }).reverse().map(state => ({ ...state, upgrade: false }));
            const numStreamsToUpgrade = streamsToUpgrade.length > streamsToDowngrade.length ? streamsToDowngrade.length + 1: streamsToUpgrade.length;
            const numStreamsToDowngrade = streamsToDowngrade.length > streamsToUpgrade.length ? streamsToUpgrade.length + 1: streamsToDowngrade.length;
            const streamsToUpdate = [...streamsToUpgrade.slice(0, numStreamsToUpgrade), ...streamsToDowngrade.slice(0, numStreamsToDowngrade)];


            const updated = streamsToUpdate.filter(({ connection, upgrade }) => {
                const shouldUpdateStream = acquireLock(connection, 15, !upgrade);
                if (shouldUpdateStream) {
                    connection.updateStream(upgrade ? AvailableStreams.PRIMARY : AvailableStreams.SECONDARY);
                }
                return shouldUpdateStream;
            })
            if (updated.length) {
                WebRTCStreamManager.logger?.info(`Switched streams for ${updated.length} devices: ${updated.map(({ connection }) => `${getCameraId(connection)}(Stream ${connection.currentStream()})`).join(', ')}`)
            } else {
                WebRTCStreamManager.logger?.info(`No cameras available to switch quality`)
            }

            if (clientSidePerformanceIssue || clientPerformanceOptimal) {
                acquireLock(WebRTCStreamManager, clientPerformanceOptimal ? 5 : 90, true);
            }

            if (clientSidePerformanceIssue || streamsToDowngrade.length && document.visibilityState === 'visible') {
                WebRTCStreamManager.performanceIssueNotifier$.next();
            }
        }),
        throttleByFrameRate(),
    )

    private allElementsSmall(): boolean {
        return this.videoElements?.length && this.videoElements.every(({ element: { offsetWidth, offsetHeight } }) => [offsetWidth, offsetHeight].every(value => value < 400))
    }

    /** Subscriptions for tuning instances */

    /** Stats logger subcription, only adding as a static property in case we want to be able to unsubscribe */
    static STATS = WebRTCStreamManager.PLAYBACK_DETAILS$.pipe(
        tap(connectionStats => {
            Object.entries(connectionStats).forEach(([indentifier, stats]) => {
                if (typeof stats === 'object') {
                    const noBytes = 'bytesReceived' in stats && !stats.bytesReceived;
                    const noFps = 'fps' in stats && stats.fps === 0;
                    const connection = WebRTCStreamManager.EXISTING_CONNECTIONS[indentifier];
                    if (noBytes && noFps) {
                        connection.noFrames++;
                        // If no frames are received for 6 seconds for high quality stream or 15 seconds for low quality stream
                        // then we close the connection and reconnect.
                        const threshold = connection.stream$.value ? 5 : 2;
                        if(connection.noFrames > threshold && connection?.peerConnection?.connectionState === 'connected') {
                            connection.noFrames = 0;
                            WebRTCStreamManager.logger?.info(`No bytes received for ${indentifier}. Reconnecting`);
                            WebRTCStreamManager.EXISTING_CONNECTIONS[indentifier].close(1);
                        }
                    } else {
                        connection.noFrames = 0;
                    }
                }
            })
        }),
        throttleByFrameRate(),
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


    /**
     * WebRTCStreamManager factory to either return existing instance to reuse exiting connection or instantiates instance.
     *
     * Relay redirects are automatically resolved to ensure that the connection is made to the correct relay.
     *
     * Authentication is handled automatically.
     *
     * Reconnections on lost connection are handled automatically.
     *
     * @param webRtcUrlConfig WebRtcUrlConfig
     * @param videoElement HTMLVideoElement
     * @returns Observable<[MediaStream, ConnectionError, WebRTCStreamManager]>
     */
    static connect(
        webRtcUrlConfig: WebRtcUrlConfig,
        videoElement?: HTMLVideoElement,
    ): Observable<[MediaStream, ConnectionError, WebRTCStreamManager]>
    /**
     * @deprecated Use WebRtcUrlConfig instead of WebRtcUrlFactory for first argument.
     *
     * WebRTCStreamManager factory to either return existing instance to reuse exiting connection or instantiates instance.
     *
     * Relay redirects are automatically resolved to ensure that the connection is made to the correct host.
     *
     * If accessToken is passed then authentication will be handled automatically. If accessToken isn't passed then
     * session should be created using cookie authentication before calling connect.
     *
     * Reconnections on lost connection are handled automatically.
     *
     * @param webRtcUrlFactory WebRtcUrlFactory
     * @param videoElement HTMLVideoElement
     * @param availableStreamsOrHasSecondary StreamsConfig | boolean - A boolean if secondary stream is available,
     * an array of available streams, or a single stream.
     * @param accessToken string
     * @returns Observable<[MediaStream, ConnectionError, WebRTCStreamManager]>
     */
    static connect(
        webRtcUrlFactory: WebRtcUrlFactory,
        videoElement?: HTMLVideoElement,
        targetStreams?: StreamsConfig,
        accessToken?: string | (() => string),
        allowTranscoding?: boolean,
    ): Observable<[MediaStream, ConnectionError, WebRTCStreamManager]>
    static connect(
        webRtcUrlFactoryOrConfig: WebRtcUrlFactoryOrConfig,
        videoElement?: HTMLVideoElement,
        targetStreams: StreamsConfig = null,
        accessToken: string | (() => string) = null,
        allowTranscoding: boolean = false,
    ): Observable<[MediaStream, ConnectionError, WebRTCStreamManager]> {
        const connectionKey = WebRTCStreamManager.createConnectionKey(webRtcUrlFactoryOrConfig);
        if (!targetStreams && 'targetStream' in webRtcUrlFactoryOrConfig) {
            const streams = webRtcUrlFactoryOrConfig.targetStream;
            targetStreams = streams === TargetStream.AUTO ? [AvailableStreams.PRIMARY, AvailableStreams.SECONDARY] : [streams === TargetStream.HIGH ? AvailableStreams.PRIMARY : AvailableStreams.SECONDARY]
        }

        if ('allowTranscoding' in webRtcUrlFactoryOrConfig) {
            allowTranscoding = webRtcUrlFactoryOrConfig.allowTranscoding;
        }

        if (!targetStreams) {
            targetStreams = [AvailableStreams.PRIMARY, AvailableStreams.SECONDARY];
        }

        const availableStreams = Array.isArray(targetStreams) ? targetStreams : [targetStreams];

        if (!accessToken && 'accessToken' in webRtcUrlFactoryOrConfig) {
            accessToken = webRtcUrlFactoryOrConfig.accessToken;
        }

        const getAccessToken = typeof accessToken === 'function' ? accessToken : () => accessToken as string;

        WebRTCStreamManager.EXISTING_CONNECTIONS[connectionKey] ||= new WebRTCStreamManager(
            webRtcUrlFactoryOrConfig,
            availableStreams,
            getAccessToken,
            allowTranscoding,
            connectionKey,
        );

        const instance = WebRTCStreamManager.EXISTING_CONNECTIONS[connectionKey];

        instance.registerElement(videoElement);

        return instance.mediaStream$.pipe(
            filter(res => !!res),
            takeUntil(instance.closeNotifier$),
            tap(({
                next: ([mediaStream, connectionError, connection]) => {
                    if (connectionError && [ConnectionError.transcodingDisabled, ConnectionError.mjpegDisabled].includes(connectionError)) {
                        connection.requiresTranscodingError = true;
                    }
                    if (!mediaStream) {
                        instance.restartHandleFrozenStream$.next(true);
                        return;
                    }
                    if (videoElement) {
                        instance.registerFrameNotifier(videoElement);
                    }
                    instance.handleFrozenStream();
                },
                unsubscribe: () => {
                    instance.unregisterElement(videoElement);
                    instance.subscribers$.next(-1);
                },
                subscribe: () => instance.subscribers$.next(1),
            }))
        );
    }

    static createConnectionKey = (webRtcUrlFactory: WebRtcUrlFactoryOrConfig) => {
        if (typeof webRtcUrlFactory === 'function') {
            return getConnectionKey(webRtcUrlFactory());
        }
        return createConnectionKey({ id: webRtcUrlFactory.cameraId, systemId: webRtcUrlFactory.systemId });
    };

    static getInstance(cameraId: { id: string, systemId: string }): WebRTCStreamManager | null {
        return WebRTCStreamManager.EXISTING_CONNECTIONS[createConnectionKey(cameraId)] || null;
    }

    static closeAll(): Promise<true> {
        return Object.values(
            WebRTCStreamManager.EXISTING_CONNECTIONS
        ).reduce(
            async (promise, connection) => {
                await promise;
                await new Promise(resolve => setTimeout(resolve, 50));
                await connection.close();
                return true;
            },
            Promise.resolve(true as const)
        );
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

    static updateCameraPosition(cameraId: { id: string, systemId: string }, position = 0, withinChunk = false): Observable<number> {
        const connection = WebRTCStreamManager.getInstance(cameraId);

        if (!connection) {
            return NEVER;
        }

        const currentPosition = connection.currentPosition / 1000;

        if (currentPosition !== position) {
            const connected = connection.updatePosition(position);

            if (withinChunk && !connected) {
                connection.start();
            }

        }

        return connection.currentPosition$;

    }

        /**
     * Updates the speed for stream for all WebRtcStreamManager instances.
     *
     * @param speed - number or unlimited
     */
    static updateSpeed(speed = 1): void {
        Object.values(WebRTCStreamManager.EXISTING_CONNECTIONS).forEach(connection => {
            if (connection.getPlayerCount()) {
                connection.updateSpeed(speed);
            }
        });
    }

    private position$ = new BehaviorSubject(new WithSkip(0));
    private speed$ = new BehaviorSubject(new WithSkip(0));
    private stream$ = new BehaviorSubject(new WithSkip(AvailableStreams.PRIMARY));
    public apiVersion: ApiVersions;
    private initialPositionSent = false;

    private currentPositionTracker$ = new BehaviorSubject(-1);

    /**
     * Observable of current video position reported by mediaserver.
     *
     * Only supported on 6.0+
     */
    public currentPosition$ = this.currentPositionTracker$.asObservable();

    /**
     * Current video position reported by mediaserver.
     *
     * Only supported on 6.0+
     */
    public get currentPosition(): number {
        return this.currentPositionTracker$.value;
    }

    private getStatic = () => WebRTCStreamManager;

    /**
     * Updates the speed for stream for WebRtcStreamManager instance.
     * @param speed - number or unlimited
     * @param clearStream - stop current stream immediately
     */
    updateSpeed(speed: number, clearStream = false): void {
        if (clearStream) {
            this.stopCurrentStream();
        }

        this.speed$.next(new WithSkip(speed));
    }

     /**
     * Updates the position for stream for WebRtcStreamManager instance.
     * @param position - position in ms
     * @param clearStream - stop current stream immediately
     */
    updatePosition(position: number, clearStream = false, withinChunk = false): boolean {
        if (clearStream) {
            this.stopCurrentStream();
            this.mediaStream$.next([null, null, this]);
        }
        const useDataChannelUpdate = withinChunk && this.apiVersion === ApiVersions.v2 && !!this.peerConnection?.remoteDataChannel && this.initialPositionSent;

        if (useDataChannelUpdate) {
            this.peerConnection?.remoteDataChannel?.send(JSON.stringify({ seek: position }));
        }

        this.initialPositionSent = true;
        this.position$.next(new WithSkip(position, useDataChannelUpdate));
        return !!this.peerConnection?.remoteDataChannel;
    }

    /** Internal */
    private wsConnection: WebSocketSubject<SignalingMessage>;
    private videoElements: {element: HTMLVideoElement, observer: MutationObserver }[] = [];

    /** Public methods and properties */
    /** Updates whenever the mediasserver sends a new stream */
    mediaStream$ = new BehaviorSubject<[MediaStream, ConnectionError, WebRTCStreamManager]>(null);

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
        return this.stream$.value.value ?? WebRTCStreamManager.getInitialStream();
    }

    /**
     * Checks if any players connected to an WebRtcStreamManager instance are currently playing.
     * @returns boolean
     */
    public getPlaying(): boolean {
        return this.videoElements.some(({ element: { paused } }) => !paused);
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
        this.videoElements.forEach(({ element }) => {
            if (play) {
                element.play();
            } else {
                element.pause();
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
            tracker.updatePlayers(this.videoElements.map(({ element }) => element));
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
            if (this.peerConnection) {
                tracker.updateConnection(this.peerConnection)
            }
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
            priority: <number>this.performanceTrackers.find((tracker) => tracker instanceof FocusTracker)?.toMetric().focus || 0,
            mos: <number>this.performanceTrackers.find((tracker) => tracker instanceof MosScoreTracker)?.toMetric().mosScore || 0,
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

        this.updateTrackerRefs()
        const root = videoElement.getRootNode();

        const observer = new MutationObserver(() => {
            if (!root.contains(element)) {
                observer.disconnect();
                this.videoElements.splice(this.videoElements.findIndex(({ element }) => element === videoElement), 1);
                this.updateTrackerRefs()
            }
        });
        observer.observe(root, { childList: true, subtree: true });
        this.videoElements.push({ element, observer });
        this.updatePosition(this.position$.value.value);
        this.updateSpeed(this.speed$.value.value);
    };

    public unregisterElement = (videoElement?: HTMLVideoElement): void => {
        if (!videoElement) {
            return;
        }

        const elementAndObserver = this.videoElements.splice(this.videoElements.findIndex(({ element }) => element === videoElement), 1)[0];
        if (elementAndObserver) {
            elementAndObserver.observer.disconnect();
            this.updateTrackerRefs();
        }

        MediaServerPeerConnection.forceGarbageCollection();
    }

    /** Subject ot trigger closing open websocket observables */
    private closeWsConnectionNotifier$ = new Subject<string>();

    private closeWsConnection = (): void => {
        this.closeWsConnectionNotifier$.next('close');
        this.wsConnection = null;
    }

    public closeNotifier$ = new Subject();

    /**
     * Updater for keeping track of current subscribers
     */
    private subscribers$ = new Subject<1 | -1>();

    /**
     * Auto closes connection after 5 seconds of no subscribers during that time.
     */
    private autoClose = () => {
        this.subscribers$.pipe(
            scan((acc, value) => acc + value, 0),
            switchMap(count => count ? NEVER : timer(5_000)),
            takeUntil(this.closeNotifier$)
        ).subscribe(() => this.close());
    }

    /**
     * Stop all tracks on the stream to ensure mediaserver resources are freed up.
     */
    private stopCurrentStream = (): void => {
        const currentSource = this.mediaStream$.value?.[0]

        if (!currentSource) {
            return;
        }

        currentSource.getTracks().forEach(track => {
            track.stop();
            if (!this.peerConnection?.signalingState || this.peerConnection.signalingState !== 'closed') {
                return;
            }
            try {
                currentSource.removeTrack(track);
            } catch {}
        })
    };

    /** Peer Connection Helpers */
    /**
     * Handles cleaning up connections when no longer in use.
     */
    public close = (retryAfterSeconds: false | number = false, checkCodec = false): Promise<boolean> => {
        if (checkCodec) {
            this.codecChanged = generateRandomString();
            this.usingMse = false;
            this.mimeType = '';
        }
        this.stopCurrentStream();
        this.closeWsConnection();
        this.cleanupBuffers();

        this.peerConnection?.close();
        this.peerConnection = null;
        this.performanceTrackers.forEach((tracker) => {
            tracker.connection = null;
            tracker.destroy();
        })

        if (retryAfterSeconds) {
            setTimeout(this.start, retryAfterSeconds * 1000)
        } else {
            this.closeNotifier$.next('close');
            delete WebRTCStreamManager.EXISTING_CONNECTIONS[this.connectionKey];
        }
        return new Promise((resolve) => setTimeout(resolve, 100)).then(() => !!retryAfterSeconds);
    };

    private cleanupBuffers = (clearStream = true) => {

        if (clearStream) {
            if (this.videoRef) {
                URL.revokeObjectURL(this.videoRef.src);
                this.videoRef.src = null;
                this.videoRef.srcObject = null;
            }
            if (this.mediaSource?.readyState === 'open') {
                this.mediaSource.endOfStream();
            }
            this.videoRef?.remove();
            this.videoRef = null;
        }
        const mediaStream = this.mediaStream$.value?.[0];
        this.video = null;
        if (mediaStream && clearStream) {
            mediaStream.getTracks().forEach(track => {
                track.stop();
                try {
                    mediaStream.removeTrack(track);
                } catch {}
            });
            this.mediaStream$.next([null, null, this]);
        }
        if (this.mediaSource) {
            for (const buffer of this.mediaSource.sourceBuffers) {
                try {
                    if (this.sourceBuffer === buffer) {
                        this.sourceBuffer = null;
                    }

                    this.mediaSource.removeSourceBuffer(buffer);
                    buffer.abort();
                    buffer.remove(0, buffer.buffered.end(0));
                } catch(e) {
                    WebRTCStreamManager.logger?.error(e);
                }
            }
        }

        if (this.sourceBuffer) {
            try {
                this.sourceBuffer.abort();
                this.sourceBuffer.remove(0, this.sourceBuffer.buffered.end(0));
            } catch(e) {
                WebRTCStreamManager.logger?.error(e);
            }
        }
        this.mediaSource = null;
        this.sourceBuffer = null;
    };

    private disabledStreams: AvailableStreams[] = [];

    private get availableStreams() {
        return this._availableStreams.filter(stream => !this.disabledStreams.includes(stream));
    }

    private set availableStreams(streams: AvailableStreams[]) {
        this._availableStreams = streams;
    }

    /**
     * Updates the stream used for connection.
     *
     * @param stream - 0 | 1
     */
    public async updateStream(stream?: AvailableStreams, isAuto = false): Promise<void> {
        acquireLock(this, isAuto ? 30 : 360, true);
        if (stream === undefined) {
            if (this.availableStreams.includes(AvailableStreams.SECONDARY) && (this.allElementsSmall() || (await firstValueFrom(frameRateTracker$)).score < 50)) {
                stream = AvailableStreams.SECONDARY;
            } else {
                stream = WebRTCStreamManager.getInitialStream();
            }
        }

        const currentlyHighQuality = WebRTCStreamManager.getCurrentlyHighQuality();

        if (this.availableStreams.includes(AvailableStreams.SECONDARY) && currentlyHighQuality.length >= WebRTCStreamManager.MAX_HIGH) {
            WebRTCStreamManager.lowerAllStreams();
            stream = AvailableStreams.SECONDARY;
        }

        if (this.streamNotAvailable(stream)) {
            stream = this.availableStreams[0];
        }

        if (this.stream$.value.value === stream) {
            return;
        }

        const useDataChannelUpdate = this.apiVersion === ApiVersions.v2 && !!(this.peerConnection?.remoteDataChannel?.readyState === 'open');
        this.stream$.next(new WithSkip(stream, useDataChannelUpdate));
        let confirmed = !useDataChannelUpdate;

        if (useDataChannelUpdate) {
            this.peerConnection?.remoteDataChannel?.send(JSON.stringify(this.getCurrentStreamInfo()));
            confirmed = await this.getConfirmation(500);
        }

        if (!confirmed || !(await this.streamChanged())) {
            this.start();
        }
    }

    /**
     * Updates the stream used for connection.
     *
     * @param stream - 0 | 1
     */
    public updateAvailableStreams(streams: AvailableStreams[]): void {
        this.availableStreams = streams?.length ? [...streams].sort() : [AvailableStreams.PRIMARY];

        const initialStream = this.allElementsSmall() ? AvailableStreams.SECONDARY : WebRTCStreamManager.getInitialStream();

        const isAuto = streams.length > 1;

        const autoStream = this.availableStreams.includes(initialStream) ? initialStream : this.availableStreams[0];

        const targetStream = isAuto ? autoStream : streams[0];

        clearTimeout(this.cooldownLock);
        this.cooldownLock = null;
        this.updateStream(targetStream, isAuto);
    }

    private mediaSource: MediaSource = null;
    private sourceBuffer: SourceBuffer = null;

    private buffers: BufferSource[] = [];

    private appendFromBuffers = () => {
        const nextBuffer = this.buffers.pop();
        if (!nextBuffer) {
            return
        }

        try {
            if (this.sourceBuffer.updating) {
                throw bufferUpdatingError;
            } else {
                this.sourceBuffer.appendBuffer(nextBuffer);
            }
        } catch(e) {
            this.buffers.push(nextBuffer);
            if (e !== bufferUpdatingError) {
                this.close(0.1)
            }
        }
    }

    private appendBuffer = (buffer: BufferSource) => {
        this.buffers.unshift(buffer);
        if (!this.sourceBuffer) {
            this.initializeMse();
            return;
        }

        this.appendFromBuffers();
    }

    private videoRef: HTMLVideoElement & { captureStream: () => MediaStream }

    private frameTimes$ = new Subject<number>();

    private registerFrameNotifier = (video: HTMLVideoElement) => {
        const handleFrameNotification = (time: number) => {
            this.frameTimes$.next(time);
            if (video === this.video || this.videoElements.some(({ element }) => element === video)) {
                video.requestVideoFrameCallback(handleFrameNotification);
            }
        }
        video.requestVideoFrameCallback(handleFrameNotification);
    }

    private restartHandleFrozenStream$ = new Subject();

    private handleFrozenStream = () => {
        this.restartHandleFrozenStream$.next(true);
        const startToggle$ = this.mediaStream$.pipe(switchMap(async stream => stream?.[0] && firstValueFrom(this.frameTimes$)))
        const frameAccumulator$ = this.frameTimes$.pipe(
            bufferTime(1000),
            bufferCount(10, 1),
            map(frames => frames.flat()),
            skipWhile(frames => frames.length < 5)
        );
        startToggle$.pipe(
            switchMap(playing => playing ? frameAccumulator$ : NEVER),
            tap(times => WebRTCStreamManager.logger?.info('frame check: frames received in last 5 seconds', times.length)),
            bufferCount(2),
            filter(([prev, current]) => !prev.length && !current.length),
            take(1),
            takeUntil(this.restartHandleFrozenStream$),
            takeUntil(this.closeNotifier$)
        ).subscribe(() => {
            WebRTCStreamManager.logger?.info('frame check: no frames received in last 10 seconds');
            this.close(0.1);
        });
    }

    private get video() {
        if (!this.videoRef) {
            this.videoRef = document.createElement('video') as typeof this.videoRef;

            this.videoRef.style.position = 'absolute';
            this.videoRef.style.top = '0px';

            this.videoRef.style.width = '1px';
            this.videoRef.style.height = '1px';
            this.videoRef.style.visibility = 'hidden';
            this.videoRef.muted = true;
            this.videoRef.autoplay = true;
            this.videoRef.volume = 0.0001;
            this.registerFrameNotifier(this.videoRef);
            document.body.appendChild(this.videoRef);

            this.startUnmuteHandler();
        }
        return this.videoRef;
    }

    private set video(video: WebRTCStreamManager['videoRef'] | null) {
        if (this.videoRef) {
            this.videoRef.src = null;
            this.videoRef.remove();
        }

        if (video) {
            this.videoRef = video;
        }
    }

    private async startUnmuteHandler() {
        await firstValueFrom(WebRTCStreamManager.userInteracted$)
        if (this.videoRef) {
            this.videoRef.muted = false;
        }
    }

    public mimeType: string;

    private disableCurrentStream = () => {
        this.disabledStreams.push(this.currentStream());
        if (this.availableStreams.length) {
            this.updateStream(this.availableStreams[0]);
        }
    }

    private initializeMse = (mimeType?: string): Promise<void> => {
        if (mimeType) {
            this.mimeType = mimeType;
        } else {
            mimeType = this.mimeType;
        }
        if (!MediaSource || !MediaSource.isTypeSupported(mimeType)) {
            this.disableCurrentStream();

            if (this.availableStreams.length) {
                this.close(0.1);
            } else {
                this.mediaStream$.next([null, ConnectionError.transcodingDisabled, this]);
            }
            return;
        }

        if (!this.mediaSource) {
            this.mediaSource = new MediaSource();

            this.video.src = URL.createObjectURL(this.mediaSource)

            const newStream = this.video.captureStream();
            this.stopCurrentStream();
            this.mediaStream$.next([newStream, null, this]);
            const webRtcStreamManager = this;
            const streamTracker = new class {
                private streamCheckTimeout: ReturnType<typeof setTimeout>;
                private chunks = 0;
                private droppedChunks = 0;
                private get duration() {
                    const sourceBuffer = webRtcStreamManager.sourceBuffer;
                    try {
                        return sourceBuffer.buffered.length ? sourceBuffer.buffered.end(sourceBuffer.buffered.length - 1) - sourceBuffer.buffered.start(0) : 0;
                    } catch(_) {
                        webRtcStreamManager.close(0.1);
                        return 0;
                    }
                }
                private startTime = 0;
                droppedChunk() {
                    this.droppedChunks++;
                }
                addChunk() {
                    this.droppedChunks = Math.max(0, this.droppedChunks - 3)
                    this.chunks++;
                }
                getAverage() {
                    return this.chunks && this.duration ? this.duration / this.chunks : 0.25;
                }
                shouldDisable() {
                    return this.droppedChunks > 5 && webRtcStreamManager.availableStreams.includes(AvailableStreams.SECONDARY) && webRtcStreamManager.currentStream() !== AvailableStreams.SECONDARY;
                }
                get hasSecondary() {
                    return webRtcStreamManager.availableStreams.includes(AvailableStreams.SECONDARY) && webRtcStreamManager.currentStream() !== AvailableStreams.SECONDARY;
                }
                track() {
                    if (this.hasSecondary) {
                        this.trackChunks();
                    } else if (!this.streamCheckTimeout) {
                        this.trackCurrentTime();
                    }

                }
                private trackChunks() {
                    const playbackTime = webRtcStreamManager.video.currentTime;
                    const currentTime = Math.round(Date.now() / 1000)
                    if (playbackTime && !this.startTime) {
                        this.startTime = currentTime - playbackTime;
                    }

                    const timeSinceStart = currentTime - this.startTime;
                    const timeBehind = timeSinceStart - playbackTime;

                    if (playbackTime && timeBehind > WebRTCStreamManager.maxBehind) {
                        WebRTCStreamManager.performanceIssueNotifier$.next()
                        return webRtcStreamManager.close(0.1);
                    }
                    this.streamCheckTimeout = setTimeout(() => {
                        this.droppedChunk();
                        this.clear();
                        if (this.shouldDisable()) {
                            return webRtcStreamManager.updateAvailableStreams([AvailableStreams.SECONDARY]);
                        } else {
                            this.track();
                        }
                    }, this.getAverage() * 1000);
                }
                private trackCurrentTime() {
                    const playbackTime = webRtcStreamManager.video.currentTime;
                    if (!playbackTime) {
                        this.streamCheckTimeout = setTimeout(() => {
                            this.trackCurrentTime();
                        }, 1000);
                        return;
                    }
                    const currentTime = Math.round(Date.now() / 1000)
                    this.startTime ||= currentTime - playbackTime;
                    const timeSinceStart = currentTime - this.startTime;
                    const timeBehind = timeSinceStart - playbackTime;
                    if (timeBehind > WebRTCStreamManager.maxBehind) {
                        WebRTCStreamManager.performanceIssueNotifier$.next()
                        webRtcStreamManager.close(0.1);
                    } else {
                        this.streamCheckTimeout = setTimeout(() => {
                            this.trackCurrentTime();
                        }, (WebRTCStreamManager.maxBehind - timeBehind) * 1_000);
                    }
                }
                clear() {
                    clearTimeout(this.streamCheckTimeout);
                    this.streamCheckTimeout = null;
                }
            }
            this.mediaSource.onsourceclose = function () {
                streamTracker.clear();
            }
            this.mediaSource.onsourceopen = function () {
                if (!webRtcStreamManager.sourceBuffer && this.readyState === 'open') {
                    webRtcStreamManager.sourceBuffer = this.addSourceBuffer(mimeType);
                    webRtcStreamManager.sourceBuffer.mode = 'sequence';

                    streamTracker.track()

                    webRtcStreamManager.sourceBuffer.onupdateend = function() {
                        streamTracker.addChunk();
                        streamTracker.track();

                        try {
                            if (!this.buffered?.length) {
                                return;
                            }
                        } catch(_) {
                            return webRtcStreamManager.close(0.1);
                        }

                        if (webRtcStreamManager.buffers.length) {
                            webRtcStreamManager.appendFromBuffers();
                        }
                    }
                }
            }
        }
    }

    /**
     * Handles websocket messages to negotiate connection.
     *
     * @param message MessageEvent<string>
     */
    private gotMessageFromServer = (signal: SdpInit | IceInit | ErrorMsg | MimeInit | { transcoding: { audio: boolean; video: boolean }}): void => {
        this.initPeerConnection();
        if ('transcoding' in signal && signal.transcoding.video && !this.allowTranscoding) {
            if (!this.usingMse && this.apiVersion !== ApiVersions.v1) {
                this.usingMse = true;
                this.close(0.1);
                return;
            }

            this.disableCurrentStream();
            if (this.availableStreams.length) {
                this.close(0.1);
            } else {
                this.mediaStream$.next([null, ConnectionError.transcodingDisabled, this]);
                this.close(false);
            }
        }
        if ('mime' in signal) {
            this.cleanupBuffers();
            if (this.usingMse) {
                this.initializeMse(signal.mime);
            }
        }

        if ('sdp' in signal) {
            const remote = new RTCSessionDescription(signal.sdp)
            this.peerConnection
                ?.setRemoteDescription(remote)
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
                ?.addIceCandidate(new RTCIceCandidate(signal.ice))
                .catch(this.errorHandler);
        } else {
            this.close(0.1);
        }
    };

    /**
     * Sets up session description.
     *
     * @param description RTCSessionDescriptionInit
     */
    private createdDescription = (description: RTCSessionDescriptionInit): void => {
        WebRTCStreamManager.logger?.log('got description');

        this.peerConnection
            ?.setLocalDescription(description)
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
        WebRTCStreamManager.logger?.log(error);
        this.peerConnection?.close();
        this.peerConnection = null;
        this.initPeerConnection();
        this.wsConnection?.next({ error });
        this.start();
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

    static cachedApiVersion: Record<string, ApiVersions> = {};

    private async getApiVersion(): Promise<ApiVersions> {
        const systemId = new URL(this.webRtcUrlFactory()).host.split('.').shift();
        const cached = WebRTCStreamManager.cachedApiVersion[systemId]
        if (cached) {
            this.apiVersion = cached;
            return cached
        }

        const relayHost = new URL(this.webRtcUrlFactory({ position: 0 })).host;
        const endpoint = `https://${relayHost}/rest/v2/system/info?_with=version`;
        const fallback = { version: '5.1' }
        const version = await cacheSuccess(() => fetchWithRedirectAuthorization(
            endpoint,
            { headers: { authorization: `Bearer ${this.accessToken()}` }}
        ), `${relayHost.split('.')[0]}-version`).then(
            response => response.json() as Promise<typeof fallback>
        ).catch(
            () => fallback).then(({ version }) => parseFloat(version.split('.').slice(0, 2).join('.'))
        );

        this.apiVersion = isNaN(version) || version < 6 ? ApiVersions.v1 : ApiVersions.v2;
        this.proxyDisabled = this.apiVersion === ApiVersions.v1 || version < 6.1;
        WebRTCStreamManager.cachedApiVersion[systemId] = this.apiVersion;

        return this.apiVersion
    }

    /**
     * SystemId's for which proxying is disabled.
     */
    static proxyDisabled = new Set<string>();
    /**
     * ServerId's for which proxying is required.
     */
    static requiresProxy = new Set<string>();
    /**
     * Proxying is disabled for this system.
     */
    private set proxyDisabled(value: boolean) {
        if (value) {
            acquireLock(this, Infinity, true);
            WebRTCStreamManager.proxyDisabled.add(this.systemId);
        } else {
            releaseLock(this);
            WebRTCStreamManager.proxyDisabled.delete(this.systemId);
        }
    }
    private get proxyDisabled() {
        return WebRTCStreamManager.proxyDisabled.has(this.systemId);
    }
    /**
     * Server is unreachable by proxy.
     */
    private get unreachableByProxy() {
        return this.proxyDisabled && this.useProxy;
    }
    /**
     * Proxying is required for this server.
     */
    private set useProxy(value: boolean) {
        if (value) {
            acquireLock(this, Infinity, true);
            WebRTCStreamManager.requiresProxy.add(this.serverId);
        } else {
            releaseLock(this);
            WebRTCStreamManager.requiresProxy.delete(this.serverId);
        }
    }
    private get useProxy() {
        return WebRTCStreamManager.requiresProxy.has(this.serverId);
    }
    private serverId: string;
    private targetServerId: string;

    static cameraRequiresTranscoding = new Set<string>();

    private get requiresTranscodingError() {
        return WebRTCStreamManager.cameraRequiresTranscoding.has(this.connectionKey);
    }

    private set requiresTranscodingError(value: boolean) {
        if (value) {
            acquireLock(this, Infinity, true);
            WebRTCStreamManager.cameraRequiresTranscoding.add(this.connectionKey);
        } else {
            releaseLock(this);
            WebRTCStreamManager.cameraRequiresTranscoding.delete(this.connectionKey);
        }
    }

    private codecCheckKey = generateRandomString();
    private codecChanged = generateRandomString();

    get cameraId() {
        return this.connectionKey.split('_').pop();
    }

    private get systemId() {
        return this.connectionKey.split('_').shift();
    }

    usingMse = false;

    private maxTimeout = 5_000

    start = async (lostConnection = false): Promise<unknown> => this.startHandler(lostConnection).catch(() => setTimeout(() => this.mediaStream$.observed && this.start(true), 100));

    /** Initialization helpers */
    /**
     * Initializes websocket connection for negotating peer connection.
     */
    startHandler = async (lostConnection = false): Promise<unknown> => {
        if (this.unreachableByProxy) {
            this.mediaStream$.next([null, ConnectionError.proxyDisabled, this]);
            return this.close(false, this.apiVersion === ApiVersions.v1)
        }

        if (this.requiresTranscodingError) {
            this.mediaStream$.next([null, ConnectionError.transcodingDisabled, this]);
            return this.close(false, this.apiVersion === ApiVersions.v1);
        }

        releaseLock(this);
        this.currentPositionTracker$.next(-1);
        const mediaStreamIdle = async (): Promise<boolean> => firstValueFrom(
            interval(100).pipe(
                switchMap(
                    val => this.mediaStream$.observed || val > 20
                        ? Promise.resolve(!this.mediaStream$.observed)
                        : NEVER
                )
            )
        );

        if (await mediaStreamIdle()) {
            return this.close(false);
        }

        if (this.apiVersion !== ApiVersions.v2) {
            this.apiVersion = await this.getApiVersion();
        }

        if (lostConnection) {
            this.updateStream(AvailableStreams.SECONDARY);
            acquireLock(this, 60, true);
            this.mediaStream$.next([null, ConnectionError.lostConnection, this]);
            return this.close(3, this.apiVersion === ApiVersions.v1);
        }

        const position = this.position$.value.value;
        const speed = !position ? Infinity : this.speed$.value.value || 1;
        const stream = this.currentStream();
        let webRtcUrl = this.webRtcUrlFactory({ position, speed: speed === Infinity ? 'unlimited' : speed, stream });

        if (!webRtcUrl.endsWith('&')) {
            webRtcUrl += '&';
        }

        const systemId = new URL(webRtcUrl).host.split('.').shift();

        WebRTCStreamManager.logger?.info('Starting stream')
        // WebRTCStreamManager.logger?.table({ webRtcUrl, stream, position })
        const webRtcUrlObject = new URL(webRtcUrl);
        const relayHost = webRtcUrlObject.host;
        this.serverId = webRtcUrlObject.searchParams.get('x-server-guid');
        this.targetServerId = this.serverId;

        const fallback = ({ parameters: { mediaStreams: { streams: [] as Stream[] } }, serverId: this.targetServerId, id: this.cameraId }) as const;
        const deviceParams = '?_keepDefault=true&_with=parameters.mediaStreams.streams.codec,parameters.mediaStreams.streams.encoderIndex,serverId,id'
        const allStreamsInfoEndpoint = `https://${relayHost}/rest/v2/devices${deviceParams}`
        const streamInfoEndpoint =
            `https://${relayHost}/rest/v2/devices/${this.cameraId}${deviceParams}`;

        const fetchAllStreams = cacheSuccess(() => fetchWithRedirectAuthorization(
            allStreamsInfoEndpoint,
            { headers: { authorization: `Bearer ${this.accessToken()}` }}
            ), `${systemId}-streams-${this.codecCheckKey}`).then(response => response.json() as Promise<typeof fallback[]>).catch(() => [] as typeof fallback[]);

        const fetchCurrentStream = () => cacheSuccess(() => fetchWithRedirectAuthorization(
            streamInfoEndpoint,
            { headers: { authorization: `Bearer ${this.accessToken()}` }}
            ), `${this.connectionKey}-streams-${this.codecCheckKey}`).then(response => response.json() as Promise<typeof fallback>).catch(() => fallback)

        const fetchStreams = fetchAllStreams.then(devices => {
            const device = devices.find(({ id }) => cleanId(id) === this.cameraId);

            if (this.codecChanged === this.codecCheckKey && device) {
                return device;
            }

            this.codecCheckKey = this.codecChanged;

            return fetchCurrentStream();
        });

        this.serverId ||= cleanId((await fetchStreams).serverId)

        if (!this.targetServerId && !this.useProxy) {
            this.targetServerId = this.serverId;
        }

        const directConnect = !this.useProxy && !!this.targetServerId;

        if (directConnect) {
            const existing = new URL(webRtcUrl).searchParams.get('x-server-guid');

            if (existing) {
                webRtcUrl = webRtcUrl.replace(`x-server-guid=${existing}&`, '');
                webRtcUrl += `x-server-guid=${this.targetServerId}&`
            }
        }


        const resolvedHost = await fetch(`https://${relayHost.replace(this.prefix, generateRandomString())}/api/ping?${directConnect && this.serverId ? `x-server-guid=${this.serverId}` : ''}`).then(async response => {
            this.useProxy = cleanId((await response.json())?.reply?.moduleGuid || '') !== this.serverId;
            return !this.useProxy && new URL(response.url).host
        }).catch(() => false as const);

        const invalidAccessToken = () => {
            this.mediaStream$.next([null, ConnectionError.invalidAccessToken, this]);
            return this.close(2)
        }

        let oneTimeToken = '';

        const getOneTimeToken = (): Promise<string> => {
            let oneTimeTokenEndpoint = `https://${resolvedHost}/rest/v3/login/tickets`;

            if (directConnect) {
                oneTimeTokenEndpoint += `?x-server-guid=${this.targetServerId}&`
            }

            return fetchWithRedirectAuthorization(oneTimeTokenEndpoint, { headers: { authorization: `Bearer ${this.accessToken()}` }, method: 'POST'}).then(response => response.json()).then(res => {
                return res.token;
            })
        }

        if (resolvedHost) {
            webRtcUrl = webRtcUrl.replace(relayHost, resolvedHost);
            if (this.accessToken()) {
                if (this.apiVersion === ApiVersions.v1) {
                    const accessToken = this.accessToken();
                    const hostWithAccessToken = `${resolvedHost}-${accessToken}`
                    this.getStatic().AUTHENTICATED_HOSTS[hostWithAccessToken] = !(await this.getStatic().AUTHENTICATED_HOSTS[hostWithAccessToken]) ? cacheSuccess(() => fetch(
                        `https://${resolvedHost}/rest/v2/login/sessions/${accessToken}?setCookie=true`,
                        { credentials: 'include' }
                    ), hostWithAccessToken).then(res => res.ok) : this.getStatic().AUTHENTICATED_HOSTS[hostWithAccessToken];

                    if (!(await this.getStatic().AUTHENTICATED_HOSTS[hostWithAccessToken])) {
                        return invalidAccessToken()
                    }
                } else {
                    oneTimeToken = await getOneTimeToken();
                    if (!oneTimeToken) {
                        return invalidAccessToken()
                    }
                }
            }
        } else {
            this.useProxy = true;
            this.targetServerId = null;
            return this.start();
        }

        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }

        const streamsRes = await fetchStreams
        const streams = streamsRes?.parameters?.mediaStreams?.streams || fallback.parameters.mediaStreams.streams;

        const targetStream = streams.find(({ encoderIndex }) => encoderIndex === stream);
        const requiresTranscoding = Object.values(RequiresTranscoding).filter(isRequiresTranscoding);

        const srtp = 'deliveryMethod=srtp';

        if ((this.usingMse || targetStream?.codec && requiresTranscoding.includes(targetStream.codec) ) && this.apiVersion !== ApiVersions.v1) {
            const mse = 'deliveryMethod=mse';
            if (webRtcUrl.includes(srtp)) {
                webRtcUrl = webRtcUrl.replace(srtp, mse)
            } else {
                webRtcUrl += `${mse}&`
            }
            this.usingMse = true;
        } else if (!this.allowTranscoding && targetStream && requiresTranscoding.includes(targetStream.codec)) {
                this.disableCurrentStream();
                if (this.availableStreams.length) {
                    return this.close(0.1);
                }
                this.mediaStream$.next([null, targetStream.codec === RequiresTranscoding.MJPEG ? ConnectionError.mjpegDisabled : ConnectionError.transcodingDisabled, this]);
                return this.close(5);
        }

        this.closeWsConnection();

        let retries = 10;

        const url = (webRtcUrl.endsWith('&') ? webRtcUrl.slice(0, -1) : webRtcUrl);
        this.closeWsConnection();

        const webRtcStreamManager = this;
        const openConnection = (observer: Partial<Observer<SignalingMessage>>, retries = 10) => new Promise<void>(resolve => {
            defer(async () => {
                const prefixed = url.replace(this.prefix, generateRandomString());
                this.wsConnection = new WebSocketSubject({
                    url: this.apiVersion === ApiVersions.v1 ? prefixed : `${prefixed}&_ticket=${await getOneTimeToken()}&_ignore=${generateRandomString()}}`,
                    closeObserver: {
                        /**
                         * Handles reconnecting if there's some low level error with the websocket connection.
                         */
                        next: async _close => {
                            if (_close.code !== 1006 || webRtcStreamManager.mediaStream$.value?.[0]) {
                                return;
                            }
                            if (--retries) {
                                ConnectionQueue.runTask(async resolve => {
                                    await openConnection(observer, retries);
                                    resolve();
                                }, `connect-${webRtcStreamManager.connectionKey.split('_').shift()}`, 4);
                            } else {
                                webRtcStreamManager.start()
                            }
                        }
                    }
                });
                return this.wsConnection
            }).pipe(
                switchMap(val => val),
                timeout({ first: this.maxTimeout, with: () => throwError(() => new Error('timeout')) }),
                takeUntil(this.closeWsConnectionNotifier$),
                tap({
                    error: resolve,
                    complete: resolve
                })
            ).subscribe(observer)
        });

        if (WebRTCStreamManager.USE_RELAY_PREFIX) {
            openConnection({
                next: this.gotMessageFromServer,
                error: async (err: Error) => {
                    if (err.message === 'timeout') {
                        await new Promise(resolve => setTimeout(resolve, this.maxTimeout));
                        if (webRtcStreamManager.maxTimeout <= 20_000) {
                            webRtcStreamManager.maxTimeout += 2_500;
                            if (webRtcStreamManager.maxTimeout === 12_500) {
                                webRtcStreamManager.mediaStream$.next([null, ConnectionError.lostConnection, this])
                            }
                        } else {
                            return webRtcStreamManager.start(true);
                        }
                    }
                    WebRTCStreamManager.logger?.error(err);
                    await new Promise(resolve => setTimeout(resolve, 100));
                    if (--retries) {
                        return webRtcStreamManager.start();
                    }
                    webRtcStreamManager.mediaStream$.next([null, ConnectionError.lostConnection, this]);
                    webRtcStreamManager.start(true)
                },
                complete: () => webRtcStreamManager.closeWsConnection(),
            });
        } else {
            ConnectionQueue.runTask(async (completeCallback, requeueCallback) => {
                const requeue = () => {
                    this.closeWsConnection();
                    requeueCallback();
                }

                const complete = () => {
                    this.closeWsConnection();
                    completeCallback();
                };

                openConnection({
                    next: val => this.gotMessageFromServer,
                    error: async (err: Error) => {
                        if (err.message === 'timeout') {
                            await new Promise(resolve => setTimeout(resolve, this.maxTimeout));
                            if (webRtcStreamManager.maxTimeout < 20_000) {
                                webRtcStreamManager.maxTimeout += 2_500;
                            } else {
                                webRtcStreamManager.mediaStream$.next([null, ConnectionError.lostConnection, this]);
                            }
                        }
                        WebRTCStreamManager.logger?.error(err);
                        await new Promise(resolve => setTimeout(resolve, 100));
                        if (--retries) {
                            // await new Promise(resolve => setTimeout(resolve, 100));
                            requeue();
                            return;
                        }
                        webRtcStreamManager.mediaStream$.next([null, ConnectionError.lostConnection, this]);
                        webRtcStreamManager.close(0.1);
                        complete();
                    },
                    complete,
                });
            }, new URL(webRtcUrl).host, 4, 500, 10_000, WebRTCStreamManager.logger)
        }


        await firstValueFrom(this.mediaStream$.pipe(
            filter((stream) => !!stream),
            takeUntil(this.closeNotifier$),
            timeout({ first: 10_000, with: () => Promise.resolve() })
        ))
    };

    #initRestartInactiveStream = (): void => {
        timer(0, 100).pipe(
            map(() => !this.usingMse && !!this.mediaStream$.observed && this.mediaStream$.value?.[0] && !this.mediaStream$.value[0].active),
            switchMap(inactive => inactive ? timer(1_000) : NEVER),
            takeUntil(this.closeNotifier$)
        ).subscribe(() => this.close(0.1));
    };

    get isLive() {
        return !this.position$.value.value;
    }

    private confirmation$ = new Subject<string>();

    private getConfirmation = (timeoutDuration: number): Promise<boolean> => firstValueFrom(
        this.confirmation$.pipe(
            map(() => true),
            timeout({
        first: timeoutDuration,
        with: () => of(false)
    })))

    private streamChanged = (): Promise<boolean> => {
        const currentWidth = this.mediaStream$.value?.[0]?.getVideoTracks()[0]?.getSettings().width;
        return firstValueFrom(
            timer(1000, 100).pipe(
                filter(() => this.mediaStream$.value?.[0]?.getVideoTracks()[0]?.getSettings().width !== currentWidth),
                map(() => true),
                timeout({ first: 10_000, with: () => of(false) })
            )
        )
    }

    handleDataChannelMessage = (message: string): void => {
        try {
            const data = JSON.parse(message) as DataChannelMessage;
            WebRTCStreamManager.logger?.info('Data channel message', data);

            if (isConfirmationMessage(data)) {
                this.confirmation$.next(generateRandomString());
            }

            if(isTimeStampMessage(data)) {
                // Datachannel still using microseconds vs milliseconds for positionMs query param
                const timestampMs = data.timestamp / 1000;
                if (this.isLive) {
                    WebRTCStreamManager.logger?.info('skip updating position from timestamp since live', timestampMs)
                } else {
                    WebRTCStreamManager.logger?.info('updating position from timestamp', timestampMs)
                    this.position$.next(new WithSkip(timestampMs, true));
                }

                this.currentPositionTracker$.next(timestampMs )
                return;
            }

            if (isStreamChangeMessage(data)) {
                WebRTCStreamManager.logger?.info('stream codec changed, reconnecting')
                this.close(0.1, true);
                return;
            }

        } catch(e) {
            WebRTCStreamManager.logger?.error('Error parsing data channel message', e);
        }
    }

    connectionType: ConnectionType = {
        usingRelay: false,
        remoteCandidateType: 'host',
        localCandidateType: 'host',
        localAddress: '',
        remoteAddress: '',
    }

    private getCurrentStreamInfo = () => ({
        stream: this.currentStream(),
        position: this.position$.value.value,
        speed: this.speed$.value.value as number | 'unlimited'
    })

    private peerConnection: MediaServerPeerConnection | null;

    /**
     * Ensures that peer connection to mediaserver has been initialized.
     */
    private initPeerConnection = (): void => {
        this.peerConnection ||= new MediaServerPeerConnection(
            this.getOpenWebSocketConnection,
            this.closeWsConnection,
            this.start,
            stream => {
                WebRTCStreamManager.logger?.log(stream);
                this.stopCurrentStream();
                this.mediaStream$.next([stream, null, this]);
            },
            this.appendBuffer,
            this.getCurrentStreamInfo,
            this.handleDataChannelMessage,
            this.updateConnectionType,
            WebRTCStreamManager.logger,
        );

        this.updateTrackerConnections();
    };

    public updateConnectionType = (connectionType: Partial<ConnectionType>) => {
        connectionType = {...this.connectionType, ...connectionType};
        if(
            ([
                'usingRelay',
                'localAddress',
                'remoteAddress',
                'remoteCandidateType',
                'localCandidateType'] as const
            ).some(key => connectionType[key] !== this.connectionType[key])
        ) {
            connectionType.usingRelay = [connectionType.remoteCandidateType, connectionType.localCandidateType].includes('relay');
            this.connectionType = connectionType as ConnectionType;
        }
    };

    private prefix = generateRandomString();

    private generateWebRtcUrl = (config: WebRtcUrlConfig): WebRtcUrlFactory => {
        const currentStreamInfo = this.getCurrentStreamInfo();
        const systemId = cleanId(config.systemId);
        const cameraId = cleanId(config.cameraId);
        const serverId = cleanId(config.serverId);

        const subDomain = WebRTCStreamManager.USE_RELAY_PREFIX ? `${this.prefix}---${systemId}` : systemId;

        const host = WebRTCStreamManager.RELAY_URL.replace('{systemId}', subDomain);
        const useV2 = this.apiVersion === ApiVersions.v2;
        const endpoint = useV2 ? `/rest/v3/devices/${cameraId}/webrtc?` : `/webrtc-tracker/?camera_id=${cameraId}&`

        const positionParam = (position: unknown): string => {
            position ||= 0;

            if (typeof position !== 'string' && typeof position !== 'number') {
                return ''
            }

            const parsedPosition = parseInt(typeof position === 'number' ? position.toString() : position);

            if (!parsedPosition) {
                return ''
            }

            return `${useV2 ? 'positionMs' : 'position'}=${position || 0}&`
        };

        const speedParam = (position: unknown): string => {
            if (typeof position !== 'string' && typeof position !== 'number') {
                return ''
            }

            return `speed=${position || 0}&`
        };

        const streamParam = (stream: unknown): string => {
            if (typeof stream === 'number') {
                return `stream=${stream}&`
            }
        }

        return (params: Partial<ReturnType<typeof this.getCurrentStreamInfo>>) => `wss://${host}${endpoint}${serverId ? `x-server-guid=${serverId}&` : ''}${positionParam(params?.position ?? currentStreamInfo.position)}${speedParam(params?.speed ?? currentStreamInfo.speed)}${streamParam(params?.stream ?? currentStreamInfo.stream)}`
    }

    private webRtcUrlFactory: WebRtcUrlFactory = (params: Record<string, unknown>) => {
        if (typeof this.webRtcUrlFactoryOrConfig === 'function') {
            return this.webRtcUrlFactoryOrConfig(params);
        }

        return this.generateWebRtcUrl(this.webRtcUrlFactoryOrConfig)(params);
    }

    public noFrames = 0;

    public playbackRateUpdateCallback = (rate: number): void => {};

    /**
     * Do not use directly use factory WebRTCStreamManager.connect(webRtcUrlFactory) instead.
     *
     * @param webRtcUrlFactory (params: Record<string, unknown>) => string
     */
    private constructor(
        private webRtcUrlFactoryOrConfig: WebRtcUrlFactoryOrConfig,
        private _availableStreams: AvailableStreams[] = [AvailableStreams.PRIMARY, AvailableStreams.SECONDARY],
        private accessToken = () => '',
        public allowTranscoding = false,
        public connectionKey = '',
    ) {
        const existingConnections = WebRTCStreamManager.getCurrentlyHighQuality();
        if (existingConnections.length >= WebRTCStreamManager.MAX_HIGH) {
            WebRTCStreamManager.lowerAllStreams();
        }
        if (typeof webRtcUrlFactoryOrConfig !== 'function') {
            if ('position' in webRtcUrlFactoryOrConfig) {
                this.updatePosition(webRtcUrlFactoryOrConfig.position);
            }

            if ('speed' in webRtcUrlFactoryOrConfig) {
                this.updateSpeed(typeof webRtcUrlFactoryOrConfig.speed === 'number' ? webRtcUrlFactoryOrConfig.speed : Infinity);
            }

            this.updateStream(webRtcUrlFactoryOrConfig.targetStream === TargetStream.AUTO ? WebRTCStreamManager.getInitialStream() : webRtcUrlFactoryOrConfig.targetStream ? AvailableStreams.SECONDARY : AvailableStreams.PRIMARY);
        } else {
            this.updateStream(WebRTCStreamManager.getInitialStream());
        }

        if('apiVersion' in webRtcUrlFactoryOrConfig && webRtcUrlFactoryOrConfig.apiVersion) {
            this.apiVersion = webRtcUrlFactoryOrConfig.apiVersion;
        }

        from(this.getApiVersion()).pipe(switchMap(() => combineLatest([
            this.position$.pipe(filter(({ skip }) => !skip), map(({ value }) => value)),
            this.speed$.pipe(filter(({ skip }) => !skip), map(({ value }) => value)),
            this.stream$.pipe(filter(({ skip }) => !skip), map(({ value }) => value))
        ])),
            distinctUntilChanged((prev, cur) => prev.every((val, i) => val === cur[i])),
            debounceTime(50)
        ).subscribe(() => this.start());

        this.#initRestartInactiveStream();
        this.autoClose();
    }
}

// @ts-ignore Use for debugging
// window.toggleStreams = () =>  Object.values(WebRTCStreamManager.EXISTING_CONNECTIONS).forEach(connection => connection.updateStream(connection.stream$.value ? 0 : 1));
