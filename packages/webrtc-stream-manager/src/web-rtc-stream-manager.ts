// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { Observable, BehaviorSubject, timer, Subject, combineLatest, firstValueFrom, from, NEVER, interval, fromEvent, merge, of, defer, throwError, Observer, Subscription } from 'rxjs';
import { filter, shareReplay, switchMap, take, map, delay, takeUntil, tap, distinctUntilChanged, debounceTime, bufferCount, timeout, bufferTime, skipWhile, startWith, scan, throttleTime } from 'rxjs/operators';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { FocusTracker, MosScoreTracker, BytesReceivedTracker } from './trackers';
import { MediaServerPeerConnection } from './media-server-peer-connection';
import { SignalingMessage, PlaybackDetails, ConnectionError, SdpInit, IceInit, ErrorMsg, StreamQuality, IntRange, MimeInit, AvailableStreams, ApiVersions, Stream, RequiresTranscoding, isRequiresTranscoding, WebRtcUrlFactoryOrConfig, WebRtcUrlFactory, WebRtcUrlConfig, WebRtcUrlConfigUnknown, TargetStream, DataChannelMessage, isTimeStampMessage, isStreamChangeMessage, ConnectionType, isConfirmationMessage } from './types';
import { BaseTracker } from './trackers/base-tracker';
import { ConnectionQueue, WithSkip, getConnectionKey, createConnectionKey, cleanId, fetchWithRedirectAuthorization, cacheSuccess, streamSupported, frameRateTracker$, throttleByFrameRate, targetPlaybackRateStrategies, generateRandomString, acquireLock, releaseLock, LRUConnectionCache, TTLCache } from './utils';

type StreamsConfig = AvailableStreams | AvailableStreams[];

const bufferUpdatingError = new Error('Buffer updating');

/**
 * Connection lifecycle states for tracking retry and cleanup
 */
