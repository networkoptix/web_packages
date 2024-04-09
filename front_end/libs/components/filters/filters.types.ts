import { InjectionToken } from '@angular/core';

import { BaseFilterComponent } from './base-filter.component';

export const BaseFilterInjectionToken = new InjectionToken<BaseFilterComponent<unknown, boolean>>(
    'BaseFilter',
);
