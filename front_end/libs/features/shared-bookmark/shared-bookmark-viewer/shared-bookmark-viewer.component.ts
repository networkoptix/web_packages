import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { ClipComponent } from '@components/clip/clip.component';
import { nxConfig } from '@services/nx-config/config';
import { NxLanguageProviderService } from '@services/nx-language-provider';

@Component({
    selector: 'nx-shared-bookmark-viewer',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrls: ['shared-bookmark-viewer.component.scss'],
    templateUrl: 'shared-bookmark-viewer.component.html',
    imports: [CommonModule, ClipComponent],
})
export class SharedBookmarkViewerComponent {
    videoSource = input.required<string>();
    startTime = input<Date>(new Date());
    title = input<string>('');
    description = input<string>('');

    languageProvider = inject(NxLanguageProviderService);
    dateText = computed(() =>
        Intl.DateTimeFormat(this.languageProvider.currentLocale, { dateStyle: 'medium' }).format(
            this.startTime(),
        ),
    );
    timeText = computed(() =>
        Intl.DateTimeFormat(this.languageProvider.currentLocale, {
            hour: 'numeric',
            minute: 'numeric',
            numberingSystem: 'latn',
        }).format(this.startTime()),
    );

    // TODO: error handle
    onError(): void {
        console.error('Error loading video');
    }

    // TODO: do we need to do anything when video is loaded?
    onLoadedData(): void {
        console.info('Video loaded');
    }

    CONFIG = nxConfig;
}