enum ConnectionState {
    IDLE = 'idle',           // Initial state, not started
    CONNECTING = 'connecting', // Connection attempt in progress
    CONNECTED = 'connected',   // Successfully connected
    RETRYING = 'retrying',     // Failed, retry scheduled
    FAILED = 'failed'          // Permanently failed, should be removed
}

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
    static USE_RELAY_PREFIX = true;
    /**
     * Whether to use unreliable data channel.
     */
    static USE_UNRELIABLE_DATA_CHANNEL = true;

    /**
     * WeakSet tracking all video elements created by WebRTCStreamManager instances
     * Used for comprehensive cleanup to prevent memory leaks from orphaned elements
     * WeakSet allows automatic cleanup when elements are GC'd
     */
    private static createdVideoElements = new WeakSet<HTMLVideoElement>();

    /**
     * Static interval ID for auth cache cleanup
     * Stored to ensure proper cleanup and prevent memory leaks
     */
    static authCacheCleanupInterval?: ReturnType<typeof setInterval>;

    /**
     * Static subscriptions for cleanup tracking
     * Prevents memory leaks from static observables
     */
    private static statsSubscription?: Subscription;
    private static suggestedStreamsSubscription?: Subscription;

    /**
     * Maximum consecutive retry failures before permanent cleanup
     * Prevents orphaned connections from accumulating in EXISTING_CONNECTIONS
     */
    static readonly MAX_RETRY_FAILURES = 10;

    static PLAYBACK_RATE_STRATEGY = targetPlaybackRateStrategies.default;

    /**
     * H265/HEVC codec identifier (used in Stream.codec field)
     * This is the codec ID returned by mediaserver for H265/HEVC encoded streams.
     */
    static readonly H265_CODEC = 173;

    /**
     * Whether the browser supports H265/HEVC via WebRTC SRTP delivery.
     * Chrome 107+ added H265 WebRTC support, but it requires hardware decode support
     * which varies by platform. Note: this does NOT guarantee the mediaserver can send
     * H265 over SRTP without transcoding — that is version-dependent.
     *
     * @see https://chromestatus.com/feature/5186511939567616
     */
    static readonly h265WebRtcSupported: boolean = (() => {
        // Check if RTCRtpReceiver is available (WebRTC API)
        if (typeof RTCRtpReceiver === 'undefined' || !RTCRtpReceiver.getCapabilities) {
            return false;
        }
        const capabilities = RTCRtpReceiver.getCapabilities('video');
        if (!capabilities?.codecs) {
            return false;
        }
        // Check for H265/HEVC codec support
        return capabilities.codecs.some(codec =>
            codec.mimeType.toLowerCase().includes('h265') ||
            codec.mimeType.toLowerCase().includes('hevc')
        );
    })();

    /**
     * Check whether the browser supports a given codec via MSE (MediaSource Extensions).
     * When the server delivers streams via DataChannel + MSE, the browser's MediaSource
     * stack must be able to decode the codec. This is independent of WebRTC SRTP support.
     */
    static isMseCodecSupported(mimeType: string): boolean {
        if (typeof MediaSource === 'undefined' || !MediaSource.isTypeSupported) {
            return false;
        }
        return MediaSource.isTypeSupported(mimeType);
    }

    /**
     * Whether the browser supports H265/HEVC via MSE delivery.
     * Checks both hvc1 and hev1 codec strings since different encoders use different identifiers.
     */
    static readonly h265MseSupported: boolean =
        WebRTCStreamManager.isMseCodecSupported('video/mp4; codecs="hvc1.1.6.L93.B0"') ||
        WebRTCStreamManager.isMseCodecSupported('video/mp4; codecs="hev1.1.6.L93.B0"');

    /**
     * Combined H265 support flag: true if the browser can play H265 via either
     * WebRTC SRTP or MSE delivery. When false, H265 streams cannot be played
     * without server-side transcoding.
     */
    static readonly h265Supported: boolean = WebRTCStreamManager.h265WebRtcSupported || WebRTCStreamManager.h265MseSupported;

    /**
     * LRU Cache for tracking existing connections
     * Max 100 connections, evicts least recently used when full
     * Prevents unbounded memory growth (2.4 GB/week issue)
     */
    private static _connectionCache = new LRUConnectionCache<WebRTCStreamManager>(100);

    /**
     * TTL Cache for authenticated hosts
     * 1 hour TTL, automatic expiration
     * Prevents unbounded memory growth
     */
    private static _authCache = new TTLCache<Promise<Boolean>>(60 * 60 * 1000); // 1 hour TTL

    /**
     * Backwards compatibility getter for EXISTING_CONNECTIONS
     * @deprecated Use _connectionCache directly for better performance
     */
    static get EXISTING_CONNECTIONS(): Record<string, WebRTCStreamManager> {
        return this._connectionCache.toRecord();
    }

    /**
     * Backwards compatibility setter for EXISTING_CONNECTIONS
     * @deprecated Use _connectionCache.set() directly
     */
    static set EXISTING_CONNECTIONS(value: Record<string, WebRTCStreamManager>) {
        this._connectionCache.clear();
        Object.entries(value).forEach(([key, conn]) => {
            this._connectionCache.set(key, conn);
        });
    }

    /**
     * Backwards compatibility getter for AUTHENTICATED_HOSTS
     * @deprecated Use _authCache directly for better performance
     */
    static get AUTHENTICATED_HOSTS(): Record<string, Promise<Boolean>> {
        // Return empty object for backwards compatibility
        // Actual cache is managed by _authCache
        return {};
    }

    /**
     * Backwards compatibility setter for AUTHENTICATED_HOSTS
     * @deprecated Use _authCache.set() directly
     */
    static set AUTHENTICATED_HOSTS(value: Record<string, Promise<Boolean>>) {
        this._authCache.clear();
        Object.entries(value).forEach(([key, promise]) => {
            this._authCache.set(key, promise);
        });
    }

    static logger?: Console;

    /** Configure how often performance tuning as well as connection cleanup happens  */
    static SYNC_INTERVAL = 1000;

    /** Force sync to happen outside the normal sync interval would mostly be used for when playback position is updated */
    static forceSync$ = new BehaviorSubject('');

    static position = 0;

    static getCurrentlyHighQuality = () => Object.values(WebRTCStreamManager.EXISTING_CONNECTIONS).filter(connection => connection.stream$.value.value === 0);
    static lowerAllStreams = () => this.getCurrentlyHighQuality().reduce((promise, connection) => promise.then(() => new Promise(resolve => setTimeout(resolve, 500))).then(() => connection.updateStream(1)), Promise.resolve());

    private static _INITIAL_STREAM = AvailableStreams.SECONDARY;

    /**
     * Static flag to track global pause state across all connections
     */
    private static _globalPauseState = false;

    /**
     * Check if globally paused
     */
    static get isGloballyPaused(): boolean {
        return this._globalPauseState;
    }

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
        shareReplay({ refCount: true, bufferSize: 1 })
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
        shareReplay({ bufferSize: 1, refCount: true }),
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
                    const connection = WebRTCStreamManager._connectionCache.get(indentifier);
                    if (connection && noBytes && noFps) {
                        connection.noFrames++;
                        // If no frames are received for 6 seconds for high quality stream or 15 seconds for low quality stream
                        // then we close the connection and reconnect.
                        const threshold = connection.stream$.value ? 5 : 2;
                        if(connection.noFrames > threshold && connection?.peerConnection?.connectionState === 'connected') {
                            connection.noFrames = 0;
                            WebRTCStreamManager.logger?.info(`No bytes received for ${indentifier}. Reconnecting`);
                            connection.close(1);
                        }
                    } else if (connection) {
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
        accessToken?: string | (() => string | Promise<string>),
        allowTranscoding?: boolean,
    ): Observable<[MediaStream, ConnectionError, WebRTCStreamManager]>
    static connect(
        webRtcUrlFactoryOrConfig: WebRtcUrlFactoryOrConfig,
        videoElement?: HTMLVideoElement,
        targetStreams: StreamsConfig = null,
        accessToken: string | (() => string | Promise<string>) = null,
        allowTranscoding: boolean = false,
    ): Observable<[MediaStream, ConnectionError, WebRTCStreamManager]> {
        const connectionKey = WebRTCStreamManager.createConnectionKey(webRtcUrlFactoryOrConfig);

        // RTSP FIX: Prefer availableStreams from config (from camera mediaStreams data) over deriving from targetStream
        // This avoids redundant API calls to re-detect stream availability
        if (!targetStreams && 'availableStreams' in webRtcUrlFactoryOrConfig && webRtcUrlFactoryOrConfig.availableStreams?.length) {
            targetStreams = webRtcUrlFactoryOrConfig.availableStreams;
            WebRTCStreamManager.logger?.info('Using availableStreams from config:', targetStreams);
        } else if (!targetStreams && 'targetStream' in webRtcUrlFactoryOrConfig) {
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

        // Use LRU cache for connection reuse
        let instance = WebRTCStreamManager._connectionCache.get(connectionKey);
        if (!instance) {
            instance = new WebRTCStreamManager(
                webRtcUrlFactoryOrConfig,
                availableStreams,
                getAccessToken,
                allowTranscoding,
                connectionKey,
            );
            WebRTCStreamManager._connectionCache.set(connectionKey, instance);
        } else {
            // Update accessToken for cached instances to prevent stale tokens
            instance.accessToken = getAccessToken;
        }

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
        return WebRTCStreamManager._connectionCache.get(createConnectionKey(cameraId)) || null;
    }

    static closeAll(): Promise<true> {
        // Unsubscribe from static subscriptions to prevent memory leaks
        if (this.statsSubscription) {
            this.statsSubscription.unsubscribe();
            this.statsSubscription = undefined;
        }
        if (this.suggestedStreamsSubscription) {
            this.suggestedStreamsSubscription.unsubscribe();
            this.suggestedStreamsSubscription = undefined;
        }

        // Clean up static interval to prevent memory leaks
        if (WebRTCStreamManager.authCacheCleanupInterval) {
            clearInterval(WebRTCStreamManager.authCacheCleanupInterval);
            WebRTCStreamManager.authCacheCleanupInterval = undefined;
        }

        // Clean up PRIORITIZED subscription to prevent memory leaks
        if (WebRTCStreamManager.PRIORITIZED && !WebRTCStreamManager.PRIORITIZED.closed) {
            WebRTCStreamManager.PRIORITIZED.unsubscribe();
        }

        return WebRTCStreamManager._connectionCache.values().reduce(
            async (promise, connection) => {
                await promise;
                await new Promise(resolve => setTimeout(resolve, 50));
                await connection.close();
                return true as const;
            },
            Promise.resolve(true as const)
        ).then((result) => {
            // Clean up any orphaned video elements tracked by WebRTCStreamManager
            let cleanedCount = 0;
            document.querySelectorAll('video').forEach((videoElement: HTMLVideoElement) => {
                if (WebRTCStreamManager.createdVideoElements.has(videoElement) && videoElement.srcObject) {
                    this.logger?.warn('Removing tracked orphaned video element from closeAll()');
                    videoElement.srcObject = null;
                    videoElement.load();
                    videoElement.remove();
                    cleanedCount++;
                }
            });

            if (cleanedCount > 0) {
                this.logger?.info(`Cleaned up ${cleanedCount} tracked orphaned video element(s)`);
            }

            return result;
        });
    }

    /**
     * Cleanup expired authentication cache entries
     * @returns Number of expired entries removed
     */
    static cleanupAuthCache(): number {
        return WebRTCStreamManager._authCache.cleanExpired();
    }

    /**
     * Get cache statistics for monitoring memory usage and cache effectiveness
     */
    static getCacheStats() {
        return {
            connections: WebRTCStreamManager._connectionCache.getStats(),
            authentication: WebRTCStreamManager._authCache.getStats(),
        };
    }

    /**
     * Manual cache cleanup - removes all entries
     * Use with caution as this will close all connections
     */
    static clearAllCaches(): void {
        WebRTCStreamManager._connectionCache.clear();
        WebRTCStreamManager._authCache.clear();
    }

    /**
     * Updates the position for stream for all WebRtcStreamManager instances.
     *
     * @param position - position in ms
     */
    static updatePosition(position = 0): void {
        WebRTCStreamManager.position = Math.round(position);
        WebRTCStreamManager._connectionCache.values().forEach(connection => {
            if (connection.getPlayerCount()) {
                connection.updatePosition(position);
            }
        });
    }

    static updateCameraPosition(cameraId: { id: string, systemId: string }, position = 0): Observable<number> {
        const connection = WebRTCStreamManager.getInstance(cameraId);

        if (!connection) {
            return NEVER;
        }

        const currentPosition = connection.currentPosition / 1000;

        if (currentPosition !== position) {
            connection.updatePosition(position);
        }

        return connection.currentPosition$;

    }


        /**
     * Updates the speed for stream for all WebRtcStreamManager instances.
     *
     * @param speed - number or unlimited
     */
    static updateSpeed(speed = 1): void {
        WebRTCStreamManager._connectionCache.values().forEach(connection => {
            if (connection.getPlayerCount()) {
                connection.updateSpeed(speed);
            }
        });
    }

    private position$ = new BehaviorSubject(new WithSkip(0));
    private speed$ = new BehaviorSubject(new WithSkip(0));
    private stream$ = new BehaviorSubject(new WithSkip(AvailableStreams.PRIMARY));

    /**
     * Observable for pause state changes
     */
    private isPaused$ = new BehaviorSubject<boolean>(false);

    /**
     * Get current pause state
     */
    public get isPaused(): boolean {
        return this.isPaused$.value;
    }

    /**
     * Position (in ms) where playback was paused (only used when data channel not available)
     */
    private _pausedAtPosition: number | null = null;

    /**
     * Pending recovery parameters when close() is called during global pause.
     * Stored so recovery can be processed when play() is called.
     */
    private _pendingRecovery?: { retryAfterSeconds: number; checkCodec: boolean };

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
    updatePosition(position: number, clearStream = false): boolean {
        if (clearStream) {
            this.stopCurrentStream();
            this.mediaStream$.next([null, null, this]);
        }
        // Transitions between live (position=0) and archive require a full reconnection
        // because the speed semantics change (live=unlimited, archive=user rate) and
        // DataChannel has no speed command.
        const liveArchiveTransition = (position === 0) !== this.isLive;
        const useDataChannelUpdate = !liveArchiveTransition
            && this.apiVersion === ApiVersions.v2
            && this.peerConnection?.remoteDataChannel?.readyState === 'open'
            && this.initialPositionSent;

        if (useDataChannelUpdate) {
            // Workaround: VMS webrtc_streamer.cpp checks IsDouble() but not IsInt64().
            // Ensure the seek value always has a decimal point so RapidJSON classifies it as Double.
            const seekValue = Number.isInteger(position) ? `${position}.0` : `${position}`;
            this.peerConnection?.remoteDataChannel?.send(`{"seek":${seekValue}}`);
        }

        if (!useDataChannelUpdate) {
            this._positionChanged = true;
        }

        this.initialPositionSent = true;
        this.position$.next(new WithSkip(position, useDataChannelUpdate));
        return !!this.peerConnection?.remoteDataChannel;
    }

    /** Internal */
    private wsConnection: WebSocketSubject<SignalingMessage>;
    private videoElements: {element: HTMLVideoElement, observer: MutationObserver, frameCallbackHandle?: number }[] = [];

    /**
     * Flag to prevent lazy video getter from creating new elements during cleanup.
     * Prevents memory leak from lazy getter creating new element post-cleanup
     */
    private _isClosing = false;

    /**
     * Flag to prevent multiple concurrent connection attempts.
     * Prevents race condition where multiple start() calls create duplicate WebSocket connections
     */
    private _isConnecting = false;
    private _pendingStartPromise: Promise<unknown> | null = null;

    /**
     * Reconnection cooldown to prevent rapid-fire reconnection attempts.
     * Minimum time in ms between reconnection attempts.
     */
    private static readonly RECONNECTION_COOLDOWN_MS = 10_000;
    private _lastReconnectionTime: number | null = null;
    private _positionChanged = false;
    private _needsRestart = false;

    /**
     * Flag to prevent multiple concurrent WebSocket retry attempts.
     * Set when a 1006 closeObserver retry is queued, cleared when connection succeeds or all retries exhausted.
     */
    private _wsRetryPending = false;

    /**
     * MSE buffer trimming configuration.
     * Trims already-played data to prevent unbounded memory growth.
     */
    private static readonly BUFFER_TRIM_INTERVAL_MS = 30_000; // Trim every 30 seconds
    private static readonly BUFFER_KEEP_BEHIND_S = 10; // Keep 10 seconds behind currentTime
    private _lastBufferTrimTime: number = 0;
    private _bufferTrimPending: boolean = false;

    /** Instance subscription for parameter updates - needs cleanup to prevent leaks */
    private _parameterSubscription?: Subscription;

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

    /**
     * Toggle playing state with proper data channel commands
     */
    public togglePlaying(play: boolean): void {
        const hasDataChannel = !!this.peerConnection?.remoteDataChannel;

        if (play) {
            // Resume playback
            if (hasDataChannel) {
                this.sendResume();
            } else {
                // Without data channel: seek to paused position if we have one
                if (this._pausedAtPosition !== null) {
                    WebRTCStreamManager.logger?.info(
                        `Resuming ${this.connectionKey} from paused position: ${this._pausedAtPosition}ms (no data channel, using seek)`,
                    );
                    this.updatePosition(this._pausedAtPosition, true);
                    this._pausedAtPosition = null;
                }
                this.isPaused$.next(false);
            }
            this.videoElements.forEach(({ element }) => {
                element.play().catch(() => {});
            });
        } else {
            // Pause playback
            if (hasDataChannel) {
                this.sendPause();
            } else {
                // Without data channel: store current position for resume
                const currentPos = this.currentPosition / 1000; // Convert from microseconds to ms
                this._pausedAtPosition = currentPos > 0 ? currentPos : null;

                WebRTCStreamManager.logger?.info(
                    `Pausing ${this.connectionKey} at position: ${this._pausedAtPosition}ms (no data channel, will seek on resume)`,
                );

                this.isPaused$.next(true);
            }
            this.videoElements.forEach(({ element }) => {
                element.pause();
            });
        }
    }

    /**
     * Send pause command to server via data channel
     */
    public sendPause(): boolean {
        if (!this.peerConnection?.remoteDataChannel) {
            WebRTCStreamManager.logger?.warn(
                `Cannot pause via data channel for ${this.connectionKey}: data channel not available (API ${this.apiVersion})`,
            );
            return false;
        }

        try {
            // Workaround: VMS expects the value to be a string (device ID), not a boolean.
            // {"pause":true} is rejected; {"pause":""} works.
            const message = JSON.stringify({ pause: '' });
            this.peerConnection.remoteDataChannel.send(message);
            this.isPaused$.next(true);
            WebRTCStreamManager.logger?.info(
                `Sent pause command to server for ${this.connectionKey}`,
            );
            return true;
        } catch (error) {
            WebRTCStreamManager.logger?.error(
                `Failed to send pause command for ${this.connectionKey}:`,
                error,
            );
            return false;
        }
    }

    /**
     * Send resume command to server via data channel
     */
    public sendResume(): boolean {
        if (!this.peerConnection?.remoteDataChannel) {
            WebRTCStreamManager.logger?.warn(
                `Cannot resume via data channel for ${this.connectionKey}: data channel not available (API ${this.apiVersion})`,
            );
            return false;
        }

        try {
            const message = JSON.stringify({ resume: '' });
            this.peerConnection.remoteDataChannel.send(message);
            this.isPaused$.next(false);
            WebRTCStreamManager.logger?.info(
                `Sent resume command to server for ${this.connectionKey}`,
            );
            return true;
        } catch (error) {
            WebRTCStreamManager.logger?.error(
                `Failed to send resume command for ${this.connectionKey}:`,
                error,
            );
            return false;
        }
    }

    /**
     * Send nextFrame command to server (only works when paused)
     */
    public sendNextFrame(): boolean {
        if (!this.isPaused$.value) {
            WebRTCStreamManager.logger?.warn(
                `Cannot advance frame for ${this.connectionKey}: stream is not paused`,
            );
            return false;
        }

        if (!this.peerConnection?.remoteDataChannel) {
            WebRTCStreamManager.logger?.warn(
                `Cannot advance frame for ${this.connectionKey}: data channel not available`,
            );
            return false;
        }

        try {
            const message = JSON.stringify({ nextFrame: true });
            this.peerConnection.remoteDataChannel.send(message);
            WebRTCStreamManager.logger?.info(
                `Sent nextFrame command to server for ${this.connectionKey}`,
            );
            return true;
        } catch (error) {
            WebRTCStreamManager.logger?.error(
                `Failed to send nextFrame command for ${this.connectionKey}:`,
                error,
            );
            return false;
        }
    }

    /**
     * Static method to toggle playing across all connections
     */
    static togglePlaying(play?: boolean): void {
        play = typeof play === 'boolean' ? play : !this.getPlaying();
        this._globalPauseState = !play;

        const connections = Object.values(WebRTCStreamManager.EXISTING_CONNECTIONS);
        const action = play ? 'play' : 'pause';

        WebRTCStreamManager.logger?.info(
            `Toggling ${action} for ${connections.length} connection(s)`,
        );

        connections.forEach(connection => {
            try {
                connection.togglePlaying(play as boolean);
            } catch (error) {
                WebRTCStreamManager.logger?.error(
                    `Failed to toggle playing for connection ${connection.connectionKey}:`,
                    error,
                );
            }
        });
    }

    /**
     * Static pause method
     */
    static pause(): void {
        this.togglePlaying(false);
    }

    /**
     * Static play/resume method
     */
    static play(): void {
        this.togglePlaying(true);

        // Process any queued recoveries from connections that disconnected during pause
        this._connectionCache.values().forEach(conn => {
            if (conn._pendingRecovery) {
                const { retryAfterSeconds, checkCodec } = conn._pendingRecovery;
                conn._pendingRecovery = undefined;
                WebRTCStreamManager.logger?.info(
                    `Processing queued recovery for ${conn.connectionKey}`,
                );
                conn.close(retryAfterSeconds, checkCodec);
            }
        });
    }

    /**
     * Advance all paused streams by one frame
     */
    static nextFrame(): void {
        Object.values(WebRTCStreamManager.EXISTING_CONNECTIONS).forEach(
            connection => connection.sendNextFrame(),
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
        const frameCallbackHandle = this.registerFrameNotifier(element);
        this.videoElements.push({ element, observer, frameCallbackHandle });
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
            // Cancel the video frame callback to prevent memory leak
            if (elementAndObserver.frameCallbackHandle !== undefined) {
                videoElement.cancelVideoFrameCallback(elementAndObserver.frameCallbackHandle);
            }
            this.updateTrackerRefs();
        }

        MediaServerPeerConnection.forceGarbageCollection();
    }

    /** Subject ot trigger closing open websocket observables */
    private closeWsConnectionNotifier$ = new Subject<string>();

    /**
     * Tracked timeout handles for cleanup on destroy
     * Prevents timeout leaks from retry logic and error handlers
     */
    private timeoutHandles: ReturnType<typeof setTimeout>[] = [];

    /**
     * Track a setTimeout call for automatic cleanup
     * @param callback Function to execute
     * @param delay Delay in milliseconds
     * @returns Timeout handle
     */
    private trackTimeout(callback: () => void, delay: number): ReturnType<typeof setTimeout> {
        const handle = setTimeout(() => {
            // Remove from tracking array when it fires
            const index = this.timeoutHandles.indexOf(handle);
            if (index !== -1) {
                this.timeoutHandles.splice(index, 1);
            }
            callback();
        }, delay);
        this.timeoutHandles.push(handle);
        return handle;
    }

    /**
     * Clear all tracked timeouts
     * Called during cleanup to prevent leaks
     */
    private clearAllTimeouts(): void {
        this.timeoutHandles.forEach(handle => clearTimeout(handle));
        this.timeoutHandles = [];
    }

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
        // Reset pause state on close
        this.isPaused$.next(false);
        this._pausedAtPosition = null;

        // If we're paused globally and this is an auto-recovery attempt, queue it for later
        if (WebRTCStreamManager._globalPauseState && typeof retryAfterSeconds === 'number') {
            WebRTCStreamManager.logger?.info('Queueing auto-recovery for after resume');
            this._pendingRecovery = { retryAfterSeconds, checkCodec };
            return Promise.resolve(true);
        }

        if (checkCodec) {
            this.codecChanged = generateRandomString();
            this.usingMse = false;
            this.mimeType = '';
        }
        this.stopCurrentStream();
        this.closeWsConnection();

        // Cancel all video frame callbacks to prevent memory leaks
        this.videoElements.forEach(({ element, frameCallbackHandle }) => {
            if (frameCallbackHandle !== undefined) {
                element.cancelVideoFrameCallback(frameCallbackHandle);
            }
        });

        this.cleanupBuffers();

        this.peerConnection?.close();
        this.peerConnection = null;
        this.performanceTrackers.forEach((tracker) => {
            tracker.connection = null;
            tracker.destroy();
        })

        // Clear any existing tracked timeouts before potentially scheduling new ones
        // This prevents accumulation of retry timeouts from multiple close() calls
        this.clearAllTimeouts();

        // Reset connection state so the scheduled retry's start() call is not blocked
        // by the _isConnecting guard. When close() is called from within a signal handler
        // (e.g. gotMessageFromServer during startHandler), _isConnecting is still true
        // and the .finally() hasn't fired yet. Without this reset, the retry would hit
        // "start() called while already connecting" and silently fail.
        this._isConnecting = false;
        this._pendingStartPromise = null;

        if (retryAfterSeconds) {
            // Track retry state and failure
            this.connectionState = ConnectionState.RETRYING;
            this.recordRetryFailure();

            // Check if retry is allowed (circuit breaker integration point)
            if (!this.canAttemptRetry()) {
                WebRTCStreamManager.logger?.error(
                    `Max retry failures (${WebRTCStreamManager.MAX_RETRY_FAILURES}) exceeded for ${this.connectionKey}`,
                    {
                        consecutiveFailures: this.consecutiveRetryFailures,
                        lastRetryAttempt: this.lastRetryAttempt
                    }
                );

                // Transition to permanent failure
                return this.permanentFailureCleanup();
            }

            // Log retry attempt
            WebRTCStreamManager.logger?.info(
                `Retry scheduled in ${retryAfterSeconds}s for ${this.connectionKey}`,
                {
                    attempt: this.consecutiveRetryFailures,
                    maxAttempts: WebRTCStreamManager.MAX_RETRY_FAILURES,
                    state: this.connectionState
                }
            );

            this.trackTimeout(this.start, retryAfterSeconds * 1000)
        } else {
            // Permanent close - clean up everything
            return this.permanentFailureCleanup();
        }
        return new Promise((resolve) => this.trackTimeout(() => resolve(undefined), 100)).then(() => !!retryAfterSeconds);
    };

    /**
     * Performs complete cleanup for permanently failed connections
     * Removes instance from EXISTING_CONNECTIONS and completes all observables
     * Called when max retry threshold is exceeded or explicit permanent close requested
     */
    private permanentFailureCleanup(): Promise<boolean> {
        this.connectionState = ConnectionState.FAILED;

        // Complete all Subjects to prevent memory leaks
        this.closeNotifier$.next('close');
        this.closeNotifier$.complete();
        this.closeWsConnectionNotifier$.complete();

        // Complete all BehaviorSubjects and Subjects
        this.position$.complete();
        this.speed$.complete();
        this.stream$.complete();
        this.currentPositionTracker$.complete();
        this.mediaStream$.complete();
        this.subscribers$.complete();
        this.frameTimes$.complete();
        this.restartHandleFrozenStream$.complete();
        this.bufferedDuration$.complete();
        this.chunkDuration$.complete();
        this.playbackRate$.complete();
        this.confirmation$.complete();

        // Explicitly unsubscribe parameter subscription to prevent memory leaks
        this._parameterSubscription?.unsubscribe();
        this._parameterSubscription = undefined;

        // Clear all tracked timeouts to prevent leaks
        this.clearAllTimeouts();

        // Remove from LRU cache
        WebRTCStreamManager._connectionCache.delete(this.connectionKey);

        WebRTCStreamManager.logger?.info(
            `Connection permanently closed and cleaned up: ${this.connectionKey}`,
            {
                finalState: this.connectionState,
                totalRetries: this.consecutiveRetryFailures
            }
        );

        return Promise.resolve(false);
    }

    /**
     * Checks if connection can attempt retry (circuit breaker integration point)
     * @returns true if retry allowed, false if circuit should be open
     */
    private canAttemptRetry(): boolean {
        // Current implementation: simple threshold check
        if (this.consecutiveRetryFailures >= WebRTCStreamManager.MAX_RETRY_FAILURES) {
            return false;
        }

        // Future: Circuit breaker integration
        // if (this.connectionCircuitBreaker) {
        //     return this.connectionCircuitBreaker.canAttempt();
        // }

        return true;
    }

    /**
     * Records retry failure (circuit breaker integration point)
     */
    private recordRetryFailure(error?: unknown): void {
        this.consecutiveRetryFailures++;
        this.lastRetryAttempt = Date.now();

        // Future: Circuit breaker integration
        // if (this.connectionCircuitBreaker) {
        //     this.connectionCircuitBreaker.recordFailure(error);
        // }
    }

    /**
     * Records successful connection (circuit breaker integration point)
     */
    private recordConnectionSuccess(): void {
        this.consecutiveRetryFailures = 0;
        this.connectionState = ConnectionState.CONNECTED;
        this.lastRetryAttempt = null;

        // Clear timeout failure tracking on successful connection
        this.consecutiveTimeoutFailures.clear();

        // Reset disabled streams on successful connection to allow retry
        this.disabledStreams = [];

        // Future: Circuit breaker integration
        // if (this.connectionCircuitBreaker) {
        //     this.connectionCircuitBreaker.recordSuccess();
        // }
    }

    private cleanupBuffers = (clearStream = true) => {

        if (clearStream) {
            if (this.videoRef) {
                // Cancel the video frame callback to prevent memory leak
                if (this.videoRefFrameCallbackHandle !== undefined) {
                    this.videoRef.cancelVideoFrameCallback(this.videoRefFrameCallbackHandle);
                    this.videoRefFrameCallbackHandle = undefined;
                }
                URL.revokeObjectURL(this.videoRef.src);
                this.videoRef.src = '';
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
                    // Clean up SourceBuffer event handlers to prevent memory leaks
                    if (buffer) {
                        buffer.onupdatestart = null;
                        buffer.onupdateend = null;
                        buffer.onupdate = null;
                        buffer.onerror = null;
                        buffer.onabort = null;
                    }

                    if (this.sourceBuffer === buffer) {
                        this.sourceBuffer = null;
                    }

                    // abort() must come BEFORE removeSourceBuffer() — once
                    // removed, the buffer is detached and abort() throws
                    // InvalidStateError.
                    buffer.abort();
                    this.mediaSource.removeSourceBuffer(buffer);
                } catch(e) {
                    WebRTCStreamManager.logger?.error(e);
                }
            }

            // Clean up MediaSource event handlers to prevent memory leaks
            this.mediaSource.onsourceopen = null;
            this.mediaSource.onsourceended = null;
            this.mediaSource.onsourceclose = null;
        }

        if (this.sourceBuffer) {
            try {
                // Clean up SourceBuffer event handlers if sourceBuffer exists separately
                this.sourceBuffer.onupdatestart = null;
                this.sourceBuffer.onupdateend = null;
                this.sourceBuffer.onupdate = null;
                this.sourceBuffer.onerror = null;
                this.sourceBuffer.onabort = null;

                // Only abort if the MediaSource is still open (abort throws
                // InvalidStateError on a detached or ended MediaSource).
                if (this.mediaSource?.readyState === 'open') {
                    this.sourceBuffer.abort();
                }
            } catch(e) {
                WebRTCStreamManager.logger?.error(e);
            }
        }
        this.mediaSource = null;
        this.sourceBuffer = null;

        // Clear pending buffers to prevent memory leak
        this.buffers = [];
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

        // Skip data channel stream switch for cameras that transitioned from SRTP→MSE
        // (i.e. where the server's initial SRTP attempt triggered transcoding).
        // The server may persist its transcoding state for the session, so switching
        // streams via data channel can deliver a transcoded primary stream (e.g. 853x480).
        // A full reconnection with deliveryMethod=mse ensures a fresh server-side session.
        const mseNeedsFullReconnect = this.usingMse && WebRTCStreamManager.camerasNeedingMse.has(this.connectionKey);
        const useDataChannelUpdate = this.apiVersion === ApiVersions.v2
            && !!(this.peerConnection?.remoteDataChannel?.readyState === 'open')
            && !mseNeedsFullReconnect;
        // When data channel update is used, skip subscription (we handle confirmation below)
        // When not using data channel, let subscription trigger start() for new connection
        this.stream$.next(new WithSkip(stream, useDataChannelUpdate));
        let confirmed = !useDataChannelUpdate;

        if (useDataChannelUpdate) {
            // Improved retry logic: send stream info every 150ms until confirmed or 2s timeout
            const streamInfo = JSON.stringify(this.getCurrentStreamInfo());
            const retryInterval = 150; // ms
            const totalTimeout = 4_000; // ms
            const startTime = Date.now();
            let retryHandle: ReturnType<typeof setInterval> | null = null;

            try {
                // Send initial request
                this.peerConnection?.remoteDataChannel?.send(streamInfo);

                // Set up retry interval
                retryHandle = setInterval(() => {
                    if (this.peerConnection?.remoteDataChannel?.readyState === 'open') {
                        this.peerConnection.remoteDataChannel.send(streamInfo);
                        WebRTCStreamManager.logger?.debug(`[DataChannel] Retrying stream switch request (${Date.now() - startTime}ms elapsed)`);
                    }
                }, retryInterval);

                // Wait for confirmation with 2-second timeout
                confirmed = await this.getConfirmation(totalTimeout);

                if (confirmed) {
                    WebRTCStreamManager.logger?.info(`[DataChannel] Stream switch confirmed via data channel (${Date.now() - startTime}ms)`);
                }
            } finally {
                // Clean up retry interval
                if (retryHandle !== null) {
                    clearInterval(retryHandle);
                }
            }
        }

        if (!confirmed || !(await this.streamChanged())) {
            WebRTCStreamManager.logger?.info('[DataChannel] Stream switch not confirmed or stream did not change, creating new connection');
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

    /**
     * Gets the number of seconds buffered ahead of current playback position
     *
     * @param videoElement - HTML video element to check buffer status
     * @returns Number of seconds buffered ahead of current position
     */
    public getBufferedAheadTime(videoElement: HTMLVideoElement = this.video): number {
        if (!videoElement || !videoElement.buffered || videoElement.buffered.length === 0) {
            return 0;
        }

        const currentTime = videoElement.currentTime;
        const buffered = videoElement.buffered;

        // Find the buffer range containing current playback position
        for (let i = 0; i < buffered.length; i++) {
            if (currentTime >= buffered.start(i) && currentTime <= buffered.end(i)) {
                // Return seconds of video buffered ahead of current position
                return buffered.end(i) - currentTime;
            }
        }

        // If current position isn't in any buffer range, return 0
        return 0;
    }

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
            // Re-queue the buffer on error if the DC is reliable (frames arrive in order
            // and won't be replaced by newer data), so we don't lose video data.
            const dcReliable = !WebRTCStreamManager.USE_UNRELIABLE_DATA_CHANNEL
                || this.peerConnection?.remoteDataChannel?.ordered !== false;
            if (dcReliable) {
                this.buffers.push(nextBuffer);
            }
            if (e !== bufferUpdatingError) {
                this.close(0.1)
            }
        }
    }

    private appendBuffer = (buffer: BufferSource) => {
        // Only drop old frames if the data channel is actually unreliable/unordered.
        // USE_UNRELIABLE_DATA_CHANNEL requests an unreliable DC from the server,
        // but the server may ignore it — check the real DC properties.
        const dcUnreliable = WebRTCStreamManager.USE_UNRELIABLE_DATA_CHANNEL
            && this.peerConnection?.remoteDataChannel?.ordered === false;
        if (dcUnreliable) {
            this.buffers = [buffer]
        } else {
            this.buffers.unshift(buffer);
        }
        if (!this.sourceBuffer) {
            this.initializeMse();
            return;
        }

        this.appendFromBuffers();
    }

    /**
     * Periodically trims old data from MSE SourceBuffer to prevent unbounded memory growth.
     * Only trims when:
     * - Enough time has passed since last trim (BUFFER_TRIM_INTERVAL_MS)
     * - There's played data worth trimming (>= BUFFER_KEEP_BEHIND_S seconds behind currentTime)
     * - SourceBuffer is not busy with another operation
     */
    private maybeTrimbuffer = (): void => {
        if (!this.sourceBuffer || !this.video) {
            return;
        }

        const now = performance.now();

        // Throttle trim operations
        if (now - this._lastBufferTrimTime < WebRTCStreamManager.BUFFER_TRIM_INTERVAL_MS) {
            return;
        }

        // Don't trim if sourceBuffer is updating
        if (this.sourceBuffer.updating) {
            return;
        }

        try {
            const buffered = this.sourceBuffer.buffered;
            if (!buffered || buffered.length === 0) {
                return;
            }

            const currentTime = this.video.currentTime;
            const bufferStart = buffered.start(0);

            // Calculate trim end point: keep BUFFER_KEEP_BEHIND_S seconds before currentTime
            const trimEndPoint = currentTime - WebRTCStreamManager.BUFFER_KEEP_BEHIND_S;

            // Only trim if there's meaningful old data (at least 1 second to trim)
            if (trimEndPoint - bufferStart < 1) {
                return;
            }

            WebRTCStreamManager.logger?.info(
                `MSE buffer trimming: removing ${bufferStart.toFixed(1)}s to ${trimEndPoint.toFixed(1)}s ` +
                `(${(trimEndPoint - bufferStart).toFixed(1)}s of old data, currentTime=${currentTime.toFixed(1)}s)`
            );

            this._bufferTrimPending = true;
            this._lastBufferTrimTime = now;
            this.sourceBuffer.remove(bufferStart, trimEndPoint);
        } catch (e) {
            this._bufferTrimPending = false;
            WebRTCStreamManager.logger?.error('MSE buffer trim failed:', e);
        }
    }

    private videoRef: HTMLVideoElement & { captureStream: () => MediaStream }
    private videoRefFrameCallbackHandle?: number;

    private frameTimes$ = new Subject<number>();

    private registerFrameNotifier = (video: HTMLVideoElement): number => {
        const handleFrameNotification = (time: number) => {
            // Only emit frame times when not paused
            if (!this.isPaused$.value) {
                this.frameTimes$.next(time);
            }
            if (video === this.video || this.videoElements.some(({ element }) => element === video)) {
                const handle = video.requestVideoFrameCallback(handleFrameNotification);
                // Update the stored handle for this video element
                if (video === this.videoRef) {
                    this.videoRefFrameCallbackHandle = handle;
                } else {
                    const elementEntry = this.videoElements.find(({ element }) => element === video);
                    if (elementEntry) {
                        elementEntry.frameCallbackHandle = handle;
                    }
                }
            }
        }
        return video.requestVideoFrameCallback(handleFrameNotification);
    }

    private restartHandleFrozenStream$ = new Subject();

    private handleFrozenStream = () => {
        this.restartHandleFrozenStream$.next(true);

        // Use different monitoring strategy for MSE vs direct streaming
        // MSE uses SourceBuffer events which are more reliable than frame callbacks
        if (this.usingMse) {
            this.handleMseFrozenStream();
            return;
        }

        // Original frame callback monitoring for non-MSE streams
        const startToggle$ = this.mediaStream$.pipe(switchMap(async stream => stream?.[0] && firstValueFrom(this.frameTimes$)))
        const frameAccumulator$ = this.frameTimes$.pipe(
            bufferTime(1000),
            bufferCount(10, 1),
            map(frames => frames.flat()),
            skipWhile(frames => frames.length < 5)
        );
        startToggle$.pipe(
            switchMap(playing => playing ? frameAccumulator$ : NEVER),
            // Don't even log frame checks if intentionally paused
            filter(() => !this.isPaused$.value),
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

    /**
     * MSE-specific frozen stream detection using SourceBuffer update events
     * instead of requestVideoFrameCallback which doesn't work reliably with MSE.
     *
     * This monitors SourceBuffer 'updateend' events to detect when no new data
     * is being appended, indicating a frozen stream. The 10-second timeout matches
     * the frame-based detection for consistency.
     */
    private handleMseFrozenStream = () => {
        if (!this.sourceBuffer) {
            // SourceBuffer not ready yet, will be called again when initialized
            WebRTCStreamManager.logger?.info('MSE frozen detection: SourceBuffer not ready, skipping');
            return;
        }

        WebRTCStreamManager.logger?.info('MSE frozen detection: starting SourceBuffer monitoring');

        // Track last buffer update time
        const bufferUpdates$ = new Subject<number>();

        const updateEndHandler = () => {
            const now = Date.now();
            WebRTCStreamManager.logger?.debug?.('MSE frozen detection: SourceBuffer update at', now);
            bufferUpdates$.next(now);
        };

        // Monitor SourceBuffer updateend events
        this.sourceBuffer.addEventListener('updateend', updateEndHandler);

        // Check for no buffer updates in 10 seconds (matching frame-based timeout)
        const noUpdatesCheck$ = bufferUpdates$.pipe(
            startWith(Date.now()), // Start monitoring immediately
            bufferTime(10000), // 10 second window
            map(updates => updates.length),
            filter(count => {
                if (count === 0) {
                    WebRTCStreamManager.logger?.info('MSE frozen detection: no SourceBuffer updates in 10 seconds');
                    return true;
                }
                return false;
            }),
            // Don't trigger recovery if intentionally paused
            filter(() => !this.isPaused$.value),
            take(1),
            takeUntil(this.restartHandleFrozenStream$),
            takeUntil(this.closeNotifier$)
        );

        noUpdatesCheck$.subscribe(() => {
            WebRTCStreamManager.logger?.info('MSE frozen detection: triggering reconnection');
            this.close(0.1);
        });

        // Cleanup handler
        this.closeNotifier$.pipe(take(1)).subscribe(() => {
            WebRTCStreamManager.logger?.info('MSE frozen detection: cleaning up');
            if (this.sourceBuffer) {
                this.sourceBuffer.removeEventListener('updateend', updateEndHandler);
            }
            bufferUpdates$.complete();
        });
    }

    private get video() {
        if (!this.videoRef) {
            this.videoRef = document.createElement('video') as typeof this.videoRef;
            this.videoRef.onblur = event => event.preventDefault();
            this.videoRef.style.position = 'absolute';
            this.videoRef.style.top = '0px';

            this.videoRef.style.width = '1px';
            this.videoRef.style.height = '1px';
            this.videoRef.style.visibility = 'hidden';
            this.videoRef.muted = true;
            this.videoRef.autoplay = true;
            this.videoRef.volume = 0.0001;
            this.videoRefFrameCallbackHandle = this.registerFrameNotifier(this.videoRef);
            document.body.appendChild(this.videoRef);

            this.startUnmuteHandler();
        }
        return this.videoRef;
    }

    private set video(video: WebRTCStreamManager['videoRef'] | null) {
        if (this.videoRef) {
            // Cancel the video frame callback to prevent memory leak
            if (this.videoRefFrameCallbackHandle !== undefined) {
                this.videoRef.cancelVideoFrameCallback(this.videoRefFrameCallbackHandle);
                this.videoRefFrameCallbackHandle = undefined;
            }
            this.videoRef.src = '';
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

    bufferedDuration$ = new BehaviorSubject(0);
    chunkDuration$ = new BehaviorSubject(0);
    playbackRate$ = new BehaviorSubject(1);

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
                /**
                 * Tracks lag recovery attempts before resorting to reconnection.
                 * 0 = no attempts yet, will try fast-forward
                 * 1 = fast-forward attempted, will try datachannel seek
                 * 2 = both attempted, will reconnect
                 */
                private lagRecoveryAttempts = 0;
                /**
                 * Timestamp when playback was last confirmed to be truly healthy.
                 * Used to require sustained healthy playback before resetting recovery counter.
                 */
                private lastHealthyTimestamp = 0;
                /**
                 * Last recorded video.currentTime for detecting actual playback progress.
                 * If currentTime doesn't advance, video is frozen even if metrics look OK.
                 */
                private lastRecordedCurrentTime = 0;
                /**
                 * Duration in ms that playback must remain healthy before resetting recovery counter.
                 * Prevents premature reset when video is frozen but metrics temporarily look OK.
                 */
                private readonly SUSTAINED_HEALTHY_DURATION_MS = 10000;
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
                /**
                 * Check if playback is truly healthy by verifying:
                 * 1. timeBehind metric is below threshold
                 * 2. video.currentTime is actually advancing (frames rendering)
                 * 3. Has remained healthy for sustained duration
                 *
                 * Only resets lagRecoveryAttempts after sustained healthy playback
                 * to prevent premature reset when video is frozen but metrics look OK.
                 *
                 * @param timeBehind - Current time behind value
                 * @param playbackTime - Current video.currentTime
                 * @returns true if recovery counter was reset
                 */
                private checkIfTrulyHealthy(timeBehind: number, playbackTime: number): boolean {
                    if (this.lagRecoveryAttempts === 0) {
                        // No recovery in progress, nothing to check
                        this.lastRecordedCurrentTime = playbackTime;
                        return false;
                    }

                    const now = performance.now();

                    // Check if video.currentTime is actually advancing (threshold 0.5s to account for timing)
                    const isPlaybackProgressing = playbackTime > this.lastRecordedCurrentTime + 0.5;
                    this.lastRecordedCurrentTime = playbackTime;

                    if (timeBehind < 5 && isPlaybackProgressing) {
                        // Mark as currently healthy
                        if (this.lastHealthyTimestamp === 0) {
                            this.lastHealthyTimestamp = now;
                            WebRTCStreamManager.logger?.info(`Lag recovery: Playback looks healthy, waiting for sustained recovery (${(this.SUSTAINED_HEALTHY_DURATION_MS / 1000).toFixed(0)}s required)`);
                        }

                        // Only reset counter after sustained healthy playback
                        const healthyDuration = now - this.lastHealthyTimestamp;
                        if (healthyDuration >= this.SUSTAINED_HEALTHY_DURATION_MS) {
                            WebRTCStreamManager.logger?.info(`Lag recovery: Playback healthy for ${(healthyDuration / 1000).toFixed(1)}s, resetting recovery counter`);
                            this.lagRecoveryAttempts = 0;
                            this.lastHealthyTimestamp = 0;
                            return true;
                        }
                    } else {
                        // Not healthy - reset timestamp and log detailed diagnostics
                        if (this.lastHealthyTimestamp > 0 || this.lagRecoveryAttempts > 0) {
                            const video = webRtcStreamManager.video;
                            const sourceBuffer = webRtcStreamManager.sourceBuffer;

                            // Capture buffered ranges
                            let bufferedRanges = 'none';
                            try {
                                const ranges: string[] = [];
                                for (let i = 0; i < video.buffered.length; i++) {
                                    ranges.push(`[${video.buffered.start(i).toFixed(2)}-${video.buffered.end(i).toFixed(2)}]`);
                                }
                                bufferedRanges = ranges.length ? ranges.join(', ') : 'empty';
                            } catch (e) {
                                bufferedRanges = 'error reading buffered';
                            }

                            // Capture SourceBuffer state
                            let sbState = 'N/A';
                            try {
                                if (sourceBuffer) {
                                    const sbRanges: string[] = [];
                                    for (let i = 0; i < sourceBuffer.buffered.length; i++) {
                                        sbRanges.push(`[${sourceBuffer.buffered.start(i).toFixed(2)}-${sourceBuffer.buffered.end(i).toFixed(2)}]`);
                                    }
                                    sbState = `updating=${sourceBuffer.updating}, mode=${sourceBuffer.mode}, ranges=${sbRanges.join(', ') || 'empty'}`;
                                }
                            } catch (e) {
                                sbState = 'error reading sourceBuffer';
                            }

                            WebRTCStreamManager.logger?.info(`Lag recovery: Playback not healthy (timeBehind=${timeBehind.toFixed(1)}s, progressing=${isPlaybackProgressing})`);
                            WebRTCStreamManager.logger?.info(`  Video state: currentTime=${playbackTime.toFixed(2)}, paused=${video.paused}, seeking=${video.seeking}, readyState=${video.readyState}, networkState=${video.networkState}, ended=${video.ended}`);
                            WebRTCStreamManager.logger?.info(`  Video buffered: ${bufferedRanges}`);
                            WebRTCStreamManager.logger?.info(`  SourceBuffer: ${sbState}`);
                            WebRTCStreamManager.logger?.info(`  Pending buffers: ${webRtcStreamManager.buffers.length}`);
                        }
                        this.lastHealthyTimestamp = 0;
                    }

                    return false;
                }
                /**
                 * Attempt to fast-forward video element to the latest buffered position.
                 * This is the first recovery step when playback falls behind.
                 */
                private attemptFastForward(): boolean {
                    try {
                        const video = webRtcStreamManager.video;
                        const buffered = video.buffered;

                        // Log detailed state before fast-forward
                        const ranges: string[] = [];
                        for (let i = 0; i < buffered.length; i++) {
                            ranges.push(`[${buffered.start(i).toFixed(2)}-${buffered.end(i).toFixed(2)}]`);
                        }
                        WebRTCStreamManager.logger?.info(`Lag recovery: Pre-FF state - currentTime=${video.currentTime.toFixed(2)}, paused=${video.paused}, readyState=${video.readyState}, buffered=${ranges.join(', ') || 'empty'}`);

                        if (buffered.length > 0) {
                            const currentPos = video.currentTime;
                            const latestPosition = buffered.end(buffered.length - 1);
                            // Only fast-forward if there's meaningful buffer ahead (need at least 3s of runway)
                            if (latestPosition > currentPos + 3) {
                                // Leave 2 seconds of runway to allow keyframe alignment and prevent immediate re-stall
                                const targetPosition = latestPosition - 2;

                                // Add one-time listener to capture state after seek completes
                                const seekedHandler = () => {
                                    video.removeEventListener('seeked', seekedHandler);
                                    // Short delay to let browser settle
                                    setTimeout(() => {
                                        const newRanges: string[] = [];
                                        try {
                                            for (let i = 0; i < video.buffered.length; i++) {
                                                newRanges.push(`[${video.buffered.start(i).toFixed(2)}-${video.buffered.end(i).toFixed(2)}]`);
                                            }
                                        } catch (e) { /* ignore */ }
                                        WebRTCStreamManager.logger?.info(`Lag recovery: Post-FF state - currentTime=${video.currentTime.toFixed(2)}, paused=${video.paused}, readyState=${video.readyState}, seeking=${video.seeking}, buffered=${newRanges.join(', ') || 'empty'}`);
                                    }, 100);
                                };
                                video.addEventListener('seeked', seekedHandler);

                                WebRTCStreamManager.logger?.info(`Lag recovery: Fast-forward from ${currentPos.toFixed(2)}s to ${targetPosition.toFixed(2)}s`);
                                video.currentTime = targetPosition;
                                return true;
                            } else {
                                WebRTCStreamManager.logger?.info(`Lag recovery: Not enough buffer ahead for fast-forward (need 3s, have ${(latestPosition - currentPos).toFixed(2)}s: latestPosition=${latestPosition.toFixed(2)}, currentPos=${currentPos.toFixed(2)})`);
                            }
                        } else {
                            WebRTCStreamManager.logger?.info('Lag recovery: No buffered ranges available');
                        }
                    } catch (e) {
                        WebRTCStreamManager.logger?.error('Lag recovery: Fast-forward failed:', e);
                    }
                    return false;
                }
                /**
                 * Check if datachannel seek is available for live streams.
                 */
                private canSeekViaDataChannel(): boolean {
                    return webRtcStreamManager.apiVersion === ApiVersions.v2 &&
                           webRtcStreamManager.peerConnection?.remoteDataChannel?.readyState === 'open' &&
                           webRtcStreamManager.isLive;
                }
                /**
                 * Send datachannel seek to live position.
                 * For live streams, position=0 means "jump to live".
                 */
                private sendSeekToLive(): boolean {
                    try {
                        if (this.canSeekViaDataChannel()) {
                            WebRTCStreamManager.logger?.info('Lag recovery: Sending datachannel seek to live position');
                            webRtcStreamManager.peerConnection?.remoteDataChannel?.send('{"seek":0.0}');
                            return true;
                        }
                    } catch (e) {
                        WebRTCStreamManager.logger?.error('Lag recovery: Datachannel seek failed:', e);
                    }
                    return false;
                }
                /**
                 * Handle lag detection with progressive recovery before reconnection.
                 * Returns true if recovery was attempted (should re-check), false if reconnection is needed.
                 */
                private handleLagDetected(): boolean {
                    // Step 1: Try fast-forward to latest buffered position
                    if (this.lagRecoveryAttempts === 0) {
                        WebRTCStreamManager.logger?.info(`Lag recovery: Attempt ${this.lagRecoveryAttempts + 1} - trying fast-forward`);
                        const fastForwardWorked = this.attemptFastForward();
                        this.lagRecoveryAttempts++;

                        if (fastForwardWorked) {
                            this.startTime = 0; // Reset drift calculation
                            return true;
                        }
                        // Fast-forward didn't work (not enough buffer), fall through to try datachannel seek
                        WebRTCStreamManager.logger?.info('Lag recovery: Fast-forward unsuccessful, trying datachannel seek immediately');
                    }

                    // Step 2: Try datachannel seek to live (for live streams only)
                    if (this.lagRecoveryAttempts <= 1) {
                        this.lagRecoveryAttempts = 2; // Mark that we've tried datachannel seek
                        WebRTCStreamManager.logger?.info(`Lag recovery: Attempt 2 - trying datachannel seek`);
                        if (this.canSeekViaDataChannel()) {
                            this.sendSeekToLive();
                            this.startTime = 0; // Reset drift calculation
                            return true;
                        } else {
                            WebRTCStreamManager.logger?.info('Lag recovery: Datachannel seek not available (not live or channel not open)');
                            // Fall through to reconnect
                        }
                    }

                    // Step 3: All recovery attempts exhausted, reconnect
                    WebRTCStreamManager.logger?.info('Lag recovery: All attempts exhausted, reconnecting');
                    this.lagRecoveryAttempts = 0; // Reset for next connection
                    return false;
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

                    // Check if recovery in progress needs to be reset (requires sustained healthy playback)
                    this.checkIfTrulyHealthy(timeBehind, playbackTime);

                    if (playbackTime && timeBehind > WebRTCStreamManager.maxBehind) {
                        // Try progressive recovery before reconnection
                        if (this.handleLagDetected()) {
                            // Recovery attempted, schedule re-check
                            this.streamCheckTimeout = webRtcStreamManager.trackTimeout(() => {
                                this.clear();
                                this.track();
                            }, 2000); // Check again in 2 seconds
                            return;
                        }
                        WebRTCStreamManager.performanceIssueNotifier$.next()
                        return webRtcStreamManager.close(0.1);
                    }
                    this.streamCheckTimeout = webRtcStreamManager.trackTimeout(() => {
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
                        this.streamCheckTimeout = webRtcStreamManager.trackTimeout(() => {
                            this.trackCurrentTime();
                        }, 1000);
                        return;
                    }
                    const currentTime = Math.round(Date.now() / 1000)
                    this.startTime ||= currentTime - playbackTime;
                    const timeSinceStart = currentTime - this.startTime;
                    const timeBehind = timeSinceStart - playbackTime;

                    // Check if recovery in progress needs to be reset (requires sustained healthy playback)
                    this.checkIfTrulyHealthy(timeBehind, playbackTime);

                    if (timeBehind > WebRTCStreamManager.maxBehind) {
                        // Try progressive recovery before reconnection
                        if (this.handleLagDetected()) {
                            // Recovery attempted, schedule re-check
                            this.streamCheckTimeout = webRtcStreamManager.trackTimeout(() => {
                                this.trackCurrentTime();
                            }, 2000); // Check again in 2 seconds
                            return;
                        }
                        WebRTCStreamManager.performanceIssueNotifier$.next()
                        webRtcStreamManager.close(0.1);
                    } else {
                        this.streamCheckTimeout = webRtcStreamManager.trackTimeout(() => {
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

                    let beforeBufferedEnd = 0;

                    streamTracker.track()
                    webRtcStreamManager.sourceBuffer.onupdatestart = function() {
                        beforeBufferedEnd = webRtcStreamManager.getBufferedAheadTime(webRtcStreamManager.video);
                    }

                    webRtcStreamManager.sourceBuffer.onupdateend = function() {
                        // Check if the manager is closing - prevent operations on cleaned up state
                        if (webRtcStreamManager._isClosing) {
                            return;
                        }

                        // Check if this updateend is from a buffer trim operation
                        if (webRtcStreamManager._bufferTrimPending) {
                            webRtcStreamManager._bufferTrimPending = false;
                            WebRTCStreamManager.logger?.info('MSE buffer trim completed');
                            // After trim, continue with any pending buffers
                            if (webRtcStreamManager.buffers.length) {
                                webRtcStreamManager.appendFromBuffers();
                            }
                            return;
                        }

                        const bufferedTotal = webRtcStreamManager.getBufferedAheadTime(webRtcStreamManager.video);
                        const chunkDuration = bufferedTotal - beforeBufferedEnd;
                        webRtcStreamManager.chunkDuration$.next(chunkDuration);
                        webRtcStreamManager.bufferedDuration$.next(bufferedTotal);
                        if (WebRTCStreamManager.USE_UNRELIABLE_DATA_CHANNEL) {
                            // For MSE mode (H.265/MJPEG transcoding), use conservative playback rate.
                            // Server-side transcoding can't keep up with aggressive catch-up speeds.
                            // Keep playback at 1x unless buffer grows past 3s, then allow gradual
                            // speedup to prevent unbounded buffer growth.
                            const maxPlaybackRateForMSE = 1.25; // Conservative max for transcoding
                            const speedUpThreshold = 3; // Start speeding up when buffer exceeds this
                            let playbackRate = 1;

                            if (bufferedTotal > speedUpThreshold) {
                                // Gradually speed up: 1.05x at 4s, 1.10x at 5s, etc.
                                playbackRate = Math.min(maxPlaybackRateForMSE, 1 + (bufferedTotal - speedUpThreshold) * 0.05);
                            } else if (bufferedTotal < 1) {
                                // Slow down if buffer is critically low to let it fill
                                playbackRate = 0.9;
                            }

                            webRtcStreamManager.playbackRate$.next(playbackRate)
                            webRtcStreamManager.video.playbackRate = playbackRate;
                        }
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
                        } else {
                            // No pending buffers - check if we should trim old data
                            webRtcStreamManager.maybeTrimbuffer();
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
        // When server indicates video transcoding over SRTP, prefer MSE delivery to avoid
        // wasting server resources — but only if the browser can play H265 via MSE.
        // If MSE can't handle H265, fall through to let the transcoded SRTP stream play
        // (when allowTranscoding is true) or show "not supported" (when false).
        if ('transcoding' in signal && signal.transcoding.video
            && this.apiVersion !== ApiVersions.v1 && !this.usingMse) {
            if (WebRTCStreamManager.h265MseSupported) {
                WebRTCStreamManager.logger?.info(
                    'Server transcoding over SRTP — switching to MSE delivery to avoid transcoding (MSE H265 supported)'
                );
                WebRTCStreamManager.camerasNeedingMse.add(this.connectionKey);
                this.usingMse = true;
                this._wsRetryPending = true;
                this.close(0.1);
                return;
            }
            WebRTCStreamManager.logger?.info(
                `Server transcoding over SRTP but MSE H265 not supported — ${this.allowTranscoding ? 'allowing transcoded stream' : 'transcoding not allowed'}`
            );
            // MSE can't play H265, so switching to MSE won't help.
            // Fall through: if allowTranscoding, the transcoded SRTP stream will play.
            // If !allowTranscoding, the block below will handle it.
        }

        if ('transcoding' in signal && signal.transcoding.video && !this.allowTranscoding) {
            WebRTCStreamManager.logger?.info(
                `Received transcoding signal: video=${signal.transcoding.video}, usingMse=${this.usingMse}, apiVersion=${this.apiVersion}, availableStreams=${this.availableStreams.length}, hasSdp=${'sdp' in signal}`
            );

            // Combined transcoding+sdp: the server already transcoded to a browser-playable
            // codec (e.g. H265→VP8) and included the SDP offer. Accept the SDP and play the
            // already-transcoded stream instead of reconnecting.
            if ('sdp' in signal) {
                WebRTCStreamManager.logger?.info(
                    'Server sent combined transcoding+sdp — accepting already-transcoded stream'
                );
                // Fall through to SDP processing below
            } else {
                // Standalone transcoding signal (no SDP) — server needs us to switch delivery method.
                if (this.usingMse) {
                    WebRTCStreamManager.logger?.info(
                        'Standalone transcoding signal while MSE active — waiting for negotiation to continue'
                    );
                    return;
                }

                if (this.apiVersion !== ApiVersions.v1) {
                    WebRTCStreamManager.logger?.info(
                        'Switching to MSE mode (deliveryMethod=mse) and reconnecting'
                    );
                    this.usingMse = true;
                    // Suppress the WebSocket close observer's automatic retry so it doesn't
                    // race us with a reconnect using the old URL (without deliveryMethod=mse).
                    this._wsRetryPending = true;
                    this.close(0.1);
                    return;
                }

                // v1 API: MSE not available, try secondary stream or emit error
                this.disableCurrentStream();
                if (this.availableStreams.length) {
                    WebRTCStreamManager.logger?.info(
                        `v1 API transcoding required, trying next stream. Remaining: ${this.availableStreams.length}`
                    );
                    this.close(0.1);
                } else {
                    WebRTCStreamManager.logger?.warn(
                        'v1 API transcoding required but no streams available, emitting transcodingDisabled'
                    );
                    this.mediaStream$.next([null, ConnectionError.transcodingDisabled, this]);
                    this.close(false);
                }
                return;
            }
        }
        if ('mime' in signal) {
            this.cleanupBuffers();
            if (this.usingMse) {
                this.initializeMse(signal.mime);
            }
            // If the signal also contains sdp, fall through to SDP processing.
            // The server may send a combined mime+sdp signal for MSE connections
            // (e.g. {mime, transcoding, sdp} all in one message).
            if (!('sdp' in signal)) {
                return;
            }
        }

        if ('sdp' in signal) {
            // Cast needed: server may send combined signals (e.g. mime+sdp+transcoding)
            // that don't match any single type in the union, but sdp is always RTCSessionDescriptionInit.
            const sdp = (signal as { sdp: RTCSessionDescriptionInit }).sdp;
            const remote = new RTCSessionDescription(sdp)
            this.peerConnection
                ?.setRemoteDescription(remote)
                .then(() => {
                    // Only create answers in response to offers
                    if (sdp.type === 'offer') {
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

        // Track failure (circuit breaker integration point)
        this.recordRetryFailure(error);

        // Clean up current connection
        this.peerConnection?.close();
        this.peerConnection = null;

        // Check if retry is allowed (circuit breaker integration point)
        if (!this.canAttemptRetry()) {
            WebRTCStreamManager.logger?.error(
                `Error handler max retries exceeded for ${this.connectionKey}`,
                {
                    error,
                    consecutiveFailures: this.consecutiveRetryFailures
                }
            );
            this.permanentFailureCleanup();
            return;
        }

        // Initialize new connection and retry
        this.initPeerConnection();
        this.wsConnection?.next({ error });

        WebRTCStreamManager.logger?.info(
            `Error handler retry attempt ${this.consecutiveRetryFailures}/${WebRTCStreamManager.MAX_RETRY_FAILURES}`,
            { error }
        );

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
        // Check if apiContext was provided in config - skip version detection if so
        if (typeof this.webRtcUrlFactoryOrConfig !== 'function' &&
            'apiContext' in this.webRtcUrlFactoryOrConfig &&
            this.webRtcUrlFactoryOrConfig.apiContext?.version) {
            const providedVersion = this.webRtcUrlFactoryOrConfig.apiContext.version;
            WebRTCStreamManager.logger?.info('Using apiContext.version from config, skipping version detection:', providedVersion);
            this.apiVersion = providedVersion;
            // V1 always has proxy disabled, V2 depends on actual server version (assume enabled for V2)
            this.proxyDisabled = providedVersion === ApiVersions.v1;
            return providedVersion;
        }

        const systemId = new URL(this.webRtcUrlFactory()).host.split('.').shift();
        const cached = WebRTCStreamManager.cachedApiVersion[systemId]
        if (cached) {
            this.apiVersion = cached;
            return cached
        }

        const relayHost = new URL(this.webRtcUrlFactory({ position: 0 })).host;
        const endpoint = `https://${relayHost}/rest/v2/system/info?_with=version`;
        const fallback = { version: '5.1' }
        const token = await Promise.resolve(this.accessToken());
        const version = await cacheSuccess(() => fetchWithRedirectAuthorization(
            endpoint,
            { headers: { authorization: `Bearer ${token}` }}
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

    /**
     * Tracks cameras where SRTP triggered server-side transcoding (e.g. H265→VP8)
     * and MSE delivery was used instead. On subsequent connections to the same camera,
     * proactively use MSE to avoid the ~1-3s penalty of the initial SRTP attempt.
     */
    static readonly camerasNeedingMse = new Set<string>();

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

    /**
     * Track consecutive timeout failures per stream for automatic stream disabling
     * Key: stream index (0 = PRIMARY, 1 = SECONDARY), Value: consecutive failure count
     */
    private consecutiveTimeoutFailures: Map<number, number> = new Map();

    start = async (lostConnection = false): Promise<unknown> => {
        // Prevent multiple concurrent connection attempts
        if (this._isConnecting && this._pendingStartPromise && !lostConnection) {
            if (this._positionChanged) {
                // Position changed while connecting — queue restart after current attempt completes
                this._needsRestart = true;
            }
            WebRTCStreamManager.logger?.info('start() called while already connecting, returning pending promise');
            return this._pendingStartPromise;
        }

        // Reconnection cooldown: prevent rapid-fire reconnections when stream is active
        // Only apply cooldown for non-lostConnection, non-position-change calls (MOS-triggered reconnections)
        // lostConnection calls and position changes should proceed immediately
        if (!lostConnection && !this._positionChanged && this.mediaStream$.value?.[0] && this._lastReconnectionTime) {
            const timeSinceLastReconnection = Date.now() - this._lastReconnectionTime;
            if (timeSinceLastReconnection < WebRTCStreamManager.RECONNECTION_COOLDOWN_MS) {
                WebRTCStreamManager.logger?.info(
                    `Reconnection cooldown active (${Math.round((WebRTCStreamManager.RECONNECTION_COOLDOWN_MS - timeSinceLastReconnection) / 1000)}s remaining), skipping reconnection`
                );
                return Promise.resolve();
            }
        }

        // Only consume the position-change flag for non-lostConnection starts,
        // since startHandler(true) just closes — it doesn't reconnect with the new position.
        if (!lostConnection) {
            this._positionChanged = false;
        }

        // Track reconnection time for cooldown
        this._lastReconnectionTime = Date.now();

        // Reset WebSocket retry flag for fresh connection attempt
        this._wsRetryPending = false;

        // If this is a lostConnection call, close existing connection first
        if (lostConnection) {
            this.closeWsConnection();
        }

        this._isConnecting = true;
        this._pendingStartPromise = this.startHandler(lostConnection)
            .catch(() => this.trackTimeout(() => this.mediaStream$.observed && !this._isConnecting && this.start(true), 100))
            .finally(() => {
                this._isConnecting = false;
                this._pendingStartPromise = null;
                if (this._needsRestart) {
                    this._needsRestart = false;
                    this.start();
                }
            });

        return this._pendingStartPromise;
    };

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
            // Switch to PRIMARY (usually more reliable) instead of SECONDARY for recovery
            const fallbackStream = this.availableStreams.includes(AvailableStreams.PRIMARY)
                ? AvailableStreams.PRIMARY
                : this.availableStreams[0];
            this.updateStream(fallbackStream);
            acquireLock(this, 60, true);
            this.mediaStream$.next([null, ConnectionError.lostConnection, this]);
            return this.close(3, this.apiVersion === ApiVersions.v1);
        }

        const position = this.position$.value.value;
        const speed = !position ? Infinity : this.speed$.value.value || 1;
        const stream = this.currentStream();
        let webRtcUrl = this.webRtcUrlFactory({ position, speed: speed === Infinity ? 'unlimited' : speed, stream });

        WebRTCStreamManager.logger?.info('startHandler - webRtcUrl generated:', webRtcUrl);

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

        // RTSP FIX: Check if mediaStreams was provided in config to skip device info API call
        const configMediaStreams = typeof this.webRtcUrlFactoryOrConfig !== 'function' &&
            'mediaStreams' in this.webRtcUrlFactoryOrConfig &&
            this.webRtcUrlFactoryOrConfig.mediaStreams?.length
                ? this.webRtcUrlFactoryOrConfig.mediaStreams
                : null;

        let fetchStreams: Promise<typeof fallback>;

        if (configMediaStreams) {
            // Use mediaStreams from config - skip API call
            WebRTCStreamManager.logger?.info('Using mediaStreams from config, skipping device info fetch');
            fetchStreams = Promise.resolve({
                parameters: { mediaStreams: { streams: configMediaStreams } },
                serverId: this.targetServerId,
                id: this.cameraId
            });
        } else {
            // Fallback: fetch device info from API
            const deviceParams = '?_keepDefault=true&_with=parameters.mediaStreams.streams.codec,parameters.mediaStreams.streams.encoderIndex,serverId,id'
            const allStreamsInfoEndpoint = `https://${relayHost}/rest/v2/devices${deviceParams}`
            const streamInfoEndpoint =
                `https://${relayHost}/rest/v2/devices/${this.cameraId}${deviceParams}`;

            const token = await Promise.resolve(this.accessToken());

            const fetchAllStreams = cacheSuccess(() => fetchWithRedirectAuthorization(
                allStreamsInfoEndpoint,
                { headers: { authorization: `Bearer ${token}` }}
                ), `${systemId}-streams-${this.codecCheckKey}`).then(response => response.json() as Promise<typeof fallback[]>).catch(err => {
                    WebRTCStreamManager.logger?.warn('fetchAllStreams failed (likely 401 auth issue):', err?.message || err);
                    return [] as typeof fallback[];
                });

            const fetchCurrentStream = () => cacheSuccess(() => fetchWithRedirectAuthorization(
                streamInfoEndpoint,
                { headers: { authorization: `Bearer ${token}` }}
                ), `${this.connectionKey}-streams-${this.codecCheckKey}`).then(response => response.json() as Promise<typeof fallback>).catch(err => {
                    WebRTCStreamManager.logger?.warn('fetchCurrentStream failed:', err?.message || err);
                    return fallback;
                })

            fetchStreams = fetchAllStreams.then(devices => {
                const device = devices.find(({ id }) => cleanId(id) === this.cameraId);

                if (this.codecChanged === this.codecCheckKey && device) {
                    return device;
                }

                this.codecCheckKey = this.codecChanged;

                return fetchCurrentStream();
            });
        }

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


        // Check if connectionContext was provided in config - skip ping if so
        const hasConnectionContext = typeof this.webRtcUrlFactoryOrConfig !== 'function' &&
            'connectionContext' in this.webRtcUrlFactoryOrConfig &&
            !!this.webRtcUrlFactoryOrConfig.connectionContext?.resolvedHost;

        // Check if useProxy was explicitly set in config
        const hasExplicitUseProxy = typeof this.webRtcUrlFactoryOrConfig !== 'function' &&
            'useProxy' in this.webRtcUrlFactoryOrConfig &&
            this.webRtcUrlFactoryOrConfig.useProxy !== undefined;

        let resolvedHost: string | false;

        if (hasConnectionContext) {
            // Use pre-resolved connection context - skip ping request
            // Cast is safe here - hasConnectionContext already verified it's a config object with connectionContext
            const config = this.webRtcUrlFactoryOrConfig as WebRtcUrlConfig;
            const ctx = config.connectionContext!;
            WebRTCStreamManager.logger?.info('Using connectionContext from config, skipping ping:', ctx);

            resolvedHost = ctx.resolvedHost;

            // Set useProxy from config or compute from moduleGuid
            if (hasExplicitUseProxy) {
                const proxyValue = (config as WebRtcUrlConfigUnknown).useProxy;
                if (proxyValue !== undefined) {
                    this.useProxy = proxyValue;
                }
            } else if (ctx.moduleGuid) {
                this.useProxy = cleanId(ctx.moduleGuid) !== this.serverId;
            }
            // else: useProxy stays as default (false)

            // Check if proxy is disabled but required
            if (this.useProxy && this.proxyDisabled) {
                resolvedHost = false;
            }
        } else {
            // Fallback: perform ping request to resolve host and determine proxy
            const pingUrl = `https://${relayHost.replace(this.prefix, generateRandomString())}/api/ping?${directConnect && this.serverId ? `x-server-guid=${this.serverId}` : ''}`;
            WebRTCStreamManager.logger?.info('Ping request:', { pingUrl, relayHost, prefix: this.prefix });

            resolvedHost = await fetch(pingUrl).then(async response => {
                WebRTCStreamManager.logger?.info('Ping response:', {
                    status: response.status,
                    redirected: response.redirected,
                    url: response.url
                });
                const json = await response.json();

                // Set useProxy from config if provided, otherwise compute from moduleGuid
                if (hasExplicitUseProxy) {
                    // Cast is safe - hasExplicitUseProxy already verified it's a config object
                    const proxyValue = (this.webRtcUrlFactoryOrConfig as WebRtcUrlConfigUnknown).useProxy;
                    if (proxyValue !== undefined) {
                        this.useProxy = proxyValue;
                    }
                } else {
                    this.useProxy = cleanId(json?.reply?.moduleGuid || '') !== this.serverId;
                }

                return !(this.useProxy && this.proxyDisabled) && new URL(response.url).host
            }).catch(err => {
                WebRTCStreamManager.logger?.warn('Ping request failed:', err?.message || err);
                return false as const;
            });
        }

        const invalidAccessToken = () => {
            this.mediaStream$.next([null, ConnectionError.invalidAccessToken, this]);
            return this.close(2)
        }

        let oneTimeToken = '';

        const getOneTimeToken = async (): Promise<string> => {
            // Check if oneTimeToken was provided in apiContext (static string or factory function)
            if (typeof this.webRtcUrlFactoryOrConfig !== 'function' &&
                'apiContext' in this.webRtcUrlFactoryOrConfig &&
                this.webRtcUrlFactoryOrConfig.apiContext?.oneTimeToken !== undefined) {
                const tokenOrFactory = this.webRtcUrlFactoryOrConfig.apiContext.oneTimeToken;
                WebRTCStreamManager.logger?.info('Using oneTimeToken from apiContext');
                // Resolve token from factory function or use static string
                return typeof tokenOrFactory === 'function'
                    ? Promise.resolve(tokenOrFactory())
                    : tokenOrFactory;
            }

            // Fallback: fetch one-time token from API
            let oneTimeTokenEndpoint = `https://${resolvedHost}/rest/v3/login/tickets`;

            if (directConnect) {
                oneTimeTokenEndpoint += `?x-server-guid=${this.targetServerId}&`
            }

            const token = await Promise.resolve(this.accessToken());
            return fetchWithRedirectAuthorization(oneTimeTokenEndpoint, { headers: { authorization: `Bearer ${token}` }, method: 'POST'}).then(response => response.json()).then(res => {
                return res.token;
            })
        }

        if (resolvedHost) {
            // CRITICAL: Add prefix to resolved host for WebSocket connection multiplexing
            // The resolved host from redirect doesn't have the prefix, but we need it
            // to bypass browser's 6 TCP connection limit per host
            const prefixedResolvedHost = WebRTCStreamManager.USE_RELAY_PREFIX
                ? `${this.prefix}---${resolvedHost}`
                : resolvedHost;

            WebRTCStreamManager.logger?.info('URL resolution debug:', {
                originalRelayHost: relayHost,
                resolvedHost,
                prefixedResolvedHost,
                USE_RELAY_PREFIX: WebRTCStreamManager.USE_RELAY_PREFIX,
                prefix: this.prefix,
                webRtcUrlBefore: webRtcUrl
            });

            webRtcUrl = webRtcUrl.replace(relayHost, prefixedResolvedHost);

            WebRTCStreamManager.logger?.info('URL after prefix fix:', webRtcUrl);
            const accessToken = await Promise.resolve(this.accessToken());
            if (accessToken) {
                if (this.apiVersion === ApiVersions.v1) {
                    const hostWithAccessToken = `${resolvedHost}-${accessToken}`

                    // Use TTL cache for authentication state (1 hour TTL)
                    let authPromise = this.getStatic()._authCache.get(hostWithAccessToken);
                    if (!authPromise) {
                        authPromise = cacheSuccess(() => fetch(
                            `https://${resolvedHost}/rest/v2/login/sessions/${accessToken}?setCookie=true`,
                            { credentials: 'include' }
                        ), hostWithAccessToken).then(res => res.ok);
                        this.getStatic()._authCache.set(hostWithAccessToken, authPromise);
                    }

                    if (!(await authPromise)) {
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
            // Call startHandler directly to avoid connection guard deadlock
            return this.startHandler();
        }

        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }

        const streamsRes = await fetchStreams
        const streams = streamsRes?.parameters?.mediaStreams?.streams || fallback.parameters.mediaStreams.streams;

        const targetStream = streams.find(({ encoderIndex }) => encoderIndex === stream);

        // DIAGNOSTIC: Log stream detection data to understand why fix may not trigger
        WebRTCStreamManager.logger?.info('Stream detection debug', {
            streamsCount: streams?.length,
            streamsData: streams?.slice(0, 5).map(s => ({ encoderIndex: s.encoderIndex, codec: s.codec })),
            currentAvailable: this._availableStreams,
            targetStream: stream
        });

        // If streams is empty, log that the device fetch likely failed
        if (!streams || streams.length === 0) {
            WebRTCStreamManager.logger?.warn('Stream detection: No streams data available (device fetch may have failed with 401). Using defaults.');
        }

        // RTSP FIX: Early stream availability detection to prevent timeout cascade on single-stream cameras
        // Uses already-fetched API data to update available streams before connection attempt
        if (streams && streams.length > 0) {
            const detectedStreams = streams
                .filter(s => s.encoderIndex === AvailableStreams.PRIMARY || s.encoderIndex === AvailableStreams.SECONDARY)
                .map(s => s.encoderIndex as AvailableStreams);

            // If no valid streams detected but we got API response, assume PRIMARY only
            if (detectedStreams.length === 0 && streams && streams.length > 0) {
                WebRTCStreamManager.logger?.warn('Streams found but no valid encoderIndex values, defaulting to PRIMARY only', {
                    rawStreamsCount: streams.length
                });
                this._availableStreams = [AvailableStreams.PRIMARY];

                // If target was SECONDARY and it doesn't exist, switch to PRIMARY
                if (stream === AvailableStreams.SECONDARY) {
                    WebRTCStreamManager.logger?.info('Switching from unavailable SECONDARY to PRIMARY');
                    // Use skip: true to prevent duplicate start() from subscription
                    this.stream$.next({ value: AvailableStreams.PRIMARY, skip: true });
                    // Call startHandler directly to avoid connection guard deadlock
                    return this.startHandler();
                }
            }

            if (detectedStreams.length > 0 && detectedStreams.length < this._availableStreams.length) {
                WebRTCStreamManager.logger?.info(
                    `Stream availability detected from API: [${detectedStreams.join(', ')}] (was: [${this._availableStreams.join(', ')}])`
                );
                this._availableStreams = detectedStreams;

                // If current target stream doesn't exist, switch to available stream
                if (!detectedStreams.includes(stream)) {
                    const newStream = detectedStreams[0];
                    WebRTCStreamManager.logger?.info(`Switching from unavailable stream ${stream} to available stream ${newStream}`);
                    // Use skip: true to prevent duplicate start() from subscription
                    this.stream$.next({ value: newStream, skip: true });
                    // Call startHandler directly to avoid connection guard deadlock
                    return this.startHandler();
                }
            }
        }

        /**
         * Build list of codecs that require MSE delivery (cannot use native WebRTC/SRTP).
         *
         * MJPEG (codec 7) always requires transcoding/MSE.
         *
         * H265 (codec 173) handling depends on browser capabilities:
         * - If browser WebRTC supports H265: try SRTP first (newer mediaservers handle it
         *   natively). If SRTP triggers transcoding, the transcoding signal handler will
         *   switch to MSE if available.
         * - If browser WebRTC doesn't support H265 but MSE does: proactively use MSE
         *   to skip the doomed SRTP attempt.
         * - If neither WebRTC nor MSE supports H265: only server-side transcoding can
         *   play this stream. If allowTranscoding is false, show "not supported".
         */
        const requiresTranscoding: number[] = Object.values(RequiresTranscoding).filter(isRequiresTranscoding);

        // When WebRTC can't decode H265, check if MSE can before adding to requiresTranscoding.
        // If MSE supports H265, we use MSE delivery (proactive skip of SRTP).
        // If neither supports H265, it goes into requiresTranscoding so the "not supported"
        // path triggers when allowTranscoding is false.
        const isH265Stream = targetStream?.codec === WebRTCStreamManager.H265_CODEC;
        if (!WebRTCStreamManager.h265WebRtcSupported && isH265Stream) {
            if (WebRTCStreamManager.h265MseSupported) {
                WebRTCStreamManager.logger?.info(
                    'H265 WebRTC not supported but MSE H265 is supported — will use MSE delivery'
                );
            } else {
                requiresTranscoding.push(WebRTCStreamManager.H265_CODEC);
                WebRTCStreamManager.logger?.info(
                    'H265 not supported by WebRTC or MSE — server-side transcoding required'
                );
            }
        }

        /**
         * PERFORMANCE OPTIMIZATION: Early codec detection to skip blind SRTP attempt
         *
         * For codecs in requiresTranscoding (MJPEG, or H265 when neither WebRTC nor MSE
         * supports it), we know upfront that SRTP won't work without transcoding.
         *
         * For H265 specifically:
         * - WebRTC H265 supported: try SRTP (version-dependent, may work on newer servers)
         * - WebRTC H265 unsupported, MSE H265 supported: proactive MSE delivery
         * - Neither supported: requires transcoding or "not supported"
         *
         * The camerasNeedingMse cache remembers cameras where SRTP previously triggered
         * transcoding, so subsequent connections skip the SRTP attempt.
         */
        const codecNeedsTranscoding = targetStream?.codec && requiresTranscoding.includes(targetStream.codec);
        const codecNeedsMse = isH265Stream && !WebRTCStreamManager.h265WebRtcSupported && WebRTCStreamManager.h265MseSupported;
        const cameraPrefersMse = WebRTCStreamManager.camerasNeedingMse.has(this.connectionKey);

        // Proactively set MSE mode for:
        // 1. H265 streams when WebRTC can't decode but MSE can (skip doomed SRTP attempt)
        // 2. Cameras where a previous SRTP attempt triggered server-side transcoding
        if ((codecNeedsMse || cameraPrefersMse) && this.apiVersion !== ApiVersions.v1 && !this.usingMse) {
            WebRTCStreamManager.logger?.info(
                codecNeedsMse
                    ? `Early codec detection: H265 not decodable via WebRTC, using MSE delivery`
                    : `Camera previously needed MSE (SRTP triggered transcoding), skipping SRTP attempt`
            );
            this.usingMse = true;
        }

        const srtp = 'deliveryMethod=srtp';
        const mse = 'deliveryMethod=mse';

        if (this.usingMse && this.apiVersion !== ApiVersions.v1) {
            if (webRtcUrl.includes(srtp)) {
                webRtcUrl = webRtcUrl.replace(srtp, mse);
            } else {
                webRtcUrl += `${mse}&`;
            }
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
                    url: this.apiVersion === ApiVersions.v1 ? prefixed : `${prefixed}&_ticket=${await getOneTimeToken()}${WebRTCStreamManager.USE_UNRELIABLE_DATA_CHANNEL ? '&unreliableTransport=true': ''}&_ignore=${generateRandomString()}`,
                    closeObserver: {
                        /**
                         * Handles reconnecting if there's some low level error with the websocket connection.
                         * Only retries on code 1006 (abnormal closure) when no media stream is established yet.
                         */
                        next: async _close => {
                            if (_close.code !== 1006 || webRtcStreamManager.mediaStream$.value?.[0]) {
                                // Clear retry flag on successful connection (mediaStream exists)
                                if (webRtcStreamManager.mediaStream$.value?.[0]) {
                                    webRtcStreamManager._wsRetryPending = false;
                                }
                                return;
                            }
                            // Prevent multiple concurrent retry attempts
                            if (webRtcStreamManager._wsRetryPending) {
                                WebRTCStreamManager.logger?.info('WebSocket retry already pending, skipping duplicate retry');
                                return;
                            }

                            // Close existing connection before retry to prevent multiple open WebSockets
                            webRtcStreamManager.closeWsConnection();

                            if (--retries) {
                                webRtcStreamManager._wsRetryPending = true;
                                ConnectionQueue.runTask(async resolve => {
                                    // Reset flag BEFORE creating new WS to allow sequential retries
                                    webRtcStreamManager._wsRetryPending = false;
                                    await openConnection(observer, retries);
                                    resolve();
                                }, `connect-${webRtcStreamManager.connectionKey.split('_').shift()}`, 1);
                            } else {
                                webRtcStreamManager._wsRetryPending = false;
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
                        // RTSP FIX: Track consecutive timeout failures per stream
                        const currentStreamValue = webRtcStreamManager.currentStream();
                        const failures = (webRtcStreamManager.consecutiveTimeoutFailures.get(currentStreamValue) || 0) + 1;
                        webRtcStreamManager.consecutiveTimeoutFailures.set(currentStreamValue, failures);

                        WebRTCStreamManager.logger?.info(`Timeout on stream ${currentStreamValue}, failure count: ${failures}`);

                        // After 2 consecutive timeout failures on same stream, disable it and try other
                        if (failures >= 2 && webRtcStreamManager.availableStreams.length > 1) {
                            WebRTCStreamManager.logger?.info(`Disabling stream ${currentStreamValue} after ${failures} consecutive timeouts`);
                            webRtcStreamManager.disableCurrentStream();
                            webRtcStreamManager.consecutiveTimeoutFailures.clear();
                            return webRtcStreamManager.start();
                        }

                        // RTSP FIX: Faster fallback for single-stream cameras
                        const isSingleStream = webRtcStreamManager._availableStreams.length === 1;
                        const reducedWait = isSingleStream ? Math.min(webRtcStreamManager.maxTimeout, 2_500) : webRtcStreamManager.maxTimeout;

                        await new Promise(resolve => setTimeout(resolve, reducedWait));

                        if (webRtcStreamManager.maxTimeout <= 20_000) {
                            // Smaller increment when single stream detected to reduce total wait time
                            const increment = isSingleStream ? 1_500 : 2_500;
                            webRtcStreamManager.maxTimeout += increment;

                            // Trigger lost connection earlier for single-stream cameras
                            const lostConnectionThreshold = isSingleStream ? 10_000 : 12_500;
                            if (webRtcStreamManager.maxTimeout >= lostConnectionThreshold) {
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
                // Normalize to milliseconds: 'timestamp' is microseconds, 'timestampMs' is milliseconds
                const timestampMs = 'timestampMs' in data
                    ? data.timestampMs
                    : (data.timestamp / 1000);
                if (this.isLive) {
                    WebRTCStreamManager.logger?.info('skip updating position from timestamp since live', timestampMs)
                } else {
                    WebRTCStreamManager.logger?.info('updating position from timestamp', timestampMs)
                    this.position$.next(new WithSkip(timestampMs, true));
                }

                this.currentPositionTracker$.next(timestampMs)
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

                // Record successful connection (circuit breaker integration point)
                this.recordConnectionSuccess();

                WebRTCStreamManager.logger?.info(
                    `Connection established successfully: ${this.connectionKey}`,
                    { state: this.connectionState }
                );
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

        WebRTCStreamManager.logger?.info('generateWebRtcUrl - config:', {
            systemId,
            USE_RELAY_PREFIX: WebRTCStreamManager.USE_RELAY_PREFIX,
            prefix: this.prefix,
            RELAY_URL: WebRTCStreamManager.RELAY_URL
        });

        const subDomain = WebRTCStreamManager.USE_RELAY_PREFIX ? `${this.prefix}---${systemId}` : systemId;

        const host = WebRTCStreamManager.RELAY_URL.replace('{systemId}', subDomain);

        WebRTCStreamManager.logger?.info('generateWebRtcUrl - URL construction:', {
            subDomain,
            host
        });
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

        return (params: Partial<ReturnType<typeof this.getCurrentStreamInfo>>) => `wss://${host}${endpoint}${serverId ? `x-server-guid=${serverId}&` : ''}${positionParam(params?.position ?? currentStreamInfo.position)}${speedParam(params?.speed ?? currentStreamInfo.speed)}${streamParam(params?.stream ?? currentStreamInfo.stream)}${useV2 ? 'deliveryMethod=srtp&' : ''}`
    }

    private webRtcUrlFactory: WebRtcUrlFactory = (params: Record<string, unknown>) => {
        WebRTCStreamManager.logger?.info('webRtcUrlFactory called:', {
            isFunction: typeof this.webRtcUrlFactoryOrConfig === 'function',
            params
        });

        if (typeof this.webRtcUrlFactoryOrConfig === 'function') {
            const url = this.webRtcUrlFactoryOrConfig(params);
            WebRTCStreamManager.logger?.info('webRtcUrlFactory - using custom function, URL:', url);
            return url;
        }

        const url = this.generateWebRtcUrl(this.webRtcUrlFactoryOrConfig)(params);
        WebRTCStreamManager.logger?.info('webRtcUrlFactory - using generateWebRtcUrl, URL:', url);
        return url;
    }

    public noFrames = 0;

    /** Connection lifecycle state tracking for retry management */
    private connectionState: ConnectionState = ConnectionState.IDLE;

    /** Consecutive retry failure counter for cleanup threshold detection */
    private consecutiveRetryFailures: number = 0;

    /** Timestamp of last retry attempt (for circuit breaker integration) */
    private lastRetryAttempt: number | null = null;

    public playbackRateUpdateCallback = (rate: number): void => {};

    /**
     * Do not use directly use factory WebRTCStreamManager.connect(webRtcUrlFactory) instead.
     *
     * @param webRtcUrlFactory (params: Record<string, unknown>) => string
     */
    private constructor(
        private webRtcUrlFactoryOrConfig: WebRtcUrlFactoryOrConfig,
        private _availableStreams: AvailableStreams[] = [AvailableStreams.PRIMARY, AvailableStreams.SECONDARY],
        private accessToken: () => string | Promise<string> = () => '',
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

// @ts-ignore Use for debugging
window.setPlaybackRateStrategy = Object.entries(targetPlaybackRateStrategies).reduce((acc, [key, value]) => ({
    ...acc,
    [key]: () => {
        WebRTCStreamManager.PLAYBACK_RATE_STRATEGY = value;
    }
}), <Record<keyof (typeof targetPlaybackRateStrategies), () => void>>{});

/**
 * Periodic cleanup of expired authentication cache entries
 * Runs every 15 minutes to prevent unbounded memory growth
 * Stored in static property to allow cleanup via closeAll()
 */
if (typeof setInterval !== 'undefined') {
    WebRTCStreamManager.authCacheCleanupInterval = setInterval(() => {
        const cleaned = WebRTCStreamManager.cleanupAuthCache();
        if (cleaned > 0 && WebRTCStreamManager.logger) {
            WebRTCStreamManager.logger.info(`Cleaned ${cleaned} expired auth cache entries`);
        }
    }, 15 * 60 * 1000); // 15 minutes
}
