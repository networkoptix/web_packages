// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { WebSocketSubject } from 'rxjs/webSocket';
import { SignalingMessage, StreamHandler } from './types';
import { iceServers } from './config_check_excluded';

export class MediaServerPeerConnection extends RTCPeerConnection {
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
    ) {
        super({
            iceServers,
        });

        this.ontrack = (event: RTCTrackEvent): unknown => trackHandler(event.streams[0]);
    }
}
