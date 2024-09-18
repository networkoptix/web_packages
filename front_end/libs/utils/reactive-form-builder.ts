import {
    FormControl,
    FormControlOptions,
    FormControlState,
    FormGroup,
    ɵFormGroupValue,
    ɵTypedOrUntyped,
} from '@angular/forms';
import { cloneDeep, isEqual } from 'lodash-es';

export class NxFormControl<T> extends FormControl {
    initialValue: T;
    constructor(
        value: FormControlState<T> | T,
        opts?: FormControlOptions & {
            nonNullable: true;
        },
    ) {
        super(value, opts);
        this.initialValue = cloneDeep(this.value);
    }

    override get dirty(): boolean {
        return !isEqual(this.value, this.initialValue);
    }

    override reset(): void {
        this.setValue(cloneDeep(this.initialValue));
    }

    setInitialValue(): void {
        this.initialValue = cloneDeep(this.value);
    }
}

export class NxFormGroup<T> extends FormGroup {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    override controls: { [key: string]: NxFormControl<T> };
    freeze(): void {
        Object.values(this.controls).forEach(control => control.setInitialValue());
        this.markAsPristine();
    }

    override get dirty(): boolean {
        return Object.values(this.controls).some(control => control.dirty);
    }

    override reset(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        value?: ɵTypedOrUntyped<any, ɵFormGroupValue<any>, any>,
        options?: {
            onlySelf?: boolean;
            emitEvent?: boolean;
        },
    ): void {
        super.reset(value, options);
        this.markAsPristine();
    }
}

export const NxFormBuilder = <T>(data: { [key: string]: unknown }): NxFormGroup<T> =>
    new NxFormGroup<T>(
        Object.entries(data).reduce((form, [key, value]) => {
            form[key] = new NxFormControl(value, { nonNullable: true });
            return form;
        }, {}),
    );
