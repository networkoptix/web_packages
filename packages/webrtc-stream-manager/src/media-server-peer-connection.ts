// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { WebSocketSubject } from 'rxjs/webSocket';
import { BufferHandler, SignalingMessage, StreamHandler } from './types';
import { iceServers } from './config_check_excluded';

export class MediaServerPeerConnection extends RTCPeerConnection {
    remoteDataChannel: RTCDataChannel;
    onicecandidate = (event: RTCPeerConnectionIceEvent): void => {
        if (event.candidate) {
            this.wsConnection.next({ ice: event.candidate });
        }
    };

    oniceconnectionstatechange = (): void => {
        if (this.iceConnectionState === 'connected') {
            console.log('peerConnection connected, closing websocket');
            this.closeWebsocket();
        } else if (this.iceConnectionState === 'disconnected') {
            console.log('peerConnection disconnected, reconnecting websocket');
            this.reconnectionHandler(true);
        } else {
            console.log('peerConnection ice state ' + this.iceConnectionState);
        }
    };

    private get wsConnection(): WebSocketSubject<SignalingMessage> {
        return this.getWebSocket();
    }

    constructor(
        private getWebSocket: () => WebSocketSubject<SignalingMessage>,
        private closeWebsocket: () => void,
        private reconnectionHandler: (lostConnection: number | true) => void,
        trackHandler: StreamHandler,
        bufferHandler: BufferHandler,
    ) {
        super({
            iceServers,
        });

        this.ontrack = (event: RTCTrackEvent): unknown => event.track.kind === 'video' && trackHandler(event.streams[0]);

        this.addEventListener('datachannel', ({ channel }) => {
            channel.binaryType = 'arraybuffer';
            channel.addEventListener('message', ({ data }: MessageEvent<string | ArrayBuffer | { status: number }>) => {
                if (typeof(data) === 'string') {
                    console.log('dc message: ' + data);
                } else if ('status' in data) {
                    console.log('dc status: ' + data.status);
                    // if (webrtc.deliveryMethod != null && webrtc.deliveryMethod == 'mse') {
                    //     // Note that initial segment can be received before 200, so restarting MSE on 100.
                    //     restartMse();
                    //   }
                } else {
                    const buffer = new Uint8Array(data);
                    console.log('dc binary: type = ' + typeof(data) +  ' len = ' + buffer.length);
                    bufferHandler(new Uint8Array(data));
                }
            })
            this.remoteDataChannel = channel;
        });
    }
}
