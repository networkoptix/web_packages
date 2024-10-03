import { CommonModule } from '@angular/common';
import { Component, computed, input, SkipSelf } from '@angular/core';

import { NxFormObserverDirective } from '@components/forms/form-observer.directive';
import { AsyncAction } from '@dialogs/async-action-button/create-async-action';

import { NxAsyncSubmitButtonComponent } from '../buttons/async-submit-button/async-submit-button.component';
import { NxResetButtonComponent } from '../buttons/reset-button/reset-button.component';

import type { NxFormResetFn } from './apply-v3.types';

@Component({
    selector: 'nx-apply-v3',
    templateUrl: 'apply-v3.component.html',
    styleUrls: ['apply-v3.component.scss'],
    standalone: true,
    imports: [CommonModule, NxAsyncSubmitButtonComponent, NxResetButtonComponent],
    host: {
        '[style.--action-button-flex-order]': 'actionButtonFlexOrder()',
        '[style.display]': 'display()',
        '[style.visibility]': 'visibility()',
    },
})
export class NxApplyV3Component<T> {
    action = input.required<AsyncAction<T>>();
    resetFn = input<NxFormResetFn>();
    actionButtonJustify = input<'start' | 'end'>('start');
    protected actionButtonFlexOrder = computed<0 | 1>(() =>
        this.actionButtonJustify() === 'start' ? 0 : 1,
    );

    /** How to behave when the form value hasn't changed
     * 1. Collapse and don't take up any space
     * 2. Make the buttons invisible, but keep their place in the layout
     *
     * Could also allow custom content from template in future, but not needed yet
     */
    unchangedBehavior = input<'collapse' | 'hidden'>('collapse');
    protected formChanged = this.formObserver.formChanged.asReadonly();
    protected display = computed(() =>
        !this.formChanged() && this.unchangedBehavior() === 'collapse' ? 'none' : undefined,
    );
    protected visibility = computed(() =>
        !this.formChanged() && this.unchangedBehavior() === 'hidden' ? 'hidden' : undefined,
    );

    constructor(@SkipSelf() private formObserver: NxFormObserverDirective) {}
}
