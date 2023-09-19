import { ComponentType } from '@angular/cdk/portal';
import { InjectionToken } from '@angular/core';
import { memoize } from 'lodash-es';

export const createPortalToken = memoize(
    <T, C>(portalComponent: ComponentType<C>, _dataType?: T): InjectionToken<T> =>
        new InjectionToken<T>(`portal-data-${portalComponent.name}`),
);
