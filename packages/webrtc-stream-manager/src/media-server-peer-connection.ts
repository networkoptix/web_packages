// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { WebSocketSubject } from 'rxjs/webSocket';
import { BufferHandler, ConnectionType, SignalingMessage, StreamHandler } from './types';
import { iceServers } from './config_check_excluded';

export class MediaServerPeerConnection extends RTCPeerConnection {
    connectionId: string;

    remoteDataChannel: RTCDataChannel;
    onicecandidate = (event: RTCPeerConnectionIceEvent): void => {
        if (event.candidate) {
            this.wsConnection.next({ ice: event.candidate });
        }
    };

    oniceconnectionstatechange = (): void => {
        if (this.iceConnectionState === 'connected') {
            this.logger?.log('peerConnection connected, closing websocket');
            this.closeWebsocket();
            const  { local: { type: localCandidateType }, remote: { type: remoteCandidateType }} = this.sctp.transport.iceTransport.getSelectedCandidatePair();
            this.updateConnectionType({ localCandidateType, remoteCandidateType });
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
        super({
            iceServers,
            iceCandidatePoolSize: 10,
        });

        this.ontrack = (event: RTCTrackEvent): unknown => event.track.kind === 'video' && trackHandler(event.streams[0]);

        this.addEventListener('datachannel', ({ channel }) => {
            channel.binaryType = 'arraybuffer';
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
                    const buffer = new Uint8Array(data);
                    this.logger?.log('dc binary: type = ' + typeof(data) +  ' len = ' + buffer.length);
                    bufferHandler(new Uint8Array(data));
                }
            })
            this.remoteDataChannel = channel;
            this.remoteDataChannel.onopen = () => {
                this.remoteDataChannel.send(JSON.stringify(this.getCurrentStreamAndPosition()))
            }
        });
    }
}
