import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, booleanAttribute } from '@angular/core';

import { PipesModule } from '@pipes/pipes.module';
import { icons } from '@static-variables';

@Component({
    selector: 'nx-clip',
    templateUrl: 'clip.component.html',
    styleUrls: ['./clip.component.scss'],
    imports: [CommonModule, PipesModule],
    standalone: true,
})
export class ClipComponent {
    @Input() sourceUrl: string;
    @Input() posterUrl: string;
    @Input({ transform: booleanAttribute }) disableDownload: boolean;
    @Input({ transform: booleanAttribute }) disablePictureInPicture: boolean;
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
