import { Component, Input } from '@angular/core';

@Component({
    selector: 'nx-system-alert-card-component',
    templateUrl: 'card.component.html',
    styleUrls: ['card.component.scss']
})
export class NxSystemAlertCardComponent {
    @Input() data;
}
