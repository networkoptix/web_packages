import { inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { setCurrentParentPartnerId } from '@store/channel-partners/channel-partners.actions';
import { selectCurrentPartnerParent } from '@store/channel-partners/channel-partners.selectors';

export const updateParentPartnerId = (): Observable<boolean> => {
    const store = inject(Store);
    return store.select(selectCurrentPartnerParent).pipe(
        map(partner => {
            store.dispatch(
                setCurrentParentPartnerId({ currentParentPartnerId: partner?.id || '' }),
            );
            return true;
        }),
    );
};
