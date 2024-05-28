import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';

import {
    selectChannelPartners,
    selectCurrentPartner,
} from '@store/channel-partners/channel-partners.selectors';

import { PermissionsStore } from '../store/permissions/permissions.store';

export const ChannelPartnerGuard: CanActivateFn = async () => {
    const permissionsStore = inject(PermissionsStore);
    const canViewChannelPartner = [
        permissionsStore.canViewOrgs$$(),
        permissionsStore.canViewSubChannels$$(),
        permissionsStore.canViewPartnerSettings$$(),
        permissionsStore.canViewPartnerSettings$$(),
        permissionsStore.canViewPartnerUsers$$(),
    ].some(Boolean);

    if (!canViewChannelPartner) {
        const store = inject(Store);
        const currentPartnerId = store.selectSignal(selectCurrentPartner)()?.id;
        const partners = store.selectSignal(selectChannelPartners)();
        const isValidPartner = partners.find(partner => partner.id === currentPartnerId);
        if (!isValidPartner) {
            return true;
        }
        await inject(Router).navigate(
            permissionsStore.canViewPartnerReports$$()
                ? ['reports', currentPartnerId]
                : ['home', 'shared'],
        );
    }
    return canViewChannelPartner;
};
