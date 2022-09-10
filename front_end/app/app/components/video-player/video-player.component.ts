/* eslint-disable */
import { Component, ElementRef, Input, ViewChild, ViewContainerRef } from '@angular/core';
import { Player } from '@vime/angular';
import { filter, map, shareReplay } from 'rxjs/operators';
import { v4 as uuid } from 'uuid';

import { IBool, CoercedBoolInput } from '@decorators/ibool';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxPlaybackSyncService } from '@services/playback-sync.service';
import { ICamera } from '@services/system.service/camera-manager/camera-manager-types';

@Component({
    selector: 'nx-video-player',
    templateUrl: 'video-player.component.html',
    styleUrls: ['video-player.component.scss']
})
export class NxVideoPlayerComponent {
    @Input() camera: ICamera;
    @IBool() @Input() controls: CoercedBoolInput = false;
    @IBool() @Input() autoplay: CoercedBoolInput = false;
    @IBool() @Input() autopause: CoercedBoolInput = false;

    @ViewChild('player') player: Player;
    @ViewChild('webRtcPlayer') webRtcPlayer: ElementRef<HTMLVideoElement>;

    CONFIG: IConfig;
    playerId: string;
    offset = 0;
    posterSrc = '';
    previousPosterSrc = '';
    webRtcUrl = '';

    hlsConfig = {
        capLevelToPlayerSize: true,
        capLevelOnFPSDrop: true,
        // debug: true,
        nudgeMaxRetry: 10,
        liveSyncDurationCount: 10,
        forceKeyFrameOnDiscontinuity: false
    };

    #time$ = this.playbackSync.currentTime$.pipe(
        map(time => {
            const playerTime = this.player?.currentTime || 0;
            const timeAhead = !this.player || !this.player.buffered || !this.player.playing ? 1 : playerTime - time;
            return { time, timeAhead };
        }),
        shareReplay({ bufferSize: 1, refCount: true })
    );

    currentTime$ = this.#time$.pipe(
        filter(({ timeAhead }) => Math.abs(timeAhead) > this.playbackSync.maxDeviationFromLive),
        map(({ time }) => time)
    );

    playbackRate$ = this.#time$.pipe(
        // filter(({ timeAhead }) => inRange(Math.abs(timeAhead), this.playbackSync.allowableDeviationFromLive, this.playbackSync.maxDeviationFromLive)),
        map(({ timeAhead }) => {
            const targetRate = 1 + (timeAhead / this.playbackSync.syncInterval);

            const playbackRate = this.player.playbackRates.reduce((best, current) => {
                const bestDiff = best > targetRate ? best - targetRate : targetRate - best;
                const currentDiff = current > targetRate ? current - targetRate : targetRate - current;
                return bestDiff < currentDiff ? best : current;
            }, 1);
            return playbackRate;
        }),
    );

    enterFullscreen(): void {
        console.log(this.player.isLive);
        this.player.enterFullscreen();
    }

    updateHash(cacheCurrent = false): void {
        if (cacheCurrent) {
            this.previousPosterSrc = this.posterSrc;
        } else if (this.posterSrc && this.previousPosterSrc === this.posterSrc) {
            return;
        } else {
            this.posterSrc = this.previousPosterSrc;
        }
        const [url, _params] = this.camera.previewUrl.split('?');
        const params = new URLSearchParams(_params);
        params.set('width', this.viewRef.element.nativeElement.clientWidth);
        params.set('height', this.viewRef.element.nativeElement.clientHeight);
        params.set('hash', uuid());
        const backToString = params.toString();
        this.playbackSync.queuePosterUpdate(this, `${url}?${backToString}`);
    }

    constructor(
        configService: NxConfigService,
        public playbackSync: NxPlaybackSyncService,
        private readonly viewRef: ViewContainerRef
    ) {
        this.CONFIG = configService.config;
        this.playerId = uuid();
        this.playbackSync.register(this);
    }

    ngOnInit(): void {
        this.updateHash();
        this.webRtcUrl = this.camera.webRtcUrl;
    }

    ngAfterViewInit(): void {
        let peerConnection;

        const peerConnectionConfig = {
            iceServers: [
                { 'urls': 'stun:stun.stunprotocol.org:3478' },
                { 'urls': 'stun:stun.l.google.com:19302' },
                { 'urls': 'stun:stun1.l.google.com:19302' },
                { 'urls': 'stun:stun1.l.google.com:19302' },
            ]
        };

        const serverConnection = new WebSocket(this.webRtcUrl);
        serverConnection.onmessage = gotMessageFromServer;

        // const constraints = {
        //     video: true,
        //     audio: true,
        // };

        const start = () => {
            peerConnection = new RTCPeerConnection(peerConnectionConfig);
            peerConnection.onicecandidate = gotIceCandidate;
            peerConnection.ontrack = event => {
                this.webRtcPlayer.nativeElement.srcObject = event.streams[0];
                // setTimeout(() => {
                // }, 1000);
            };
            peerConnection.oniceconnectionstatechange = () => {
                console.log('peerConnection ice state ' + peerConnection.iceConnectionState);
            };
        };

        function gotMessageFromServer(message) {
            if (!peerConnection) start();

            const signal = JSON.parse(message.data);

            if (signal.sdp) {
                peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function () {
                    // Only create answers in response to offers
                    if (signal.sdp.type == 'offer') {
                        peerConnection.createAnswer().then(createdDescription).catch(errorHandler);
                    }
                }).catch(errorHandler);
            } else if (signal.ice) {
                peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(errorHandler);
            }
        }

        function gotIceCandidate(event) {
            if (event.candidate != null) {
                serverConnection.send(JSON.stringify({ ice: event.candidate }));
            }
        }

        function createdDescription(description) {
            console.log('got description');

            peerConnection.setLocalDescription(description).then(function () {
                serverConnection.send(JSON.stringify({ sdp: peerConnection.localDescription }));
            }).catch(errorHandler);
        }

        function errorHandler(error): void {
            console.log(error);
            start();
            serverConnection.send(JSON.stringify({ error }));
        }
    }

    ngOnDestroy(): void {
        this.playbackSync.unregister(this);
    }
}
