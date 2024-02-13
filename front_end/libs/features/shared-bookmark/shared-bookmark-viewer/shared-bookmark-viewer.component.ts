import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import dateFormat from 'dateformat';

import { ClipComponent } from '@components/clip/clip.component';

@Component({
    selector: 'nx-shared-bookmark-viewer',
    standalone: true,
    styleUrls: ['shared-bookmark-viewer.component.scss'],
    templateUrl: 'shared-bookmark-viewer.component.html',
    imports: [CommonModule, ClipComponent],
})
export class SharedBookmarkViewerComponent {
    videoSource$$ = input.required<string>({ alias: 'videoSource' });
    startTime$$ = input<Date>(new Date(), { alias: 'startTime' });
    title$$ = input<string>('', { alias: 'title' });
    description$$ = input<string>('', { alias: 'description' });

    dateText$$ = computed(() => dateFormat(this.startTime$$(), 'mmm d, yyyy'));
    timeText$$ = computed(() => dateFormat(this.startTime$$(), 'h:MM TT'));

    // TODO: error handle
    onError(): void {
        console.error('Error loading video');
    }

    // TODO: do we need to do anything when video is loaded?
    onLoadedData(): void {
        console.info('Video loaded');
    }
}
