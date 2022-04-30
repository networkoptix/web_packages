import { Component, Input } from '@angular/core';

@Component({
    selector: 'clip',
    templateUrl: 'clip.component.html',
    styleUrls: ['./clip.component.scss']
})
export class ClipComponent {
    @Input() sourceUrl: string;
    @Input() posterUrl: string;

    loadingError = false;
}
