/** IMPORTANT:
 *
 * This will probably be moved to the open source repo and published on NPM at some point so avoid importing any code specific to our project. Rxjs would be a dependency of the package so imports from there would be fine.
 *
 * Once the the api's with the mediaserver are stabilized and WebRTCStreamManager has been been updated to handle updating position and performance tuning we'll look into moving and publishing.
 */

import { Observable, BehaviorSubject, timer, Subject } from 'rxjs';
import { filter, shareReplay, switchMap, take, map, delay, takeUntil, skip } from 'rxjs/operators';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';

const removeAuth = (webRtcUrl: string): string => webRtcUrl.split('&auth=')[0].split('&pos=')[0];

/**
 * Track Video Perforamance for use in tuning webRTC streams
 */
class FrameTracker {
    players = 0;
    start = Infinity;
    end = 0;
    frames = 0;

    #reset = (): void => {
        this.start = performance.now();
        this.end = 0;
        this.frames = 0;
    };

    /**
     * Get currently accumulated frame count, optionally reset count after calculating current value.
     *
     * @param reset Whether to reset frame counters
     * @returns number
     */
    getFps = (reset = false): number => {
        if (!this.players || !this.frames || this.start === this.end) {
            return 0;
        }

        const seconds = (this.end - this.start) / 1000;
        const fps = Math.round(this.frames / seconds / this.players);

        if (reset) {
            this.#reset();
        }

        return fps;
    };

    /**
     * Updates accumulated frame counters and returns current fps.
     *
     * @param now number
     * @returns number
     */
    updateFrame = (now: number): number => {
        this.start = Math.min(this.start, now);
        this.end = Math.max(this.start, now);
        this.frames++;
        return this.getFps();
    };
}

type PlaybackDetails = Record<string, { fps: number; players: number }>;

type StreamHandler = (stream: MediaStream) => unknown;

interface IceCandidate {
    ice: RTCIceCandidate;
}

interface SdpInit {
    sdp: RTCSessionDescriptionInit;
}

interface IceInit {
    ice: RTCIceCandidateInit;
}

interface ErrorMsg {
    error: unknown;
}

type SignalingMessage = SdpInit | IceInit | IceCandidate | ErrorMsg;

export enum ConnectionError {
    websocket = 'websocket',
    authorization = 'authorization',
}

class MediaServerPeerConnection extends RTCPeerConnection {
    onicecandidate = (event: RTCPeerConnectionIceEvent): void => {
        if (event.candidate) {
            this.wsConnection.next({ ice: event.candidate });
        }
    };

    oniceconnectionstatechange = (): void => {
        console.log('peerConnection ice state ' + this.iceConnectionState);
        if (this.iceConnectionState === 'connected') {
            this.closeWebsocket();
        }
    };

    private get wsConnection(): WebSocketSubject<SignalingMessage> {
        return this.getWebSocket();
    }

    constructor(
        private getWebSocket: () => WebSocketSubject<SignalingMessage>,
        private closeWebsocket: () => void,
        trackHandler: StreamHandler,
    ) {
        super({
            iceServers: [
                { urls: 'stun:stun.stunprotocol.org:3478' },
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
            ],
        });

        this.ontrack = (event: RTCTrackEvent): unknown => trackHandler(event.streams[0]);
    }
}

/**
 * Manages connection negotation using websockets as well as webRTC peer connections to mediaservers.
 *
 * Reuses peer connections when possible and only opens websocket connection for negotiating connections.
 *
 * Playback sync as well as performance tuning will either be handled in this class or might end up extending a class that handles managing the playback.
 *
 * TODO: Playback sync as well as performance tuning will be blocked until data channels on VMS-35748 are implemented for position and stream switching.
 */
export class WebRTCStreamManager {
    /** For Tracking existing connections */
    static EXISTING_CONNECTIONS: Record<string, WebRTCStreamManager> = {};

    /** Configure how often performance tuning as well as connection cleanup happens  */
    static SYNC_INTERVAL = 1000;

    /** Force sync to happen outside the normal sync interval would mostly be used for when playback position is updated */
    static forceSync$ = new BehaviorSubject('');

    static position = 0;

    /** Used to trigger sync events such as performance tuning and connection cleanup */
    static sync$ = WebRTCStreamManager.forceSync$.pipe(
        switchMap(() => timer(0, WebRTCStreamManager.SYNC_INTERVAL)),
        shareReplay({ refCount: true, bufferSize: 1 }),
    );

    /** Whether to log current playback performance details */
    static SHOW_STATS = true;

