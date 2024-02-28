import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, computed } from '@angular/core';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, distinctUntilChanged, firstValueFrom, map, of } from 'rxjs';

import * as cpActions from '@common/store/channel-partners/channel-partners.actions';
import {
    selectChannelPartners,
    selectCurrentOrganization,
    selectCurrentPartner,
    selectCurrentPartnerId,
    selectCurrentPartnerOrgs,
    selectCurrentSubchannelPartners,
    selectRootOrganizations,
} from '@common/store/channel-partners/channel-partners.selectors';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import { settingsViews } from '@pages/home/home.types';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import {
    ChannelPartner,
    OrgPermissions,
    Organization,
    State,
    UpdateChannelPartner,
    UpdateOrganization,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { nxConfig } from '@services/nx-config/config';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';

import { NxSettingsGeneralComponent } from './components/general/general.component';
import { NxSettingsStateComponent } from './components/state/state.component';

interface SettingsState {
    view?: string;
    item?: ChannelPartner | Organization;
    canUpdateStatus?: boolean;
}

@Component({
    selector: 'nx-organization-settings',
    templateUrl: 'settings.component.html',
    styleUrls: ['settings.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        NxSettingsGeneralComponent,
        NxSettingsStateComponent,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
        TranslateModule,
    ],
})
export class NxOrganizationSettingsComponent implements OnInit {
    readonly canChangeStateUI = nxConfig.featureFlags.channelPartnersChangeStateUI;
    settingsViews = settingsViews;
    channelPartners$$ = this.store.selectSignal(selectChannelPartners);
    rootOrgs$$ = this.store.selectSignal(selectRootOrganizations);
    partnerOrgs$$ = this.store.selectSignal(selectCurrentPartnerOrgs);
    currentPartner$$ = this.store.selectSignal(selectCurrentPartner);
    currentPartnerId$$ = this.store.selectSignal(selectCurrentPartnerId);
    currentOrg$$ = this.store.selectSignal(selectCurrentOrganization);
    subchannelPartners$$ = this.store.selectSignal(selectCurrentSubchannelPartners);
    updatedName = new BehaviorSubject<string | null>(null);
    updatedPartnerAccess = new BehaviorSubject<string | null>(null);
    updatedState = new BehaviorSubject<State | null>(null);
    updateStateProcess: Process;

    @Input() cpSettings: boolean;
    @Input() orgSettings: boolean;
    @Input() subchannelSettings: boolean;
    currentState$$ = computed<SettingsState>(() => {
        const state: SettingsState = {};
        if (this.cpSettings) {
            state.item = this.currentPartner$$();
            state.view = settingsViews.CHANNEL_PARTNERS;
        } else if (this.orgSettings) {
            state.item = this.currentOrg$$();
            state.view = settingsViews.ORGANIZATIONS;
            state.canUpdateStatus = state.item?.ownPermissions.includes(
                OrgPermissions.CONFIGURE_ORGANIZATION,
            );
        } else if (this.subchannelSettings) {
            const subchannelsMap = new Map<string, ChannelPartner>(
                this.subchannelPartners$$().map(partner => [partner.id, partner]),
            );
            this.cpService.paramStateHandler.state$
                .pipe(
                    map(({ params: { subchannelId } }) => subchannelId),
                    distinctUntilChanged(),
                )
                .subscribe(id => {
                    state.item = subchannelsMap.get(id);
                });
            state.view = settingsViews.SUBCHANNELS;
            state.canUpdateStatus = true;
        }
        return state;
    });
    currentPartnerPermissions$$ = computed(() => {
        const currentPartner = this.currentPartner$$();
        return Object.values(currentPartner?.ownPermissions || {});
    });

    isDirectParentCP$$ = computed<boolean>(() => {
        const currentOrg = this.currentOrg$$();
        const currentPartner = this.currentPartner$$();
        const permissions = this.currentPartnerPermissions$$();
        if (!permissions.length) {
            return false;
        }
        const canAlterState = permissions.includes('alter_state_organizations');
        const canAlterSubCP = permissions.includes('alter_state_sub_channel_partners');
        return (currentOrg && canAlterState) || (currentPartner && canAlterSubCP) || false;
    });

    isOrgAdmin$$ = computed(() => {
        return this.currentPartnerPermissions$$().includes('administer_organization_systems');
    });
    hasUpdate = false;

    State = State;

    constructor(
        private store: Store,
        private processService: NxProcessService,
        private cpService: NxChannelPartnersService,
    ) {}

    ngOnInit(): void {
        this.updateStateProcess = this.processService.createProcess(
            () => {
                const currentState = this.currentState$$();
                switch (currentState.view) {
                    case this.settingsViews.CHANNEL_PARTNERS:
                        return this.updateChannelPartner();
                    case this.settingsViews.ORGANIZATIONS:
                        return this.updateOrganization();
                    case this.settingsViews.SUBCHANNELS:
                        return this.updateSubchannel(currentState);
                    default:
                        console.error('Invalid current view');
                }
                return firstValueFrom(of(true));
            },
            {},
            res => {
                const currentState = this.currentState$$();
                switch (currentState.view) {
                    case this.settingsViews.SUBCHANNELS:
                        this.updateSubchannelStore(res);
                        break;
                    case this.settingsViews.CHANNEL_PARTNERS:
                        this.updateChannelPartnerStore(res);
                        break;
                    case this.settingsViews.ORGANIZATIONS:
                        this.updateOrganizationStore(res);
                        break;
                }

                this.resetUpdates();
            },
            () => {},
        );
    }

    handleNameUpdate = (name: string): void => {
        if (name === this.currentState$$().item?.name) {
            this.updatedName.next(null);
        } else {
            this.updatedName.next(name);
        }
    };

    handleAccessUpdate = (id: string): void => {
        const item = this.currentState$$().item;
        if ('channelPartnerAccessLevel' in item) {
            if (id === item.channelPartnerAccessLevel) {
                this.updatedPartnerAccess.next(null);
            } else {
                this.updatedPartnerAccess.next(id);
            }
        }
    };

    handleStateUpdate = (state: State): void => {
        const currState = this.currentState$$().item?.effectiveState;
        if (currState === state) {
            this.updatedState.next(null);
        } else {
            this.updatedState.next(state);
        }
    };

    get hasChange(): boolean {
        return !!(
            this.updatedName.value ||
            this.updatedPartnerAccess.value ||
            this.updatedState.value
        );
    }

    resetUpdates(): void {
        this.updatedName.next(null);
        this.updatedState.next(null);
        this.updatedPartnerAccess.next(null);
    }

    updateChannelPartner(): Promise<ChannelPartner> {
        const cpBody: UpdateChannelPartner = {};
        if (this.updatedName.value) {
            cpBody.name = this.updatedName.value;
        }
        // Todo: add extId to body when API is ready
        return firstValueFrom(
            this.cpService.updateChannelPartner(this.currentPartnerId$$(), cpBody),
        );
    }

    updateChannelPartnerStore(updatedPartner: ChannelPartner): void {
        const currPartners = [...this.channelPartners$$()];
        const currPartnerIndex = currPartners.findIndex(
            partner => partner.id === updatedPartner.id,
        );
        currPartners[currPartnerIndex] = updatedPartner;
        this.store.dispatch(cpActions.setChannelPartners({ channelPartners: currPartners }));
    }

    updateOrganization(): Promise<Organization> {
        const orgBody: UpdateOrganization = {};
        const currOrg = this.currentOrg$$();
        if (this.updatedState.value) {
            orgBody.state = this.updatedState.value;
        }
        if (this.updatedName.value) {
            orgBody.name = this.updatedName.value;
        }
        if (this.updatedPartnerAccess.value === 'serviceManagementOnly') {
            orgBody.channelPartnerAccessLevel = null;
        } else if (this.updatedPartnerAccess.value) {
            orgBody.channelPartnerAccessLevel = this.updatedPartnerAccess.value;
        }
        return firstValueFrom(this.cpService.updateOrganization(currOrg.id, orgBody));
    }

    updateOrganizationStore(updatedOrg: Organization): void {
        const rootOrgs = [...this.rootOrgs$$()];
        const partnerOrgs = [...this.partnerOrgs$$()];
        const rootOrgIndex = rootOrgs.findIndex(org => org.id === updatedOrg.id);
        const partnerOrgIndex = partnerOrgs.findIndex(org => org.id === updatedOrg.id);
        if (rootOrgIndex !== -1) {
            rootOrgs[rootOrgIndex] = updatedOrg;
            this.store.dispatch(cpActions.setOrganizations({ rootOrganizations: rootOrgs }));
        } else if (partnerOrgIndex !== -1) {
            partnerOrgs[partnerOrgIndex] = updatedOrg;
            this.store.dispatch(
                cpActions.setCurrentPartner({
                    currentPartnerId: this.currentPartnerId$$(),
                    currentPartnerOrganizations: partnerOrgs,
                }),
            );
        }
    }

    updateSubchannel(currentState: SettingsState): Promise<ChannelPartner> {
        const subchannelBody: UpdateChannelPartner = {};
        if (this.updatedName.value) {
            subchannelBody.name = this.updatedName.value;
        }
        if (this.updatedState.value) {
            subchannelBody.state = this.updatedState.value;
        }
        return firstValueFrom(
            this.cpService.updateChannelPartner(currentState.item?.id, subchannelBody),
        );
    }

    updateSubchannelStore(updatedSubchannel: ChannelPartner): void {
        const subchannelPartners = [...this.subchannelPartners$$()];
        const subchannelIndex = subchannelPartners.findIndex(
            partner => partner.id === updatedSubchannel.id,
        );
        subchannelPartners[subchannelIndex] = updatedSubchannel;
        this.store.dispatch(
            cpActions.setCurrentSubchannelPartners({
                currentSubchannels: subchannelPartners,
            }),
        );
    }
}
