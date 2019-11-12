import { Component, Input, OnInit, SimpleChange } from '@angular/core';
import { NxHealthService } from '../../health.service';

@Component({
    selector   : 'nx-image-section',
    templateUrl: './image-section.component.html',
    styleUrls: ['./image-section.component.scss']
})
export class NxImageSectionComponent implements OnInit {
    @Input() cameraId: string;
    @Input() cameraState: string;
    liveLoaded: boolean;
    livePreview: string;
    midnightLoaded: boolean;
    midnightPreview: string;
    midnightTime: any;
    noonLoaded: boolean;
    noonPreview: string;
    noonTime: any;

    constructor(private healthService: NxHealthService) {}

    ngOnInit() {
    }

    ngOnChanges(changes: SimpleChange) {
        this.liveLoaded = false;
        this.livePreview = '';
        this.midnightLoaded = false;
        this.midnightPreview = '';
        this.midnightTime = '';
        this.noonLoaded = false;
        this.noonPreview = '';
        this.noonTime = '';
        this.updateThumbnails();
    }

    updateThumbnails() {
        if (typeof this.cameraId === 'undefined') {
            return;
        }

        if (this.cameraState !== 'Online') {
            this.liveLoaded = true;
        }

        const now = new Date();
        this.midnightTime = now.getTime();
        this.noonTime = now.getTime();

        this.livePreview = this.healthService.system.mediaserver.previewUrl(this.cameraId);
        this.midnightPreview = this.healthService.system.mediaserver.previewUrl(this.cameraId, this.midnightTime);
        this.noonPreview = this.healthService.system.mediaserver.previewUrl(this.cameraId, this.noonTime);
    }
}
