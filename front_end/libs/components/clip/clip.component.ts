import { CommonModule } from '@angular/common';
import { Component, EventEmitter, input, Output, signal } from '@angular/core';

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
    readonly internalPoster = icons.dirNonStandardView + 'placeholder_camera_offline.svg';

    sourceUrl = input.required<string>();
    posterUrl = input.required<string>();
    disableDownload = input(false, {
        transform: (v: string | boolean) => Boolean(v),
    });
    disablePictureInPicture = input(false, {
        transform: (v: string | boolean) => Boolean(v),
    });
    autoplay = input(false, {
        transform: (v: string | boolean) => Boolean(v),
    });

    @Output() error = new EventEmitter<void>();
    @Output() loadeddata = new EventEmitter<void>();

    posterLoadingError = signal(false);

    handler(e: ErrorEvent | Event): void {
        switch (e.type) {
            case 'error':
                this.posterLoadingError.set(true);
                this.error.emit();
                break;
            case 'loadeddata':
                this.posterLoadingError.set(false);
                this.loadeddata.emit();
                break;
            default:
                break;
        }
    }
}
