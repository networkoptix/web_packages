import { InjectionToken } from '@angular/core';

import { BaseDropdownComponent } from './base-dropdown.component';

export const BaseDropdownInjectionToken = new InjectionToken<
    BaseDropdownComponent<unknown, boolean>
>('BaseDropdown');

export enum DropdownState {
    Closed,
    Opening,
    AbortingOpen,
    Open,
    Closing,
}
