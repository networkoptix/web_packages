import { Component, Input, OnChanges } from '@angular/core';
import { NxHealthService } from '../../health.service';


interface ThumbNail {
    loaded: boolean;
    time: string;
    url: string;
}

@Component({
    selector   : 'nx-image-section',
    templateUrl: './image-section.component.html',
    styleUrls: ['./image-section.component.scss']
})
export class NxImageSectionComponent implements OnChanges {
    @Input() cameraInfo: any;
    cameraId: string;
    ready: boolean;
    state: string;
    thumbnails: ThumbNail[];

    constructor(private healthService: NxHealthService) {
        this.thumbnails = [];
        this.ready = false;
    }

    ngOnChanges(changes: any) {
        const cameraInfo = changes.cameraInfo && changes.cameraInfo.currentValue;
        if (!cameraInfo) {
            return;
        }
        this.ready = false;
        this.cameraId = cameraInfo.id;
        this.state = cameraInfo.availability.status.text;
        this.thumbnails = Object.values(this.cameraInfo)
            .filter((cameraProd: any) => cameraProd.thumbnail)
            .map((cameraProp: any) => {
                const time = cameraProp.thumbnail.text;
                return {
                    loaded: false,
                    time,
                    url: this.healthService.system.mediaserver.previewUrl(this.cameraId, time === 'now' ? '' : time)
                };
            }).sort((a: any, b: any) => {
                if (a.time === 'now') {
                    return -1;
                } else if (b.time === 'now') {
                    return 1;
                }
                return a.time < b.time ? -1 : 1;
            });
    }


    showPreloader() {
        this.ready = this.thumbnails.every((thumbnail) => thumbnail.loaded);
    }
}
