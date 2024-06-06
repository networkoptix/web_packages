import { CommonModule } from '@angular/common';
import {
    AfterContentInit,
    ChangeDetectionStrategy,
    Component,
    ContentChild,
    DestroyRef,
    SkipSelf,
    effect,
    forwardRef,
    input,
    signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroupDirective, NgControl } from '@angular/forms';
import { merge, take } from 'rxjs';

import { NxControlMessagesComponent as NxMessages } from '../control-messages/control-messages.component';

import { ControlState, ErrorMatcher, requiredErrorMatcher } from './error-state-matcher';
import { NxFormFieldControlDirective as NxControlDirective } from './form-field-control.directive';
import { NxFormFieldToken } from './form-field.token';

/** A component used to wrap a form control element and handle error states.
 *
 * Based on [Material form field](https://material.angular.io/components/form-field/overview).
 *
 * "field" refers to the wrapper element and "control" refers to the
 * component that the field is wrapping.
 *
 * Used with three child components:
 * 1. `nx-label` for the control (required)
 * 2. The control with `NxControlDirective` (required)
 * 3. `nx-control-messages` for control state messages (optional)
 */
@Component({
    selector: 'nx-form-field',
    templateUrl: 'form-field.component.html',
    styleUrls: ['form-field.component.scss'],
    standalone: true,
    imports: [CommonModule],
    providers: [
        {
            provide: NxFormFieldToken,
            useExisting: forwardRef(() => NxFormFieldComponent),
        },
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxFormFieldComponent implements AfterContentInit {
    /** A function for when to display errors.
     *
     * See `error-state-matcher.ts`.
     *
     * A custom matcher is required for automatic matching of custom errors
     */
    errorMatcher = input<ErrorMatcher>(requiredErrorMatcher);

    @ContentChild(NxControlDirective) private nxControlDirective: NxControlDirective;
    @ContentChild(NgControl) private ngControl: NgControl;

    @ContentChild(NxMessages) protected set _messages(messages: NxMessages) {
        this.hasMessages.set(!!messages);
    }
    hasMessages = signal(false);

    errorState = signal<ControlState | null>(null);
    protected _errorStateEffect = effect(() => {
        const errorState = this.errorState();
        const classList = this.nxControlDirective.host.nativeElement.classList;
        if (errorState) {
            classList.add('nx-form-field__control--error');
        } else {
            classList.remove('nx-form-field__control--error');
        }
        /* The field notifies the control for error state styling by attaching this
        class to the host element. It's the control's responsibility to do it's
        own styling for error state */
    });

    constructor(
        private destroyRef: DestroyRef,
        @SkipSelf() private formGroup: FormGroupDirective,
    ) {}

    ngAfterContentInit(): void {
        merge(this.formGroup.ngSubmit.pipe(take(1)), this.ngControl.statusChanges!)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                const errorState = this.errorMatcher()(this.ngControl, this.formGroup);
                this.errorState.set(errorState);
            });
    }
}
