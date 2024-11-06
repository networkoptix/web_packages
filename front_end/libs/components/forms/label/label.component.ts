import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'label[nx-label]',
    template: `<ng-content></ng-content>`,
    styleUrls: ['label.component.scss'],
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxLabelComponent {}
