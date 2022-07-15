import { Component, Input } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Component({
    selector: 'nx-additional-systems-tile',
    templateUrl: 'additional-systems-tile.component.html',
    styleUrls: ['additional-systems-tile.component.scss']
})
export class NxAdditionalSystemsTileComponent {
    @Input() additionalSystems$: BehaviorSubject<number>;
    @Input() width: number = 240;
}
