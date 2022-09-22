import { Component, Input, Output, EventEmitter, OnChanges, Inject } from '@angular/core';
import { ClipboardService } from 'ngx-clipboard';

import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { WINDOW } from '@services/window-provider';

import { ICamera, MediaStreamInfo } from '../../vms-client/submodules/vms/datatypes/ICamera';

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
    styleUrls: ['camera-details.component.scss']
})
export class NxCameraDetailsComponent implements OnChanges {
    @Input() camera: ICamera;
    @Output() close = new EventEmitter<void>();

    LANG: LanguageI18NStaticTypes;
    cameraDetails: ICameraDetails[];
    cameraUrl: string;
    currentUrl: string;

    constructor(
        languageService: NxLanguageProviderService,
        private clipboardService: ClipboardService,
        @Inject(WINDOW) private window: Window
    ) {
        this.LANG = languageService.translations;
    }

    ngOnChanges(): void {
        if (this.camera) {
            this.cameraUrl = this.camera.url;
            if (!this.cameraUrl.includes('//')) {
                this.cameraUrl = `//${this.cameraUrl}`;
            }
            this.currentUrl = this.window.location.href;
            const mediaStreams = this.camera.mediaStreams;
            const findIndexTransports = (index: number): MediaStreamInfo | undefined => mediaStreams
                .find(({ encoderIndex }) => index === encoderIndex);

            const calcTransportUrls = (stream: MediaStreamInfo): Array<ITransport> => {
                // TODO: convert reduce to map
                return stream?.transports.reduce((urls: ITransport[], transport) => {
                    const resolutions: { [key: string]: string } = this.camera.availableTransportsAndResolutions[transport];
                    let resolution = '';
                    switch (transport) {
                        case 'rtsp':
                            resolution = stream.encoderIndex.toString();
                            break;
                        case 'hls':
                            resolution = stream.encoderIndex === 1 ? 'lo' : 'hi';
                            break;
                        default:
                            resolution = stream.encoderIndex === 1 ? resolutions.low : resolutions.high;
                    }
                    urls.push({ name: transport, url: this.camera.getVideoUrl(transport, resolution) });
                    return urls;
                }, []) || [];
            };

            this.cameraDetails = [
                {
                    name: this.LANG.common.cameraLinks.lowStream(),
                    transports: calcTransportUrls(findIndexTransports(1))
                }, {
                    name: this.LANG.common.cameraLinks.highStream(),
                    transports: calcTransportUrls(findIndexTransports(0))
                }, {
                    name: this.LANG.common.cameraLinks.transcoding(),
                    transports: calcTransportUrls(findIndexTransports(-1))
                }
            ];
        }
    }

    public emitClose(): void {
        this.close.emit();
    }

    public copyOnClick(data: string): void {
        this.clipboardService.copy(data);
    }
}
