import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, booleanAttribute } from '@angular/core';

import { PipesModule } from '@pipes/pipes.module';
import { icons } from '@static-variables';
import { VmsClientPlaybackModule } from '@vms-client/submodules/playback/playback.module';

@Component({
    selector: 'nx-clip',
    templateUrl: 'clip.component.html',
    styleUrls: ['./clip.component.scss'],
    imports: [CommonModule, PipesModule, VmsClientPlaybackModule],
    standalone: true,
})
export class ClipComponent {
    @Input() sourceUrl: string;
    @Input() posterUrl: string;
    @Input({ transform: booleanAttribute }) disableDownload: boolean;
    @Input({ transform: booleanAttribute }) disablePictureInPicture: boolean;
    @Input({ transform: booleanAttribute }) autoplay: boolean;
    @Output() error = new EventEmitter<void>();
    @Output() loadeddata = new EventEmitter<void>();

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
                this.loadeddata.emit();
                break;
            default:
                break;
        }
    }
}
