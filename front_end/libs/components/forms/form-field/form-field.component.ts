import { CommonModule } from '@angular/common';
import {
    AfterContentInit,
    ChangeDetectionStrategy,
    Component,
    ContentChild,
    DestroyRef,
    Injector,
    SkipSelf,
    computed,
    effect,
    forwardRef,
    input,
    runInInjectionContext,
    signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroupDirective, NgControl } from '@angular/forms';
import { map, merge, take } from 'rxjs';

import { NxThemeAttributeDirective } from '@directives/theme-attribute.directive';

import { NxControlMessagesComponent as NxMessages } from '../control-messages/control-messages.component';
import { InputMaxLength } from '../validators';

import {
    ControlState,
    ErrorMatcher,
    NxErrorMatches,
    errorMatcherFactory,
} from './error-state-matcher';
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
    hostDirectives: [NxThemeAttributeDirective],
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
     * Defaults to `NxErrorMatches.text()` matchter.
     */
    errorMatcher = input<ErrorMatcher>(errorMatcherFactory(NxErrorMatches.text()));

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

    valueLength = signal(0).asReadonly();
    maxLength = signal(0);
    overMaxLength = computed<boolean>(() => this.valueLength() > this.maxLength());

    constructor(
        private injector: Injector,
        private destroyRef: DestroyRef,
        @SkipSelf() private formGroup: FormGroupDirective,
    ) {}

    ngAfterContentInit(): void {
        const nativeElement = this.nxControlDirective.host.nativeElement;
        if (nativeElement.tagName === 'INPUT') {
            const input = nativeElement as HTMLInputElement;
            const control = this.ngControl.control as FormControl<string>;
            this.maxLength.set(InputMaxLength[input.type] ?? 0);
            runInInjectionContext(this.injector, () => {
                this.valueLength = toSignal(control.valueChanges.pipe(map(v => v.length)), {
                    initialValue: control.value.length,
                });
            });
        }

        merge(this.formGroup.ngSubmit.pipe(take(1)), this.ngControl.statusChanges!)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                const errorState = this.errorMatcher()(this.ngControl, this.formGroup);
                this.errorState.set(errorState);
            });
    }
}