    /** Default stats handler, could be overriden */
    static STATS_HANDLER: (frameInfo: PlaybackDetails) => void = console.table;

    /** Playback details for use in either logging during development or for performance tuning */
    static PLAYBACK_DETAILS$ = WebRTCStreamManager.sync$.pipe(
        map(() =>
            Object.entries(WebRTCStreamManager.EXISTING_CONNECTIONS).reduce(
                (summary, [webRtcUrl, connection]) =>
                    connection?.getPlaying()
                        ? {
                              ...summary,
                              [webRtcUrl]: {
                                  fps: connection.getFps(true),
                                  players: connection.getPlayerCount(),
                              },
                          }
                        : summary,
                {} as PlaybackDetails,
            ),
        ),
    );

    /** Stats logger subcription, only adding as a static property in case we want to be able to unsubscribe */
    static STATS = WebRTCStreamManager.PLAYBACK_DETAILS$.pipe(
        filter(details => this.SHOW_STATS && !!Object.keys(details).length),
    ).subscribe(WebRTCStreamManager.STATS_HANDLER);

    /**
     * WebRTCStreamManager factory to either return existing instance to reuse exiting connection or instantiates instance. Returns observable of the MediaStreams from the mediaserver.
     *
     * @param webRtcUrlFactory () => string
     * @param videoElement HTMLVideoElement
     * @returns Observable<MediaStream>
     */
    static connect(
        webRtcUrlFactory: (params?: Record<string, unknown>) => string,
        videoElement?: HTMLVideoElement,
    ): Observable<[MediaStream, ConnectionError]> {
        const webRtcUrl = removeAuth(webRtcUrlFactory());
        WebRTCStreamManager.EXISTING_CONNECTIONS[webRtcUrl] ||= new WebRTCStreamManager(
            webRtcUrlFactory,
        );

        WebRTCStreamManager.EXISTING_CONNECTIONS[webRtcUrl].registerElement(videoElement);

        return WebRTCStreamManager.EXISTING_CONNECTIONS[webRtcUrl].mediaStream$.pipe(
            filter(res => !!res),
        );
    }

    static updatePosition(position = 0): void {
        WebRTCStreamManager.position = Math.round(position);
        Object.values(WebRTCStreamManager.EXISTING_CONNECTIONS).forEach(connection => {
            if (connection.getPlayerCount()) {
                connection.updatePosition(position);
            }
        });
    }

    #position$ = new BehaviorSubject(0);

    updatePosition(position: number, clearStream = false): void {
        if (clearStream) {
            this.mediaStream$.next([null, null]);
        }
        this.#position$.next(position);
    }

    /** Internal */

    #peerConnection: MediaServerPeerConnection;
    #wsConnection: WebSocketSubject<SignalingMessage>;
    #videoElements: HTMLVideoElement[] = [];
    #frameTracker = new FrameTracker();

    /** Public methods and properties */

    /** Updates whenever the mediasserver sends a new stream */
    mediaStream$ = new BehaviorSubject<[MediaStream, ConnectionError]>(null);

    /**
     * Get current for stream.
     * @param reset boolean
     * @returns number
     */
    public getFps(reset = false): number {
        return this.#frameTracker.getFps(reset);
    }

    /**
     * Get current count of players connected to stream.
     *
     * @returns number
     */
    public getPlayerCount(): number {
        return this.#videoElements.length;
    }

    /**
     * Checks if any connected players are currently playing.
     * @returns boolean
     */
    public getPlaying(): boolean {
        return this.#videoElements.some(({ paused }) => !paused);
    }

    static getPlaying(): boolean {
        return Object.values(WebRTCStreamManager.EXISTING_CONNECTIONS).some(connection =>
            connection.getPlaying(),
        );
    }

