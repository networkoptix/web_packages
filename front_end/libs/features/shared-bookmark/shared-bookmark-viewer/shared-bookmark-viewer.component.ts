import { Component, Input, OnInit } from '@angular/core';
import dateFormat from 'dateformat';

@Component({
    selector: 'nx-shared-bookmark-viewer',
    styleUrls: ['shared-bookmark-viewer.component.scss'],
    templateUrl: 'shared-bookmark-viewer.component.html',
})
export class SharedBookmarkViewerComponent implements OnInit {
    @Input() videoSource: string;
    @Input() title: string;
    @Input() startTime: Date;
    @Input() description: string;

    dateText: string = '';
    timeText: string = '';

    ngOnInit(): void {
        this.dateText = dateFormat(this.startTime, 'mmm d, yyyy');
        this.timeText = dateFormat(this.startTime, 'h:MM TT');
    }

    // TODO: error handle
    onError(): void {
        console.error('Error loading video');
    }

    // TODO: do we need to do anything when video is loaded?
    onLoadedData(): void {
        console.info('Video loaded');
    }
}
