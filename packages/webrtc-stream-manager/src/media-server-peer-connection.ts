// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { WebSocketSubject } from 'rxjs/webSocket';
import { BufferHandler, ConnectionType, SignalingMessage, StreamHandler } from './types';
import { asapScheduler, debounceTime, Subject } from 'rxjs';

import { iceServers } from './config_check_excluded';

export class MediaServerPeerConnection extends RTCPeerConnection {
    connectionId: string;
    timeIssueOccurred = 0;

    remoteDataChannel: RTCDataChannel;
    closed = false;

    // Store data channel event handlers for cleanup
    private dataChannelMessageHandler: ((event: MessageEvent<string | ArrayBuffer | { status: number }>) => void) | null = null;
    private dataChannelOpenHandler: (() => void) | null = null;
    onicecandidate = (event: RTCPeerConnectionIceEvent): void => {
        if (this.closed) {
            return;
        }
        if (event.candidate && this.wsConnection) {
            this.wsConnection.next({ ice: event.candidate });
        }
    };

    oniceconnectionstatechange = (): void => {
        if (this.closed) {
            return;
        }
        if (this.iceConnectionState === 'connected') {
            this.logger?.log('peerConnection connected, closing websocket');
            this.closeWebsocket();
            const  {
                local: { type: localCandidateType, address: localIp, port: localPort, protocol: localProtocol },
                remote: { type: remoteCandidateType, address: remoteIp, port: remotePort, protocol: remoteProtocol },
            } = this.sctp.transport.iceTransport.getSelectedCandidatePair();
            const localAddress = `${localProtocol} ${localIp}:${localPort}`;
            const remoteAddress = `${remoteProtocol} ${remoteIp}:${remotePort}`;
            this.updateConnectionType({ localCandidateType, remoteCandidateType, localAddress, remoteAddress });
        } else if (this.iceConnectionState === 'disconnected') {
            this.logger?.log('peerConnection disconnected, reconnecting websocket');
            this.reconnectionHandler(false);
        } else if (this.iceConnectionState === 'failed') {
            this.logger?.log('peerConnection failed, reconnecting websocket');
            this.reconnectionHandler(true);
        } else {
            this.logger?.log('peerConnection ice state ' + this.iceConnectionState);
        }
    };

    clearTracks(): void {
        this.getSenders().forEach(sender => {
            sender.track?.stop();
            if (this.signalingState === 'closed') {
                return;
            }
            this.removeTrack(sender);
        });
    }

    clearDataChannel(): void {
        if (this.remoteDataChannel) {
            // Remove event listeners before closing
            if (this.dataChannelMessageHandler) {
                this.remoteDataChannel.removeEventListener('message', this.dataChannelMessageHandler);
                this.dataChannelMessageHandler = null;
            }
            if (this.dataChannelOpenHandler) {
                this.remoteDataChannel.removeEventListener('open', this.dataChannelOpenHandler);
                this.dataChannelOpenHandler = null;
            }
            this.remoteDataChannel.close();
            delete this.remoteDataChannel;
        }
    }

    static forceGarbageCollection = (() => {
        const updater$ = new Subject<void>()

        // updater$.pipe(debounceTime(500, asapScheduler)).subscribe(() => {
        //     let img = document.createElement("img");
        //     img.src = URL.createObjectURL(new Blob([new ArrayBuffer(5e+7)]));
        //     img.onerror = function() {
        //       URL.revokeObjectURL(this.src);
        //       img = null
        //     }
        // });

        return () => updater$.next();
    })();

    close() {
        this.closed = true;
        this.removeEventListener('datachannel', this.initDataChannel);
        this.clearDataChannel();
        this.clearTracks();
        delete this.getWebSocket;
        delete this.closeWebsocket;
        delete this.reconnectionHandler;
        delete this.getCurrentStreamAndPosition;
        delete this.handleDataChannelMessage;
        delete this.updateConnectionType;
        delete this.logger;
        delete this.ontrack;
        delete this.onicecandidate;
        delete this.bufferHandler;
        delete this.initDataChannel
        MediaServerPeerConnection.forceGarbageCollection();

        return super.close();
    }

    private get wsConnection(): WebSocketSubject<SignalingMessage> {
        return this.getWebSocket();
    }

    private initDataChannel = ({ channel }: RTCDataChannelEvent) => {
        this.clearDataChannel();
        channel.binaryType = 'arraybuffer';
        this.logger?.info('datachannel created', { ordered: channel.ordered, maxPacketLifeTime: channel.maxPacketLifeTime, maxRetransmits: channel.maxRetransmits, protocol: channel.protocol });

        // Counters for diagnostic logging
        let binaryMessageCount = 0;
        let stringMessageCount = 0;
        let lastBinaryLogTime = Date.now();

        // Store message handler reference for cleanup
        this.dataChannelMessageHandler = ({ data }: MessageEvent<string | ArrayBuffer | { status: number }>) => {
            if (!this.handleDataChannelMessage || !this.bufferHandler) {
                return this.close();
            }
            if (typeof(data) === 'string') {
                stringMessageCount++;
                this.handleDataChannelMessage(data)
            } else if ('status' in data) {
                this.logger?.log('dc status: ' + data.status);
                // if (webrtc.deliveryMethod != null && webrtc.deliveryMethod == 'mse') {
                //     // Note that initial segment can be received before 200, so restarting MSE on 100.
                //     restartMse();
                //   }
            } else {
                binaryMessageCount++;
                // Log binary data stats every 5 seconds
                const now = Date.now();
                if (now - lastBinaryLogTime > 5000) {
                    this.logger?.info(`DC message stats: binary=${binaryMessageCount}, string=${stringMessageCount}, lastBinarySize=${(data as ArrayBuffer).byteLength}`);
                    lastBinaryLogTime = now;
                }
                this.bufferHandler(data);
            }
        };
        channel.addEventListener('message', this.dataChannelMessageHandler);

        // Store open handler reference for cleanup
        this.dataChannelOpenHandler = () => {
            this.remoteDataChannel.send(JSON.stringify(this.getCurrentStreamAndPosition()))
        };

        this.remoteDataChannel = channel;
        this.remoteDataChannel.addEventListener('open', this.dataChannelOpenHandler);
    }

    constructor(
        private getWebSocket: () => WebSocketSubject<SignalingMessage>,
        private closeWebsocket: () => void,
        public reconnectionHandler: (lostConnection: boolean) => void,
        trackHandler: StreamHandler,
        private bufferHandler: BufferHandler,
        private getCurrentStreamAndPosition: () => { stream: 0 | 1, position: number, speed: number | 'unlimited' },
        private handleDataChannelMessage: (message: string) => void,
        public updateConnectionType: (connectionType: Partial<ConnectionType>) => void,
        private logger?: Console,
    ) {
        super({
            iceServers
        });

        this.ontrack = (event: RTCTrackEvent): void => {
            if (event.track.kind === 'video') {
                this.clearTracks();
                trackHandler(event.streams[0]);
            } else if (event.track.kind === 'audio') {
                // AAC audio tracks on mediaserver 6.1+ arrive in separate ontrack events.
                // event.streams[0] is the same MediaStream shared by both tracks,
                // so the video handler already forwarded it — the audio track is
                // automatically part of that stream. We just need to avoid clearing it.
                this.logger?.log('audio track received, streams:', event.streams.length);
            }
        };

        this.addEventListener('datachannel', this.initDataChannel);
        MediaServerPeerConnection.forceGarbageCollection();
    }
}
