import { ChangeDetectionStrategy, Component } from '@angular/core';

import { NxEscapeGlobalStyleDirective } from '@directives/escape-global-style.directive';

@Component({
    selector: 'label[nx-label]',
    template: `<ng-content></ng-content>`,
    styleUrls: ['label.component.scss'],
    standalone: true,
    hostDirectives: [NxEscapeGlobalStyleDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxLabelComponent {}
