import { ChangeDetectionStrategy, Component, SkipSelf } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { NxFormObserverDirective } from '@components/forms/form-observer.directive';
import { NxEscapeGlobalStyleDirective } from '@directives/escape-global-style.directive';

@Component({
    selector: 'button[nx-reset-button]',
    template: `{{ 'Cancel' | translate }}`,
    styleUrls: ['./reset-button.component.scss'],
    standalone: true,
    imports: [TranslateModule],
    hostDirectives: [NxEscapeGlobalStyleDirective],
    host: {
        '[disabled]': 'formObserver.formDisabled()',
        type: 'button',
        '(click)': 'formObserver.reset()',
    },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxResetButtonComponent {
    constructor(@SkipSelf() protected formObserver: NxFormObserverDirective) {}
}
