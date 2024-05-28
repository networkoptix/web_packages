/* eslint-disable nx/signal-naming-convention */
import { computed, inject, InjectionToken } from '@angular/core';
import { patchState, signalStore, withComputed, withHooks, withState } from '@ngrx/signals';
import { Store } from '@ngrx/store';
import { filter } from 'rxjs/operators';

import {
    ChannelPartnerPermissions,
    OrgPermissions,
} from '@pages/home/store/permissions/permissions.types';
import { nxConfig } from '@services/nx-config/config';
import {
    selectCurrentOrganization,
    selectCurrentPartner,
    selectCurrentPartnerParent,
} from '@store/channel-partners/channel-partners.selectors';

const createPermissionState = <P extends Record<string, string>>(
    permissionObj: P,
): Record<keyof P, boolean> =>
    Object.keys(permissionObj).reduce(
        (permissions, key) => ({ ...permissions, [key]: false }),
        {} as Record<keyof P, boolean>,
    );

const buildPermissions = (
    permissions: string[],
    defaultPermissions: Record<string, boolean>,
): Record<string, boolean> =>
    Object.assign(
        defaultPermissions,
        permissions.reduce((permMap, permission) => ({ ...permMap, [permission]: true }), {}),
    );

interface PermissionState {
    selectedOrgId: string;
    selectedPartnerId: string;
    selectedParentPartnerId: string;
    parentPartnerPermissions: Record<keyof typeof ChannelPartnerPermissions, boolean>;
    partnerPermissions: Record<keyof typeof ChannelPartnerPermissions, boolean>;
    orgPermissions: Record<keyof typeof OrgPermissions, boolean>;
}

const initialState: PermissionState = {
    selectedOrgId: '',
    selectedPartnerId: '',
    selectedParentPartnerId: '',
    parentPartnerPermissions: createPermissionState(ChannelPartnerPermissions),
    partnerPermissions: createPermissionState(ChannelPartnerPermissions),
    orgPermissions: createPermissionState(OrgPermissions),
};

const PERMISSION_STATE = new InjectionToken<PermissionState>('PermissionState', {
    factory: () => initialState,
});

export const PermissionsStore = signalStore(
    { providedIn: 'root' },
    withState(() => inject(PERMISSION_STATE)),
    withComputed(({ orgPermissions, partnerPermissions, parentPartnerPermissions }) => ({
        // Channel Partner Action Signals
        canCreateOrgs$$: computed(() => partnerPermissions().add_remove_organizations),
        canCreateSubChannels$$: computed(
            () =>
                nxConfig.featureFlags.channelPartnersCreatePartnerUI &&
                partnerPermissions().add_remove_sub_channel_partners,
        ),
        // Channel Partner View Signals
        canViewInfo$$: computed(() => partnerPermissions().configure_channel_partner),
        canViewOrgs$$: computed(
            () =>
                partnerPermissions().add_remove_organizations ||
                partnerPermissions().alter_state_organizations,
        ),
        canViewPartnerUsers$$: computed(() => partnerPermissions().manage_users),
        canViewPartnerReports$$: computed(
            () =>
                nxConfig.featureFlags.channelPartnersReportsUI &&
                partnerPermissions().view_service_reports,
        ),
        canViewPartnerSupportUI$$: computed(() => nxConfig.featureFlags.channelPartnersSupportUI),
        canViewPartnerSettings$$: computed(() => partnerPermissions().configure_channel_partner),
        canViewSubChannels$$: computed(
            () =>
                partnerPermissions().add_remove_sub_channel_partners ||
                partnerPermissions().alter_state_sub_channel_partners,
        ),
        // Sub Channel Actions Signals
        canChangePartnerState$$: computed(
            () =>
                nxConfig.featureFlags.channelPartnersChangeStateUI &&
                parentPartnerPermissions().alter_state_sub_channel_partners,
        ),
        // Organization Action Signals
        canChangeOrganizationState$$: computed(
            () =>
                nxConfig.featureFlags.channelPartnersChangeStateUI &&
                partnerPermissions().alter_state_organizations,
        ),
        canConfigureOrganization$$: computed(() => orgPermissions().configure_organization),
        canManageSystems$$: computed(() => orgPermissions().manage_systems),
        canModifyServices$$: computed(() => partnerPermissions().add_remove_service_quantities),
        // Organization View Signals
        canViewOrgUsers$$: computed(() => orgPermissions().manage_users),
        canViewOrgReports$$: computed(
            () =>
                nxConfig.featureFlags.channelPartnersReportsUI &&
                orgPermissions().view_service_reports,
        ),
        canViewOrgSettings$$: computed(
            () =>
                orgPermissions().configure_organization ||
                partnerPermissions().alter_state_organizations,
        ),
        canViewSystems$$: computed(
            () =>
                orgPermissions().access_systems ||
                orgPermissions().manage_systems ||
                partnerPermissions().administer_organization_systems,
        ),
    })),
    withHooks({
        onInit(store) {
            const globalStore = inject(Store);
            globalStore
                .select(selectCurrentPartnerParent)
                .pipe(filter(Boolean))
                .subscribe(parentPartner => {
                    patchState(store, {
                        selectedParentPartnerId: parentPartner?.id,
                        parentPartnerPermissions: buildPermissions(
                            parentPartner.ownPermissions || [],
                            createPermissionState(ChannelPartnerPermissions),
                        ),
                    });
                });

            globalStore
                .select(selectCurrentPartner)
                .pipe(filter(Boolean))
                .subscribe(partner => {
                    patchState(store, {
                        selectedPartnerId: partner?.id,
                        partnerPermissions: buildPermissions(
                            partner?.ownPermissions || [],
                            createPermissionState(ChannelPartnerPermissions),
                        ),
                    });
                });

            globalStore
                .select(selectCurrentOrganization)
                .pipe(filter(Boolean))
                .subscribe(organization => {
                    patchState(store, {
                        selectedOrgId: organization.id,
                        orgPermissions: buildPermissions(
                            organization?.ownPermissions,
                            createPermissionState(OrgPermissions),
                        ),
                    });
                });
        },
    }),
);
