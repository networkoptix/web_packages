import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, input, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
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
import { PermissionsStore } from '@pages/home/store/permissions/permissions.store';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import {
    ChannelPartner,
    Organization,
    State,
    UpdateChannelPartner,
    UpdateOrganization,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { nxConfig } from '@services/nx-config/config';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';

// import { NxSettingsDisconnectComponent } from './components/disconnect/disconnect.component';
import { NxSettingsGeneralComponent } from './components/general/general.component';
import { NxSettingsStateComponent } from './components/state/state.component';

interface SettingsState {
    view?: string;
    item?: ChannelPartner | Organization;
    canUpdateStatus: boolean;
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
        // NxSettingsDisconnectComponent,
    ],
})
export class NxOrganizationSettingsComponent implements OnInit {
    readonly canChangeStateUI = nxConfig.featureFlags.channelPartnersChangeStateUI;
    readonly settingsViews = settingsViews;
    permissionsStore = inject(PermissionsStore);
    channelPartners$$ = this.store.selectSignal(selectChannelPartners);
    rootOrgs$$ = this.store.selectSignal(selectRootOrganizations);
    partnerOrgs$$ = this.store.selectSignal(selectCurrentPartnerOrgs);
    currentPartner$$ = this.store.selectSignal(selectCurrentPartner);
    currentPartnerId$$ = this.store.selectSignal(selectCurrentPartnerId);
    currentOrg$$ = this.store.selectSignal(selectCurrentOrganization);
    subchannelPartners$$ = this.store.selectSignal(selectCurrentSubchannelPartners);
    currentName$ = new BehaviorSubject<string | null>(null);
    currentPartnerAccess$ = new BehaviorSubject<string | null>(null);
    currentState$ = new BehaviorSubject<State | null>(null);
    updateStateProcess: Process;

    // eslint-disable-next-line nx/signal-naming-convention
    cpSettings = input<boolean>();
    // eslint-disable-next-line nx/signal-naming-convention
    orgSettings = input<boolean>();
    // eslint-disable-next-line nx/signal-naming-convention
    subchannelSettings = input<boolean>();

    subChannelId$$ = toSignal(
        this.cpService.paramStateHandler.state$.pipe(
            map(({ params: { subchannelId } }) => subchannelId),
            distinctUntilChanged(),
        ),
    );

    currentState$$ = computed<SettingsState>(() => {
        const currentPartner = this.currentPartner$$();
        const state: SettingsState = {
            canUpdateStatus: currentPartner?.effectiveState === 'active',
        };

        if (this.cpSettings()) {
            state.item = currentPartner;
            state.view = settingsViews.CHANNEL_PARTNERS;
        } else if (this.orgSettings()) {
            state.item = this.currentOrg$$();
            state.view = settingsViews.ORGANIZATIONS;
        } else if (this.subchannelSettings()) {
            const subchannelsMap = new Map<string, ChannelPartner>(
                this.subchannelPartners$$().map(partner => [partner.id, partner]),
            );
            state.item = subchannelsMap.get(this.subChannelId$$());
            state.view = settingsViews.SUBCHANNELS;
        }
        return state;
    });

    // This pattern is not idea, but because we are not live updating the page it's okay for now.
    effectState$$ = computed<State>(() => {
        const state = this.currentState$$().item.state;
        this.currentState$.next(state);
        return state;
    });

    name$$ = computed<string>(() => {
        const name = this.currentState$$().item.name;
        this.currentName$.next(name);
        return name;
    });

    accessLevel$$ = computed<string>(() => {
        const currentStateItem = this.currentState$$().item;
        const accessLevel = (currentStateItem as Organization)?.channelPartnerAccessLevel || null;
        this.currentPartnerAccess$.next(accessLevel);
        return accessLevel;
    });
    // Think about these
    permissions$$ = computed(() => {
        const {
            canChangeOrganizationState$$,
            canConfigureOrganization$$,
            canChangePartnerState$$,
            canViewPartnerSettings$$,
        } = this.permissionsStore;
        const orgSettings = this.orgSettings();
        const cpSettings = this.cpSettings();
        return {
            canAlterState: orgSettings ? canChangeOrganizationState$$() : canChangePartnerState$$(),
            canConfigure: orgSettings
                ? canConfigureOrganization$$()
                : cpSettings
                  ? canViewPartnerSettings$$()
                  : false,
        };
    });

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

    // State related methods
    handleNameUpdate = (name: string): void => {
        this.currentName$.next(name);
    };

    handleAccessUpdate = (id: string): void => {
        this.currentPartnerAccess$.next(id);
    };

    handleStateUpdate = (state: State): void => {
        this.currentState$.next(state);
    };

    get hasChange(): boolean {
        return (
            this.currentName$.value !== this.name$$() ||
            this.currentPartnerAccess$.value !== this.accessLevel$$() ||
            this.currentState$.value !== this.effectState$$()
        );
    }

    resetUpdates = (): void => {
        this.currentState$.next(this.effectState$$());
        this.currentName$.next(this.name$$());
        this.currentPartnerAccess$.next(this.accessLevel$$());
    };

    // Process helper functions
    updateChannelPartner(): Promise<ChannelPartner> {
        const cpBody: UpdateChannelPartner = {};
        if (this.name$$() !== this.currentName$.value) {
            cpBody.name = this.currentName$.value;
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
        if (this.effectState$$() !== this.currentState$.value) {
            orgBody.state = this.currentState$.value;
        }
        if (this.name$$() !== this.currentName$.value) {
            orgBody.name = this.currentName$.value;
        }
        if (this.accessLevel$$() !== this.currentPartnerAccess$.value) {
            orgBody.channelPartnerAccessLevel = this.currentPartnerAccess$.value;
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
            this.store.dispatch(cpActions.setRootOrganizations({ rootOrganizations: rootOrgs }));
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
        if (this.name$$() !== this.currentName$.value) {
            subchannelBody.name = this.currentName$.value;
        }
        if (this.effectState$$() !== this.currentState$.value) {
            subchannelBody.state = this.currentState$.value;
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
