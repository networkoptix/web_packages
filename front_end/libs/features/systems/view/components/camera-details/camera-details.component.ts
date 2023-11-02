import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { ClipboardService } from 'ngx-clipboard';

import staticLang from '@language_static';
import type { MediaStream } from '@services/system.service/camera-manager/add-params.types';

import type { ViewCamera } from '../../datatypes/Camera';

interface ITransport {
    name: string;
    url: string;
}

interface ICameraDetails {
    name: string;
    transports: ITransport[];
}

@Component({
    selector: 'nx-camera-details',
    templateUrl: 'camera-details.component.html',
    styleUrls: ['camera-details.component.scss'],
})
export class NxCameraDetailsComponent implements OnChanges {
    @Input() camera: ViewCamera;
    @Output() close = new EventEmitter<void>();

    LANG = staticLang;
    cameraDetails: ICameraDetails[];
    cameraUrl: string;
    currentUrl: string;

    constructor(private clipboardService: ClipboardService) {}

    ngOnChanges(): void {
        if (this.camera) {
            this.cameraUrl = this.camera.url;
            if (!this.cameraUrl.includes('//')) {
                this.cameraUrl = `//${this.cameraUrl}`;
            }
            this.currentUrl = window.location.href;
            const mediaStreams = this.camera.mediaStreams;
            const findIndexTransports = (index: number): MediaStream | undefined =>
                mediaStreams.find(({ encoderIndex }) => index === encoderIndex);

            const calcTransportUrls = (stream: MediaStream): Array<ITransport> => {
                // TODO: convert reduce to map
                return (
                    stream?.transports.reduce((urls: ITransport[], transport) => {
                        const resolutions =
                            this.camera.availableTransportsAndResolutions[transport];
                        let resolution = '';
                        switch (transport) {
                            case 'rtsp':
                                resolution = stream.encoderIndex.toString();
                                break;
                            case 'hls':
                                resolution = stream.encoderIndex === 1 ? 'lo' : 'hi';
                                break;
                            default:
                                resolution =
                                    stream.encoderIndex === 1 ? resolutions.low : resolutions.high;
                        }
                        urls.push({
                            name: transport,
                            url: this.camera.getVideoUrl(transport, resolution),
                        });
                        return urls;
                    }, []) || []
                );
            };

            this.cameraDetails = [
                {
                    name: this.LANG.common.cameraLinks.lowStream,
                    transports: calcTransportUrls(findIndexTransports(1)),
                },
                {
                    name: this.LANG.common.cameraLinks.highStream,
                    transports: calcTransportUrls(findIndexTransports(0)),
                },
                {
                    name: this.LANG.common.cameraLinks.transcoding,
                    transports: calcTransportUrls(findIndexTransports(-1)),
                },
            ];
        }
    }

    emitClose(): void {
        this.close.emit();
    }

    copyOnClick(data: string): void {
        this.clipboardService.copy(data);
    }
}
