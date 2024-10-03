import { FormArray, FormControl, isFormArray, ValidatorFn, Validators } from '@angular/forms';
import { identity } from 'lodash-es';

import { simpleEmailRegex, simplePhoneRegex, simpleURLRegex } from '@static-variables';
import { staticImplements } from '@utils/general';

/** Use cases that we want consistent across the entire codebase
 *
 * Every preset should have a matching validator.
 */
export enum ControlPresets {
    Text = 'text',
    Email = 'email',
    Phone = 'phone',
    Url = 'url',
}

type PresetValidators = {
    [P in ControlPresets]: () => ValidatorFn[];
};

const INPUT_MAX_LENGTH = {
    generic: 150,
    email: 255,
} as const;

function validatorFactory(...baseValidators: ValidatorFn[]): (required?: boolean) => ValidatorFn[] {
    return (required = true) => {
        const validators = baseValidators.slice();
        if (required) {
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            validators.push(NxValidators.requiredText);
        }
        return validators;
    };
}

@staticImplements<PresetValidators>()
export class NxValidators {
    static requiredText: ValidatorFn = ({ value }: FormControl<string>) =>
        value.trim() ? null : { required: true };

    /** Generic text input */
    static text = validatorFactory(Validators.maxLength(INPUT_MAX_LENGTH.generic));
    static email = validatorFactory(
        Validators.maxLength(INPUT_MAX_LENGTH.email),
        Validators.pattern(simpleEmailRegex),
    );
    static phone = validatorFactory(Validators.pattern(simplePhoneRegex));
    static url = validatorFactory(
        Validators.maxLength(INPUT_MAX_LENGTH.generic),
        Validators.pattern(simpleURLRegex),
    );

    static forbidden<T>(
        values: (() => T) | T[] | Set<T> | Map<T, unknown>,
        key = 'forbidden',
    ): ValidatorFn {
        let check: (value: T) => boolean;
        if (values instanceof Set || values instanceof Map) {
            check = value => values.has(value);
        } else if (Array.isArray(values)) {
            check = value => values.includes(value);
        } else {
            check = value => value === values();
        }

        return control => {
            return check(control.value) ? { [key]: control.value } : null;
        };
    }

    static uniqueArrayValues<T, Z = T>({
        transformFn = identity,
        filterFn = () => true,
    }: {
        transformFn?: (input: T) => Z;
        filterFn?: (value: FormControl<T>, index: number, array: FormControl<T>[]) => boolean;
    } = {}): ValidatorFn {
        return array_ => {
            if (!isFormArray(array_)) {
                throw Error('This validator can only be used with FormArray');
            }
            const array = array_ as FormArray<FormControl<T>>;
            const valueToControl = new Map<Z, FormControl<T>[]>();
            array.controls.filter(filterFn).forEach(c => {
                const tValue = transformFn(c.value);
                if (valueToControl.has(tValue)) {
                    valueToControl.get(tValue)!.push(c);
                } else {
                    valueToControl.set(tValue, [c]);
                }
            });
            let hasDuplicates = false;
            for (const controls of valueToControl.values()) {
                if (controls.length > 1) {
                    hasDuplicates = true;
                    controls.forEach(c => {
                        c.setErrors({ ...(c.errors ?? {}), uniqueArrayValue: true });
                    });
                } else {
                    controls.forEach(c => {
                        if (c.errors && c.hasError('uniqueArrayValue')) {
                            const { uniqueArrayValue: _, errors } = c.errors;
                            c.setErrors(errors);
                        }
                    });
                }
            }
            return hasDuplicates ? { uniqueValues: true } : null;
        };
    }
}
