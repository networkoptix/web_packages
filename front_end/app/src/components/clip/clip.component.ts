import { Component, Input } from '@angular/core';

import { NxConfigService } from '@services/nx-config';

@Component({
    selector: 'clip',
    templateUrl: 'clip.component.html',
    styleUrls: ['./clip.component.scss']
})
export class ClipComponent {
    @Input() sourceUrl: string;
    @Input() posterUrl: string;

    readonly internalPoster: string;
    posterLoadingError = false;

    constructor(config: NxConfigService) {
        this.internalPoster = config.getConfig()?.icons.dirNonStandardView + 'placeholder_camera_offline.svg';
    }

    handler(e) {
        switch (e.type) {
            case 'error':
                this.posterLoadingError = true;
                break;
            case 'loadeddata':
                this.posterLoadingError = false;
                break;
            default:
                break;
        }
    }
}
