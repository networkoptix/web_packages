import { Component, Input } from '@angular/core';

// TODO: need to style component

@Component({
    selector: 'nx-system-alert-card-component',
    templateUrl: 'card.component.html',
    styleUrls: ['card.component.scss']
})
export class NxSystemAlertCardComponent {
    @Input() data;
}
