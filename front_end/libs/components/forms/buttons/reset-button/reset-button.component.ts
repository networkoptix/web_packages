import { ChangeDetectionStrategy, Component, input, SkipSelf } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import type { NxFormResetFn } from '@components/forms/apply-v3/apply-v3.types';
import { NxFormObserverDirective } from '@components/forms/form-observer.directive';
import { NxEscapeGlobalStyleDirective } from '@directives/escape-global-style.directive';

@Component({
    selector: 'button[nx-reset-button]',
    template: `{{ text() || ('Cancel' | translate) }}`,
    styleUrls: ['./reset-button.component.scss'],
    standalone: true,
    imports: [TranslateModule],
    hostDirectives: [NxEscapeGlobalStyleDirective],
    host: {
        '[disabled]': 'formObserver.formDisabled()',
        type: 'button',
        '(click)': 'resetFn()(formObserver)',
    },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxResetButtonComponent {
    private reset = (): void => {
        this.formObserver.reset();
    };
    resetFn = input<NxFormResetFn, NxFormResetFn | undefined>(this.reset, {
        transform: v => v ?? this.reset,
    });
    text = input<string>();

    constructor(@SkipSelf() protected formObserver: NxFormObserverDirective) {}
}
