import { InjectionToken } from '@angular/core';

import { NxAutocompleteComponent } from './autocomplete.component';

export const NxAutocompleteInjectionToken = new InjectionToken<NxAutocompleteComponent<unknown>>(
    'NxAutocomplete',
);
