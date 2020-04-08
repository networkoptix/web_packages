import { Component, Input } from '@angular/core';
import { AutoUnsubscribe } from 'ngx-auto-unsubscribe';

@AutoUnsubscribe()
@Component({
    selector    : 'nx-motion-detection-overlay',
    templateUrl : 'motion-detection-overlay.component.html',
    styleUrls   : ['motion-detection-overlay.component.scss']
})
export class NxMotionDetectionOverlay {
    @Input() height: number;
    @Input() width: number;
    @Input() initialMask: string;

    ngOnDestroy() {}
}
