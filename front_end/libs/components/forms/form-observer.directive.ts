import {
    DestroyRef,
    Directive,
    Host,
    Input,
    OnInit,
    Output,
    computed,
    input,
    signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormGroupDirective } from '@angular/forms';
import { Observable, Subject, combineLatest, map } from 'rxjs';

import type { NxFormFieldComponent } from './form-field/form-field.component';

type UnknownRecord = Record<string, unknown>;

type CompareFn = (a: unknown, b: unknown) => boolean;
const strictEquality: CompareFn = (a, b): boolean => a === b;

/** Directive for tracking form state and changes.
 *
 * Apply to `<form>` elements with bound form groups.
 */
@Directive({
    selector: '[nxFormObserver]',
    exportAs: 'nxFormObserver',
    standalone: true,
})
export class NxFormObserverDirective implements OnInit {
    initialValue = signal<UnknownRecord>({});
    initialValue$ = toObservable(this.initialValue);

    /** Value to compare against for form changes and to revert to on reset.
     *
     * Defaults to the initial form value at `ngOnInit`.
     */
    @Input({ alias: 'initialFormValue' }) set _initialFormValue(value: UnknownRecord) {
        this.initialValue.set(value);
    }
    @Output() initialFormValueChange = this.initialValue$;

    /** Function to use to compare individual form control values.
     *
     * Defaults to `===` strict equality.
     */
    compareFn = input<CompareFn>(strictEquality);
    formChanged = signal<boolean>(false);
    formDisabled = signal<boolean>(false);

    formFields = signal<NxFormFieldComponent[]>([]);
    /** Whether any form fields within the form have a visible error. */
    hasErrorState = computed<boolean>(() => this.formFields().some(ff => !!ff.errorState()));

    constructor(
        private destroyRef: DestroyRef,
        @Host() public form: FormGroupDirective,
    ) {}

    ngOnInit(): void {
        if (!Object.keys(this.initialValue()).length) {
            this.initialValue.set(this.form.value);
        }
        combineLatest([this.form.valueChanges as Observable<UnknownRecord>, this.initialValue$])
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(([value, initial]) => {
                this.formChanged.set(
                    Object.keys(value).some(k => !this.compareFn()(value[k], initial[k])),
                );
            });

        this.form
            .statusChanges!.pipe(
                takeUntilDestroyed(this.destroyRef),
                map(s => s === 'DISABLED'),
            )
            .subscribe(disabled => {
                this.formDisabled.set(disabled);
            });
    }

    updateInitialValue(): void {
        this.initialValue.set(this.form.value);
    }

    // Replace in v18: https://angular.dev/api/forms/AbstractControl#events
    reset$ = new Subject<void>();
    reset(): void {
        this.form.resetForm(this.initialValue());
        this.reset$.next();
    }
}
