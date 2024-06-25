import { InjectionToken } from '@angular/core';

import { NxButtonToggleGroupComponent } from './button-toggle-group.component';

export const NX_BUTTON_TOGGLE_GROUP = new InjectionToken<NxButtonToggleGroupComponent<unknown>>(
    'NxButtonToggleGroupComponent',
);
