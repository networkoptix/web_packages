import { FormControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

import { simpleEmailRegex } from '@static-variables';
import { staticImplements } from '@utils/general';

/** Use cases that we want consistent across the entire codebase
 *
 * Every preset should have a validator in the `NxValidators` class and a matching message
 * set in `NxControlMessagesComponent`. Unfortunately, Angular doesn't have an
 * equivalent to React <Fragment> so those can't be moved to a separate file.
 */
export enum ControlPresets {
    RequiredEmail = 'requiredEmail',
}

type PresetValidators = { [P in ControlPresets]: ValidatorFn | (() => ValidatorFn) };

@staticImplements<PresetValidators>()
export class NxValidators {
    static requiredEmail = Validators.compose([
        Validators.maxLength(255),
        Validators.pattern(simpleEmailRegex),
        Validators.required,
    ])!;

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
