import { Component, Input, OnInit, SimpleChange } from '@angular/core';
import { NxHealthService } from '../../health.service';

@Component({
    selector   : 'nx-thumbnail',
    templateUrl: './thumbnail.component.html',
    styleUrls: ['./thumbnail.component.scss']
})
export default class NxThumbnailComponent implements OnInit {
    @Input() cameraId: string;
    @Input() cameraState: string;
    livePreview: string;
    midnightPreview: string;
    midnightTime: any;
    noonPreview: string;
    noonTime: any;

    constructor(private healthService: NxHealthService) {}

    ngOnInit() {
    }

    ngOnChanges(changes: SimpleChange) {
        this.livePreview = '';
        this.midnightPreview = '';
        this.midnightTime = '';
        this.noonPreview = '';
        this.noonTime = '';
        this.updateThumbnails();
    }

    thumbnailError(preview) {
        switch (preview) {
            case 'midnight':
                this.midnightPreview = '';
                break;
            case 'noon':
                this.noonPreview = '';
                break;
            case 'now':
                this.livePreview = '';
                break;
        }
    }

    updateThumbnails() {
        if (typeof this.cameraId === 'undefined') {
            this.livePreview = '';
            return;
        }

        const now = new Date();
        const midnight = new Date().setHours(0, 0, 0, 0);
        const checkNoon = new Date().setHours(12, 0, 0, 0);
        let noon = checkNoon;
        // If noon has not happened for today yet take noon from yesterday.
        if (now.getTime() < checkNoon) {
            noon = new Date(now.getDate() - 1).setHours(12, 0, 0, 0);
        }

        this.midnightTime = midnight;
        this.noonTime = noon;

        this.livePreview = this.healthService.system.mediaserver.previewUrl(this.cameraId);
        this.midnightPreview = this.healthService.system.mediaserver.previewUrl(this.cameraId, midnight) + '&method=precise';
        this.noonPreview = this.healthService.system.mediaserver.previewUrl(this.cameraId, noon) + '&method=precise';
    }
}
