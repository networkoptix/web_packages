import {
    computed,
    DestroyRef,
    Directive,
    Host,
    input,
    Input,
    OnInit,
    Output,
    signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormGroup, FormGroupDirective, isFormArray, isFormGroup } from '@angular/forms';
import { size } from 'lodash-es';
import { combineLatest, map, Observable, Subject } from 'rxjs';

import { writeOnlySignal } from '@utils/nx';

import type { NxFormFieldComponent } from './form-field/form-field.component';

type UnknownRecord = Record<string, unknown>;

type CompareFn = (a: unknown, b: unknown, formGroup?: FormGroup) => boolean;

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
    private initialValue = signal<UnknownRecord>({});
    private initialValue$ = toObservable(this.initialValue);

    /** Value to compare against for form changes and to revert to on reset.
     *
     * Defaults to the initial form value at `ngOnInit`.
     */
    @Input({ alias: 'initialFormValue' }) set _initialFormValue(value: UnknownRecord) {
        this.initialValue.set(value);
    }
    @Output() initialFormValueChange = this.initialValue$;

    /** Recursively check FormControl values for equality */
    private formGroupStrictEquality(
        current: UnknownRecord,
        initial: UnknownRecord,
        formGroup: FormGroup,
    ): boolean {
        return (
            size(current) === size(initial) &&
            Object.keys(current).every(k => {
                const currentControl = formGroup.controls[k];
                if (isFormGroup(currentControl)) {
                    const currentValue = current[k] as UnknownRecord;
                    const initialValue = initial[k] as UnknownRecord;
                    return this.formGroupStrictEquality(currentValue, initialValue, currentControl);
                } else if (isFormArray(currentControl)) {
                    const currentValue = current[k] as unknown[];
                    const initialValue = initial[k] as unknown[];
                    return (
                        currentValue.length === initialValue.length &&
                        currentValue.every((_, i) => currentValue[i] === initialValue[i])
                    );
                } else {
                    return current[k] === initial[k];
                }
            })
        );
    }

    /** Function to use to compare individual form control values.
     *
     * Defaults to `===` strict equality.
     */
    compareFn = input<CompareFn>(this.formGroupStrictEquality);
    formChanged = signal<boolean>(false);
    formDisabled = signal<boolean>(false);

    private _formFields = signal<NxFormFieldComponent[]>([]);
    formFields = writeOnlySignal(this._formFields);
    /** Whether any form fields within the form have a visible error. */
    hasErrorState = computed<boolean>(() => this._formFields().some(ff => !!ff.errorState()));

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
                this.formChanged.set(!this.compareFn()(value, initial, this.form.control));
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
