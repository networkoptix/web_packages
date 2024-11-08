// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { WebSocketSubject } from 'rxjs/webSocket';
import { BufferHandler, ConnectionType, SignalingMessage, StreamHandler } from './types';

export class MediaServerPeerConnection extends RTCPeerConnection {
    connectionId: string;
    timeIssueOccurred = 0;

    remoteDataChannel: RTCDataChannel;
    closed = false;
    onicecandidate = (event: RTCPeerConnectionIceEvent): void => {
        if (this.closed) {
            return;
        }
        if (event.candidate) {
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
            this.removeTrack(sender);
        });
    }

    clearDataChannel(): void {
        this.remoteDataChannel?.close();
        this.remoteDataChannel = null;
    }

    close() {
        this.closed = true;
        this.clearDataChannel();
        this.clearTracks();
        return super.close();
    }

    private get wsConnection(): WebSocketSubject<SignalingMessage> {
        return this.getWebSocket();
    }

    constructor(
        private getWebSocket: () => WebSocketSubject<SignalingMessage>,
        private closeWebsocket: () => void,
        public reconnectionHandler: (lostConnection: boolean) => void,
        trackHandler: StreamHandler,
        bufferHandler: BufferHandler,
        private getCurrentStreamAndPosition: () => { stream: 0 | 1, position: number, speed: number | 'unlimited' },
        private handleDataChannelMessage: (message: string) => void,
        public updateConnectionType: (connectionType: Partial<ConnectionType>) => void,
        private logger?: Console,
    ) {
        super();

        this.ontrack = (event: RTCTrackEvent): void => {
            this.clearTracks();
            if (event.track.kind === 'video') {
                trackHandler(event.streams[0])
            }
        };

        this.addEventListener('datachannel', ({ channel }) => {
            this.clearDataChannel();
            channel.binaryType = 'arraybuffer';
            this.logger?.info('datachannel created', { ordered: channel.ordered, maxPacketLifeTime: channel.maxPacketLifeTime, maxRetransmits: channel.maxRetransmits, protocol: channel.protocol });
            channel.addEventListener('message', ({ data }: MessageEvent<string | ArrayBuffer | { status: number }>) => {
                if (typeof(data) === 'string') {
                    this.handleDataChannelMessage(data)
                } else if ('status' in data) {
                    this.logger?.log('dc status: ' + data.status);
                    // if (webrtc.deliveryMethod != null && webrtc.deliveryMethod == 'mse') {
                    //     // Note that initial segment can be received before 200, so restarting MSE on 100.
                    //     restartMse();
                    //   }
                } else {
                    bufferHandler(data);
                }
            })
            this.remoteDataChannel = channel;
            this.remoteDataChannel.onopen = () => {
                this.remoteDataChannel.send(JSON.stringify(this.getCurrentStreamAndPosition()))
            }
        });
    }
}
