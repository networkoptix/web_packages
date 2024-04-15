import { InjectionToken } from '@angular/core';

import { BaseSelectV2Component } from './base-select-v2.component';

export const BaseSelectV2InjectionToken = new InjectionToken<
    BaseSelectV2Component<unknown, boolean>
>('BaseSelectV2');

export enum DropdownState {
    Closed,
    Opening,
    AbortingOpen,
    Open,
    Closing,
}
