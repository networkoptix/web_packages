import { WebSocketSubject } from 'rxjs/webSocket';
import { SignalingMessage, StreamHandler } from './types';

export class MediaServerPeerConnection extends RTCPeerConnection {
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
        trackHandler: StreamHandler
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