    public togglePlaying(play: boolean): void {
        this.#videoElements.forEach(el => {
            if (play) {
                el.play();
            } else {
                el.pause();
            }
        });
    }

    static togglePlaying(play?: boolean): void {
        play = typeof play === 'boolean' ? play : !this.getPlaying();
        Object.values(WebRTCStreamManager.EXISTING_CONNECTIONS).forEach(connection =>
            connection.togglePlaying(play),
        );
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
            requestVideoFrameCallback?: (number) => void;
        };

        if (!element) {
            return;
        }

        const logFrame = (now: number): void => {
            this.#frameTracker.updateFrame(now);
            element.requestVideoFrameCallback(logFrame);
        };

        if (element.requestVideoFrameCallback) {
            logFrame(performance.now());
        } else {
            console.error('videoFrameCallback not available in firefox');
        }

        this.#videoElements.push(videoElement);
        this.#frameTracker.players = this.#videoElements.length;
        const root = videoElement.getRootNode();

        const observer = new MutationObserver(() => {
            if (!root.contains(element)) {
                this.#videoElements.splice(this.#videoElements.indexOf(element), 1);
                this.#frameTracker.players = this.#videoElements.length;
                // if (!this.#frameTracker.players) {
                //     this.#close();
                // }
            }
        });
        observer.observe(root, { childList: true, subtree: true });
        this.updatePosition(this.#position$.value);
    };

    #closeWsConnection = new Subject<string>();

    /** Peer Connection Helpers */

    /**
     * Handles cleaning up connections when no longer in use.
     */
    #close = (): void => {
        this.#closeWsConnection.next('close');
        this.#peerConnection?.close();
        delete WebRTCStreamManager.EXISTING_CONNECTIONS[this.webRtcUrlFactory()];
    };

    /**
     * Handles websocket messages to negotiate connection.
     *
     * @param message MessageEvent<string>
     */
    #gotMessageFromServer = (signal: SdpInit | IceInit): void => {
        this.#initPeerConnection();

        if ('sdp' in signal) {
            this.#peerConnection
                .setRemoteDescription(new RTCSessionDescription(signal.sdp))
                .then(() => {
                    // Only create answers in response to offers
                    if (signal.sdp.type === 'offer') {
                        this.#peerConnection
                            .createAnswer()
                            .then(this.#createdDescription)
                            .catch(this.#errorHandler);
                    }
                })
                .catch(this.#errorHandler);
        } else if (signal.ice) {
            this.#peerConnection
                .addIceCandidate(new RTCIceCandidate(signal.ice))
                .catch(this.#errorHandler);
        } else if (signal.ice === null) {
            this.start();
        }
    };

    /**
     * Sets up session description.
     *
     * @param description RTCSessionDescriptionInit
     */
    #createdDescription = (description: RTCSessionDescriptionInit): void => {
        console.log('got description');

        this.#peerConnection
            .setLocalDescription(description)
            .then(() => {
                this.#wsConnection.next({ sdp: this.#peerConnection.localDescription });
            })
            .catch(this.#errorHandler);
    };

    /**
     * Handles peer connection errors
     * @param error
     */
    #errorHandler(error: unknown): void {
        console.log(error);
        this.#initPeerConnection();
        this.#wsConnection.next({ error });
    }

    /**
     * Returns existing WebSocket connection if it hasn't been closed else it opens a new connection.
     *
     * @returns WebSocket
     */
    #getOpenWebSocketConnection = (): WebSocketSubject<SignalingMessage> => {
        if (!this.#wsConnection) {
            this.start();
        }
        return this.#wsConnection;
    };

    /** Initialization helpers */

    /**
     * Initializes websocket connection for negotating peer connection.
     */
    start = (retries = 3): void => {
        this.#peerConnection?.close();
        this.#peerConnection = null;
        this.#wsConnection = webSocket(
            this.webRtcUrlFactory({ position: WebRTCStreamManager.position }),
        );

        this.#wsConnection.pipe(takeUntil(this.#closeWsConnection)).subscribe({
            next: this.#gotMessageFromServer,
            error: () => {
                this.#close();
                if (retries) {
                    this.start(--retries);
                } else {
                    this.mediaStream$.next([null, ConnectionError.websocket]);
                }
            },
        });
    };

    /**
     * Initializes peer connection cleanup. Closes all websockets and peer connections when mediastream doesn't have any observers.
     */
    #initPeerConnectionCleanup = (): void => {
        WebRTCStreamManager.sync$
            .pipe(
                delay(WebRTCStreamManager.SYNC_INTERVAL),
                filter(() => !this.mediaStream$.observed),
                take(1),
            )
            .subscribe(this.#close);
    };

    /**
     * Ensures that peer connection to mediaserver has been initialized.
     */
    #initPeerConnection = (): void => {
        this.#peerConnection ||= new MediaServerPeerConnection(
            () => this.#getOpenWebSocketConnection(),
            () => this.#closeWsConnection.next('close'),
            stream => {
                console.log(stream);
                this.mediaStream$.next([stream, null]);
            },
        );
    };

    /**
     * Do not use directly use factory WebRTCStreamManager.connect(webRtcUrlFactory) instead.
     *
     * @param webRtcUrlFactory (params: Record<string, unknown>) => string
     */
    constructor(public webRtcUrlFactory: (params?: Record<string, unknown>) => string) {
        this.start();
        this.#position$.pipe(skip(1)).subscribe(() => this.start());
        this.#initPeerConnectionCleanup();
    }
}
