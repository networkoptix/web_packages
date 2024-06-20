import { FormControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

import { simpleEmailRegex, simplePhoneRegex, simpleURLRegex } from '@static-variables';
import { staticImplements } from '@utils/general';

/** Use cases that we want consistent across the entire codebase
 *
 * Every preset should have a validator and matcher.
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

export enum InputMaxLength {
    text = 150,
    email = 255,
}

function validatorFactory(...baseValidators: ValidatorFn[]): (required?: boolean) => ValidatorFn[] {
    return (required = true) => {
        const validators = baseValidators;
        if (required) {
            validators.push(Validators.required);
        }
        return validators;
    };
}

@staticImplements<PresetValidators>()
export class NxValidators {
    /** Generic text input */
    static text = validatorFactory(Validators.maxLength(InputMaxLength.text));
    static email = validatorFactory(
        Validators.maxLength(InputMaxLength.email),
        Validators.pattern(simpleEmailRegex),
    );
    static phone = validatorFactory(Validators.pattern(simplePhoneRegex));
    static url = validatorFactory(Validators.pattern(simpleURLRegex));

    static forbidden<T>(
        values: (() => T) | T[] | Set<T> | Map<T, unknown>,
        key = 'forbidden',
    ): (control: FormControl<T>) => ValidationErrors | null {
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
}
