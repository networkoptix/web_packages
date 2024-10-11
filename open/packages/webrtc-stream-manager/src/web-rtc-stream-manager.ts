// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { Observable, BehaviorSubject, timer, Subject, combineLatest, firstValueFrom, from, NEVER, interval, fromEvent, merge, of, lastValueFrom, defer, throwError } from 'rxjs';
import { filter, shareReplay, switchMap, take, map, delay, takeUntil, tap, distinctUntilChanged, debounceTime, bufferCount, timeout, bufferTime, skipWhile, startWith, retry, mergeMap } from 'rxjs/operators';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { FocusTracker, MosScoreTracker, BytesReceivedTracker } from './trackers';
import { MediaServerPeerConnection } from './media-server-peer-connection';
import { SignalingMessage, PlaybackDetails, ConnectionError, SdpInit, IceInit, ErrorMsg, StreamQuality, IntRange, MimeInit, AvailableStreams, ApiVersions, Stream, RequiresTranscoding, isRequiresTranscoding, WebRtcUrlFactoryOrConfig, WebRtcUrlFactory, WebRtcUrlConfig, TargetStream, DataChannelMessage, isTimeStampMessage, isStreamChangeMessage, ConnectionType } from './types';
import { BaseTracker } from './trackers/base-tracker';
import { ConnectionQueue, WithSkip, getConnectionKey, createConnectionKey, cleanId, fetchWithRedirectAuthorization, cacheSuccess, streamSupported, frameRateTracker$, throttleByFrameRate, throttleByFrameRateScheduler$ } from './utils';

type StreamsConfig = AvailableStreams | AvailableStreams[];

/**
 * Manages connection negotation using websockets as well as webRTC peer connections to mediaservers.
 *
 * Reuses peer connections when possible and only opens websocket connection for negotiating connections.
 */

export class WebRTCStreamManager {
    static RELAY_URL = '{systemId}.relay.vmsproxy.com'

    /** Time series to average */
    static PERFORMANCE_SAMPLE_SIZE = 5000

    /** For Tracking existing connections */
    static EXISTING_CONNECTIONS: Record<string, WebRTCStreamManager> = {};

    static AUTHENTICATED_HOSTS: Record<string, Promise<Boolean>> = {};

    static logger?: Console;

    /** Configure how often performance tuning as well as connection cleanup happens  */
    static SYNC_INTERVAL = 1000;

    /** Force sync to happen outside the normal sync interval would mostly be used for when playback position is updated */
    static forceSync$ = new BehaviorSubject('');

    static position = 0;

