import { InjectionToken } from '@angular/core';

import { NxAutocompleteV2Component } from './autocomplete-v2.component';

export const AutocompleteV2InjectionToken = new InjectionToken<NxAutocompleteV2Component<unknown>>(
    'NxAutocompleteV2',
);
