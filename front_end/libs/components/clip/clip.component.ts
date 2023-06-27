import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { CoercedBoolInput, IBool } from '@decorators/ibool';
import { icons } from '@lib/variables/static-variables';
import { PipesModule } from '@pipes/pipes.module';
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
    @IBool() @Input() disableDownload: CoercedBoolInput;
    @IBool() @Input() disablePictureInPicture: CoercedBoolInput;
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