    /** Default Stream for new streams. Dependent on MOS score. */
    static INITIAL_STREAM: AvailableStreams = AvailableStreams.PRIMARY;

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
        /** Calculate initial stream if it hasn't been set */
        WebRTCStreamManager.INITIAL_STREAM = !WebRTCStreamManager.cooldownLock && WebRTCStreamManager.calculateAdequateMosScore() ? AvailableStreams.PRIMARY : AvailableStreams.SECONDARY;
        firstValueFrom(frameRateTracker$).then(({ score }) => {
            if (score < 50) {
                WebRTCStreamManager.INITIAL_STREAM = AvailableStreams.SECONDARY;
            }
        })
        return WebRTCStreamManager.INITIAL_STREAM
    }

    /** Playback details for use in either logging during development or for performance tuning */
    static PLAYBACK_DETAILS$ = WebRTCStreamManager.detailFactory('getMetrics');

    static SUGGESTED_STREAMS$ = WebRTCStreamManager.detailFactory('getSuggestedStreams');

    /** Stream Switching Algorithm Parameters */

    static HIGH_QUALITY_MOS_THRESHOLD: IntRange<0, 6> = 4;

    static LOW_QUALITY_MOS_THRESHOLD: IntRange<0, 6> = 3;

    cooldownLock: ReturnType<typeof setTimeout>;

    static _cooldownLock: ReturnType<typeof setTimeout>;

    static set cooldownLock(value: ReturnType<typeof setTimeout>) {
        WebRTCStreamManager._cooldownLock = value;
        Object.values(WebRTCStreamManager.EXISTING_CONNECTIONS).forEach(connection => {
            connection.updateStream(connection.availableStreams[connection.availableStreams.length - 1] || AvailableStreams.PRIMARY);
        })
    };

    static get cooldownLock() {
        return WebRTCStreamManager._cooldownLock;
    }

    aquireLock = (cooloffSeconds: number, global = false) => {
        this.cooldownLock = setTimeout(() => {
            this.cooldownLock = null;
        }, cooloffSeconds * 1000);

        if (global) {
            WebRTCStreamManager.cooldownLock = setTimeout(() => {
                WebRTCStreamManager.cooldownLock = null;
            }, cooloffSeconds * 1000);
        }
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
            const clientSitePerformanceOptimal = fps > (maxFps < 60 ? 40 : 50);
            const streamsToUpgrade = details.filter(({ stream,  mos }) => clientSitePerformanceOptimal && stream === 1 && mos > WebRTCStreamManager.HIGH_QUALITY_MOS_THRESHOLD);
            const streamsToDowngrade = details.filter(({ stream, mos }) => clientSidePerformanceIssue || stream === 0 && mos < WebRTCStreamManager.LOW_QUALITY_MOS_THRESHOLD).reverse();
            const numStreamsToUpgrade = streamsToUpgrade.length > streamsToDowngrade.length ? streamsToDowngrade.length + 1: streamsToUpgrade.length;
            const numStreamsToDowngrade = streamsToDowngrade.length > streamsToUpgrade.length ? streamsToUpgrade.length + 1: streamsToDowngrade.length;
            const streamsToUpdate = [...streamsToUpgrade.slice(0, numStreamsToUpgrade), ...streamsToDowngrade.slice(0, numStreamsToDowngrade)];

            const coolOff = (cooloffSeconds?: number) => (connection: WebRTCStreamManager) => {
                if (clientSidePerformanceIssue) {
                    clearTimeout(connection.cooldownLock);
                    connection.cooldownLock = null;
                    clearTimeout(WebRTCStreamManager.cooldownLock);
                    WebRTCStreamManager.cooldownLock = null;
                }
                if (connection.cooldownLock || WebRTCStreamManager.cooldownLock) {
                    return false;
                }

                connection.aquireLock(cooloffSeconds, clientSidePerformanceIssue);

                return true;
            }

            const updated = streamsToUpdate.filter(({ connection, mos}) => {
                const upgrade = mos < WebRTCStreamManager.LOW_QUALITY_MOS_THRESHOLD;
                const shouldUpdateStream = (upgrade ? coolOff(30) : coolOff(clientSidePerformanceIssue ? 60 * 3 : 15))(connection);
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

            if (clientSidePerformanceIssue || streamsToDowngrade.length) {
                WebRTCStreamManager.performanceIssueNotifier$.next();
            }
        }),
        throttleByFrameRate(),
    )

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

        const availableStreams = Array.isArray(targetStreams) ? targetStreams : targetStreams ? [AvailableStreams.PRIMARY, AvailableStreams.SECONDARY] : [AvailableStreams.PRIMARY];

        if (!accessToken && 'accessToken' in webRtcUrlFactoryOrConfig) {
            accessToken = webRtcUrlFactoryOrConfig.accessToken;
        }

        const getAccessToken = typeof accessToken === 'function' ? accessToken : () => accessToken as string;

        WebRTCStreamManager.EXISTING_CONNECTIONS[connectionKey] ||= new WebRTCStreamManager(
            webRtcUrlFactoryOrConfig,
            videoElement,
            availableStreams,
            getAccessToken,
            allowTranscoding,
            connectionKey,
        );

        WebRTCStreamManager.EXISTING_CONNECTIONS[connectionKey].registerElement(videoElement);

        return WebRTCStreamManager.EXISTING_CONNECTIONS[connectionKey].mediaStream$.pipe(
            filter(res => !!res),
            takeUntil(WebRTCStreamManager.EXISTING_CONNECTIONS[connectionKey].closeNotifier$),
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
        return Promise.allSettled(Object.values(WebRTCStreamManager.EXISTING_CONNECTIONS).map(connection => connection.close())).then(() => true);
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
    private videoElements: HTMLVideoElement[] = [];

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
        this.updateSpeed(this.speed$.value.value);
    };

    /** Subject ot trigger closing open websocket observables */
    private closeWsConnectionNotifier$ = new Subject<string>();

    private closeWsConnection = (): void => {
        this.closeWsConnectionNotifier$.next('close');
        this.wsConnection = null;
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
    public close = (retryAfterSeconds: false | number = false, checkCodec = false): Promise<true> => {
        if (checkCodec) {
            this.codecChanged++;
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

        if (this.videoRef) {
            this.videoRef.src = null;
            this.videoRef.srcObject = null;
        }
        this.videoRef?.remove();
        this.videoRef = null;

        if (retryAfterSeconds) {
            setTimeout(this.start, retryAfterSeconds * 1000)
        } else {
            this.closeNotifier$.next('close');
            delete WebRTCStreamManager.EXISTING_CONNECTIONS[getConnectionKey(this.webRtcUrlFactory())];
            return new Promise((resolve) => setTimeout(resolve, 100)).then(() => true);
        }
    };

    private cleanupBuffers = (clearStream = true) => {
        const mediaStream = this.mediaStream$.value?.[0];
        this.video = null;
        if (mediaStream && clearStream) {
            mediaStream.getTracks().forEach(track => {
                track.stop();
                mediaStream.removeTrack(track);
            });
            this.mediaStream$.next([null, null, this]);
        }
        if (this.mediaSource) {
            for (const buffer of this.mediaSource.sourceBuffers) {
                try {
                    this.mediaSource.removeSourceBuffer(buffer);
                    buffer.abort();
                    buffer.remove(0, buffer.buffered.end(0));

                    if (this.sourceBuffer === buffer) {
                        this.sourceBuffer = null;
                    }
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

    private initialStreamSent = false;

    /**
     * Updates the stream used for connection.
     *
     * @param stream - 0 | 1
     */
    public async updateStream(stream?: AvailableStreams): Promise<void> {
        if (!stream === undefined) {
            stream = (await firstValueFrom(frameRateTracker$)).score < 50 ? AvailableStreams.SECONDARY : WebRTCStreamManager.getInitialStream();
        }

        const useDataChannelUpdate = this.apiVersion === ApiVersions.v2 && !!this.peerConnection?.remoteDataChannel || this.initialStreamSent;
        if (!this.availableStreams.includes(stream)) {
            stream = this.availableStreams[0];
        }

        if (useDataChannelUpdate) {
            this.peerConnection?.remoteDataChannel?.send(JSON.stringify({ stream }));
        }
        this.stream$.next(new WithSkip(stream ? AvailableStreams.SECONDARY : AvailableStreams.PRIMARY, useDataChannelUpdate));
    }

    /**
     * Updates the stream used for connection.
     *
     * @param stream - 0 | 1
     */
    public updateAvailableStreams(streams: AvailableStreams[]): void {
        this.availableStreams = streams?.length ? streams: [AvailableStreams.PRIMARY];

        const targetStream = streams.length > 1 ? WebRTCStreamManager.getInitialStream() : streams[0];

        clearTimeout(this.cooldownLock);
        this.cooldownLock = null;
        this.updateStream(targetStream)
    }

    private mediaSource: MediaSource = null;
    private sourceBuffer: SourceBuffer = null;

    private appendBuffer = (buffer: BufferSource) => {
        if (!this.sourceBuffer) {
            this.initializeMse();
            return;
        }

        if (this.sourceBuffer.updating) {
            this.cleanupBuffers(false);
            this.initializeMse();
            return;
        }

        try {
            this.sourceBuffer.appendBuffer(buffer);
        } catch(e) {
            this.close(0.1);
        }
    }

    private videoRef: HTMLVideoElement & { captureStream: () => MediaStream }

    private frameTimes$ = new Subject<number>();

    private registerFrameNotifier = (video: HTMLVideoElement) => {
        const handleFrameNotification = (time: number) => {
            this.frameTimes$.next(time);
            video.requestVideoFrameCallback(handleFrameNotification);
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
            takeUntil(this.closeWsConnectionNotifier$)
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

    private mimeType: string;

    private initializeMse = async (mimeType?: string): Promise<void> => {
        if (mimeType) {
            this.mimeType = mimeType;
        } else {
            mimeType = this.mimeType;
        }
        if (!MediaSource || !MediaSource.isTypeSupported(mimeType)) {
            this.mediaStream$.next([null, ConnectionError.transcodingDisabled, this]);
            return;
        }

        if (!this.mediaSource) {
            this.mediaSource = new MediaSource();

            this.video.src = URL.createObjectURL(this.mediaSource)

            const newStream = this.video.captureStream();
            this.mediaStream$.next([newStream, null, this]);
            const webRtcStreamManager = this;
            let bufferStartTime = 0;
            let lowBufferCounter = 0;
            this.mediaSource.onsourceopen = function () {
                const mediaSource = this;
                WebRTCStreamManager.logger?.log(`ms is opened: ${mimeType}`);
                if (!webRtcStreamManager.sourceBuffer) {
                    webRtcStreamManager.sourceBuffer = this.addSourceBuffer(mimeType);
                    webRtcStreamManager.sourceBuffer.mode = 'sequence';
                    webRtcStreamManager.sourceBuffer.onupdateend = function() {
                        try {
                            if (!this.buffered?.length || this.updating) {
                                return;
                            }
                        } catch(e) {
                            if (mediaSource.readyState === 'open') {
                                mediaSource.setLiveSeekableRange(0, 0);
                            }
                            return;
                        }

                        const bufferStart = bufferStartTime;
                        const bufferedEnd = this.buffered.end(0);
                        const currentTime = webRtcStreamManager.video.currentTime;
                        bufferStartTime = bufferedEnd;

                        if (bufferedEnd > 10) {
                            try {
                                const currentStart = this.buffered.start(0);
                                const updatedStart = bufferStart - 5;
                                if (updatedStart > currentStart + 5) {
                                    WebRTCStreamManager.logger?.info('frame check: removing buffer', { currentStart, updatedStart });
                                    this.remove(0, updatedStart);
                                }
                            } catch {
                                WebRTCStreamManager.logger?.info('frame check: failed to remove buffer');
                            }
                        }

                        const getCurrentSyncState = () => ({ bufferStart, currentTime, bufferedEnd, playbackRate: webRtcStreamManager.video.playbackRate });

                        const isBehind = bufferStart - currentTime > 0.5;
                        const isAhead = currentTime - bufferStart > 0.25;
                        const remainingBuffer = bufferedEnd - currentTime;
                        const lowBuffer = remainingBuffer < 1;

                        const updatePlaybackRate = (rate: number) => {
                            const lowBuffer = rate < 0.75;
                            if (rate !== webRtcStreamManager.video.playbackRate) {
                                webRtcStreamManager.video.playbackRate = rate;
                                webRtcStreamManager.playbackRateUpdateCallback(rate);

                            }

                            if (lowBuffer) {
                                lowBufferCounter++;
                                const fiveSecondsBuffer = 5 * rate;
                                const thirtySecondsBuffer = 30 * rate;
                                if (lowBufferCounter > fiveSecondsBuffer) {
                                    if (webRtcStreamManager.availableStreams.includes(AvailableStreams.SECONDARY)) {
                                        webRtcStreamManager.updateStream(AvailableStreams.SECONDARY);
                                    } else if (lowBufferCounter > thirtySecondsBuffer) {
                                        webRtcStreamManager.close(1);
                                    }
                                }
                            } else {
                                lowBufferCounter = 0;
                            }
                        }

                        if (isAhead) {
                            updatePlaybackRate(0.75);
                            WebRTCStreamManager.logger?.info('frame check: Time is ahead, slowing playback', getCurrentSyncState());
                            return;
                        }

                        if (lowBuffer) {
                            updatePlaybackRate(Math.round(Math.max(remainingBuffer, 0.2) * 10) / 10);
                            WebRTCStreamManager.logger?.info('frame check: buffer low adjusting playback speed', getCurrentSyncState());
                            return;
                        }

                        if(isBehind) {
                            updatePlaybackRate(1.25);
                            WebRTCStreamManager.logger?.info('frame check: Time is behind speeding up playback', getCurrentSyncState());
                            return;
                        }

                        updatePlaybackRate(1);
                        WebRTCStreamManager.logger?.info('frame check: Time is in sync', getCurrentSyncState());

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
            this.mediaStream$.next([null, ConnectionError.transcodingDisabled, this]);
            this.close(false);
        }
        if ('mime' in signal) {
            this.initializeMse(signal.mime);
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
            () => fallback).then(({ version }) => parseFloat(version)
        );

        this.apiVersion = isNaN(version) || version < 6 ? ApiVersions.v1 : ApiVersions.v2;
        WebRTCStreamManager.cachedApiVersion[systemId] = this.apiVersion;

        return this.apiVersion
    }

    private useProxy = false;
    private serverId: string;

    private codecChanged = 0;

    get cameraId() {
        return this.connectionKey.split('_').pop();
    }

    usingMse = false;

    start = async (lostConnection = false): Promise<unknown> => this.startHandler(lostConnection).catch(() => this.close(0.1));

    /** Initialization helpers */
    /**
     * Initializes websocket connection for negotating peer connection.
     */
    startHandler = async (lostConnection = false): Promise<unknown> => {
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
            this.aquireLock(30);
            this.mediaStream$.next([null, ConnectionError.lostConnection, this]);
            return this.close(3, this.apiVersion === ApiVersions.v1);
        }

        const position = this.position$.value.value;
        const speed = !position ? Infinity : this.speed$.value.value || 1;
        const stream = this.currentStream();
        let webRtcUrl = this.webRtcUrlFactory({ position, speed: speed === Infinity ? 'unlimited' : speed });

        if (!webRtcUrl.endsWith('&')) {
            webRtcUrl += '&';
        }

        webRtcUrl += `stream=${stream}&`;
        const systemId = new URL(webRtcUrl).host.split('.').shift();

        WebRTCStreamManager.logger?.info('Starting stream')
        // WebRTCStreamManager.logger?.table({ webRtcUrl, stream, position })
        const webRtcUrlObject = new URL(webRtcUrl);
        const relayHost = webRtcUrlObject.host;
        this.serverId = webRtcUrlObject.searchParams.get('x-server-guid');

        const fallback = ({ parameters: { mediaStreams: { streams: [] as Stream[] } }, serverId: this.serverId, id: this.cameraId }) as const;
        const deviceParams = '?_keepDefault=true&_with=parameters.mediaStreams.streams.codec,parameters.mediaStreams.streams.encoderIndex,serverId,id'
        const allStreamsInfoEndpoint = `https://${relayHost}/rest/v2/devices${deviceParams}`
        const streamInfoEndpoint =
            `https://${relayHost}/rest/v2/devices/${this.cameraId}${deviceParams}`;

        const fetchAllStreams = cacheSuccess(() => fetchWithRedirectAuthorization(
            allStreamsInfoEndpoint,
            { headers: { authorization: `Bearer ${this.accessToken()}` }}
            ), `${systemId}-streams`).then(response => response.json() as Promise<typeof fallback[]>).catch(() => [] as typeof fallback[]);

        const fetchCurrentStream = () => cacheSuccess(() => fetchWithRedirectAuthorization(
            streamInfoEndpoint,
            { headers: { authorization: `Bearer ${this.accessToken()}` }}
            ), `${this.connectionKey}-streams-${this.codecChanged}`).then(response => response.json() as Promise<typeof fallback>).catch(() => fallback)

        const fetchStreams = fetchAllStreams.then(devices => {
            const device = devices.find(({ id }) => cleanId(id) === this.cameraId);

            if (!this.codecChanged && device) {
                return device;
            }

            return fetchCurrentStream();
        });

        if (!this.serverId && !this.useProxy) {
            this.serverId = cleanId((await fetchStreams).serverId);
        }

        const directConnect = !this.useProxy && !!this.serverId;

        if (directConnect) {
            const existing = new URL(webRtcUrl).searchParams.get('x-server-guid');

            if (existing) {
                webRtcUrl = webRtcUrl.replace(`x-server-guid=${existing}&`, '');
                webRtcUrl += `x-server-guid=${this.serverId}&`
            }
        }


        const resolvedHost = await fetch(`https://${relayHost}/api/ping?${directConnect && this.serverId ? `x-server-guid=${this.serverId}` : ''}`).then(response => new URL(response.url).host).catch(() => false as const)

        const invalidAccessToken = () => {
            this.mediaStream$.next([null, ConnectionError.invalidAccessToken, this]);
            return this.close(2)
        }

        let oneTimeToken = '';

        const getOneTimeToken = (): Promise<string> => {
            let oneTimeTokenEndpoint = `https://${resolvedHost}/rest/v3/login/tickets`;

            if (directConnect) {
                oneTimeTokenEndpoint += `?x-server-guid=${this.serverId}&`
            }

            return fetchWithRedirectAuthorization(oneTimeTokenEndpoint, { headers: { authorization: `Bearer ${this.accessToken()}` }, method: 'POST'}).then(response => response.json()).then(res => {
                return res.token;
            }).catch(() => '');
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
                const alternateStream = this.availableStreams.filter(stream => stream !== targetStream.encoderIndex)[0]
                if (typeof alternateStream === 'number' ) {
                const alternateTarget = streams.find(({ encoderIndex }) => encoderIndex === alternateStream);
                if (alternateTarget && !requiresTranscoding.includes(alternateTarget.codec)) {
                    this.updateAvailableStreams([alternateStream])
                    return this.close(.1);
                }
                }
                this.mediaStream$.next([null, targetStream.codec === RequiresTranscoding.MJPEG ? ConnectionError.mjpegDisabled : ConnectionError.transcodingDisabled, this]);
                return this.close(5);
        }

        this.closeWsConnection();

        let retries = 10;

        ConnectionQueue.runTask(async (completeCallback, requeueCallback) => {
            const url = webRtcUrl.endsWith('&') ? webRtcUrl.slice(0, -1) : webRtcUrl;
            this.wsConnection = webSocket(this.apiVersion === ApiVersions.v1 ? url : `${url}&_ticket=${await getOneTimeToken()}`);

            const requeue = () => {
                this.closeWsConnection();
                requeueCallback();
            }

            const complete = () => {
                this.closeWsConnection();
                completeCallback();
            };

            await firstValueFrom(throttleByFrameRateScheduler$);

            this.wsConnection.pipe(
                timeout({ first: 5_000, with: () => throwError(() => new Error('timeout')) }),
                takeUntil(this.closeWsConnectionNotifier$)
            ).subscribe({
                next: this.gotMessageFromServer,
                error: async (err: Error) => {
                    WebRTCStreamManager.logger?.error(err);
                    await new Promise(resolve => setTimeout(resolve, 500));
                    if (--retries) {
                        await new Promise(resolve => setTimeout(resolve, 3_500));
                        requeue();
                        return;
                    }
                    this.mediaStream$.next([null, ConnectionError.lostConnection, this]);
                    this.close(10);
                    complete();
                    // invalidAccessToken()
                },
                complete,
            });
        }, new URL(webRtcUrl).host, 500, 10_000, WebRTCStreamManager.logger)

        await firstValueFrom(this.mediaStream$.pipe(
            filter((stream) => !!stream),
            takeUntil(this.closeNotifier$),
            // tap(() => this.handleFrozenStream()),
            timeout({ first: 2500, with: () => Promise.resolve() })
        ))
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

    #initRestartInactiveStream = (): void => {
        timer(0, 100).pipe(
            filter(() => !this.usingMse && !!this.mediaStream$.observed && this.mediaStream$.value?.[0] && !this.mediaStream$.value[0].active),
            takeUntil(this.closeNotifier$)
        ).subscribe(() => this.close(0.1));
    };

    get isLive() {
        return !this.position$.value.value;
    }

    handleDataChannelMessage = (message: string): void => {
        try {
            const data = JSON.parse(message) as DataChannelMessage;
            WebRTCStreamManager.logger?.info('Data channel message', data);

            if(isTimeStampMessage(data)) {
                if (this.isLive) {
                    WebRTCStreamManager.logger?.info('skip updating position from timestamp since live', data.timestamp)
                } else {
                    WebRTCStreamManager.logger?.info('updating position from timestamp', data.timestamp)
                    this.position$.next(new WithSkip(data.timestamp, true));
                }

                this.currentPositionTracker$.next(data.timestamp)
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
    }

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
            () => ({
                stream: this.currentStream(),
                position: this.position$.value.value,
                speed: this.speed$.value.value
            }),
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
                'remoteCandidateType',
                'localCandidateType'] as const
            ).some(key => connectionType[key] !== this.connectionType[key])
        ) {
            connectionType.usingRelay = [connectionType.remoteCandidateType, connectionType.localCandidateType].includes('relay');
            this.connectionType = connectionType as ConnectionType;
        }
    };

    private generateWebRtcUrl = (config: WebRtcUrlConfig): WebRtcUrlFactory => {
        const systemId = cleanId(config.systemId);
        const cameraId = cleanId(config.cameraId);
        const serverId = cleanId(config.serverId);

        const host = WebRTCStreamManager.RELAY_URL.replace('{systemId}', systemId);
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

        return (params) => `wss://${host}${endpoint}${serverId ? `x-server-guid=${serverId}&` : ''}${positionParam(params?.position)}${speedParam(params?.speed)}`
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
        public videoElement?: HTMLVideoElement,
        private availableStreams: AvailableStreams[] = [AvailableStreams.PRIMARY, AvailableStreams.SECONDARY],
        private accessToken = () => '',
        public allowTranscoding = false,
        public connectionKey = '',
    ) {
        this.updateStream(WebRTCStreamManager.getInitialStream());

        if (typeof webRtcUrlFactoryOrConfig !== 'function') {
            if ('position' in webRtcUrlFactoryOrConfig) {
                this.updatePosition(webRtcUrlFactoryOrConfig.position);
            }

            if ('speed' in webRtcUrlFactoryOrConfig) {
                this.updateSpeed(typeof webRtcUrlFactoryOrConfig.speed === 'number' ? webRtcUrlFactoryOrConfig.speed : Infinity);
            }
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
        ).subscribe(() => this.start().catch(() => this.start()));
        this.#initPeerConnectionCleanup();
        this.#initRestartInactiveStream();
    }
}

// @ts-ignore Use for debugging
// window.toggleStreams = () =>  Object.values(WebRTCStreamManager.EXISTING_CONNECTIONS).forEach(connection => connection.updateStream(connection.stream$.value ? 0 : 1));
