import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { Store } from '@ngrx/store';

import {
    selectOrgsFromStructure,
    selectPartnersFromStructure,
} from '@common/store/channel-partners/channel-partners.selectors';

export const entityNameResolver: ResolveFn<string> = async (route: ActivatedRouteSnapshot) => {
    const store = inject(Store);

    const partners$$ = store.selectSignal(selectPartnersFromStructure);
    const organizations$$ = store.selectSignal(selectOrgsFromStructure);
    const { entityId } = route.params;

    const entityName =
        partners$$().get(entityId)?.name || organizations$$().get(entityId)?.name || '';
    return entityName;
};
