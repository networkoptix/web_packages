import { CommonModule } from '@angular/common';
import {
    AfterContentInit,
    ChangeDetectionStrategy,
    Component,
    ContentChild,
    DestroyRef,
    OnDestroy,
    Optional,
    SkipSelf,
    computed,
    effect,
    forwardRef,
    input,
    signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroupDirective, NgControl } from '@angular/forms';
import { merge, filter, tap } from 'rxjs';

import { NxThemeAttributeDirective } from '@directives/theme-attribute.directive';

import { NxControlMessagesComponent as NxMessages } from '../control-messages/control-messages.component';
import { NxFormObserverDirective } from '../form-observer.directive';
import { NxLabelComponent } from '../label/label.component';

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
 * "field" refers to the `nx-form-field` container element, "control" refers to the
 * element that the field is wrapping, and "form control" refers to the `FormControl`
 * registered with the element.
 *
 * The field must be inside a reacive form.
 *
 * The field should be used with three child elements:
 * 1. `nx-label` for the control (optional, but usually used)
 * 2. The control with `NxControlDirective` (required)
 * 3. `nx-control-messages` for control state messages (optional)
 *
 * How validation works:
 * 1. Add validator functions to the form control. The `NxValidators` class contains
 *    sets for common use cases like email validation.
 * 2. Create an error matcher function for the control using `errorMatcherFactory` and
 *    pass it as an input to the field. This is what tells the field when to display
 *    specific errors. Like `NxValidators`, the `NxErrorMatches` class contains common use cases.
 * 3. Add messages to be displayed for errors with `nx-control-message` elements. The key input
 *    should match the error key. There are certain preset messages in `nx-control-messages`
 *    that cannot be overridden.
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
export class NxFormFieldComponent implements AfterContentInit, OnDestroy {
    /** A function for when to display errors.
     *
     * See `error-state-matcher.ts`.
     *
     * Defaults to `NxErrorMatches.text()` matchter.
     */
    errorMatcher = input<ErrorMatcher>(errorMatcherFactory(NxErrorMatches.text()));

    @ContentChild(NxLabelComponent) protected set _label(label: NxLabelComponent) {
        this.hasLabel.set(!!label);
    }
    hasLabel = signal(false);

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
        // private injector: Injector,
        private destroyRef: DestroyRef,
        @SkipSelf() private formGroup: FormGroupDirective,
        @SkipSelf() @Optional() private formObserver: NxFormObserverDirective | null,
    ) {
        formObserver?.formFields.update(ff => ff.concat(this));
    }

    submitted = false;
    ngAfterContentInit(): void {
        // Removing this for now
        // const nativeElement = this.nxControlDirective.host.nativeElement;
        // const maxLength = this.nxControlDirective.maxLength();
        // if (nativeElement.tagName === 'INPUT' && maxLength) {
        //     const input = nativeElement as HTMLInputElement;
        //     const control = this.ngControl.control as FormControl<string>;
        //     this.maxLength.set(maxLength === 'auto' ? InputMaxLength[input.type] ?? 0 : maxLength);
        //     runInInjectionContext(this.injector, () => {
        //         this.valueLength = toSignal(control.valueChanges.pipe(map(v => v.length)), {
        //             initialValue: control.value.length,
        //         });
        //     });
        // }

        // `formGroup.submitted` is already true when `ngSubmit` emits
        merge(
            this.formGroup.ngSubmit.pipe(
                filter(_ => !this.submitted),
                tap(() => {
                    this.submitted = true;
                }),
            ),
            this.ngControl.statusChanges!,
        )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                const errorState = this.errorMatcher()(this.ngControl, this.formGroup);
                this.errorState.set(errorState);
            });

        this.formObserver?.reset$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            this.submitted = false;
        });
    }

    ngOnDestroy(): void {
        this.formObserver?.formFields.update(ff => ff.filter(f => f !== this));
    }
}
