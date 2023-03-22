import { Component, EventEmitter, Input, Output } from '@angular/core';

import { CoercedBoolInput, IBool } from '@decorators/ibool';
import { icons } from '@lib/variables/static-variables';

@Component({
    selector: 'nx-clip',
    templateUrl: 'clip.component.html',
    styleUrls: ['./clip.component.scss'],
})
export class ClipComponent {
    @Input() sourceUrl: string;
    @Input() posterUrl: string;
    @IBool() @Input() disableDownload: CoercedBoolInput;
    @Output() error = new EventEmitter<void>();

    readonly internalPoster: string;
    posterLoadingError = false;

    constructor() {
        this.internalPoster = icons.dirNonStandardView + 'placeholder_camera_offline.svg';
    }

    handler(e: ErrorEvent | Event): void {
        switch (e.type) {
            case 'error':
                this.posterLoadingError = true;
                this.error.emit();
                break;
            case 'loadeddata':
                this.posterLoadingError = false;
                break;
            default:
                break;
        }
    }
}
