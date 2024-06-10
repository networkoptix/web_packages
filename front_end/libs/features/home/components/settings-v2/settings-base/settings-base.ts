import { Component, computed, inject, Signal, ViewChild } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';

import { NxDialogsService } from '@dialogs/dialogs.service';
import staticLang from '@language_static';
import { NxSettingsGeneralV2Component } from '@pages/home/components/settings-v2/components/general/general.component';
import { settingsViews } from '@pages/home/home.types';
import { PermissionsStore } from '@pages/home/store/permissions/permissions.store';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import {
    ChannelPartner,
    State,
    OrgSettingsState,
    CPSettingsState,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { nxConfig } from '@services/nx-config/config';
import { NxProcessService } from '@services/process.service';
import { icons } from '@static-variables';
import {
    selectCurrentPartner,
    selectCurrentPartnerId,
    selectRootChannelPartners,
} from '@store/channel-partners/channel-partners.selectors';

@Component({
    template: '',
})
export abstract class SettingsBase {
    @ViewChild(NxSettingsGeneralV2Component) generalComponent: NxSettingsGeneralV2Component;
    protected abstract initProcesses(): void;
    protected abstract resetGeneralUpdates(): void;
    protected abstract resetStateUpdates(): void;
    protected store = inject(Store);
    protected processService = inject(NxProcessService);
    protected cpService = inject(NxChannelPartnersService);
    protected dialogsService = inject(NxDialogsService);
    protected translateService = inject(TranslateService);

    readonly LANG = staticLang;
    readonly icons = icons;
    readonly canChangeStateUI = nxConfig.featureFlags.channelPartnersChangeStateUI;
    readonly settingsViews = settingsViews;

    permissionsStore = inject(PermissionsStore);

    // Abstract methods
    abstract currentState$$(): OrgSettingsState | CPSettingsState;

    State = State;

    get generalForm(): FormGroup {
        return this.generalComponent?.generalForm;
    }

    get stateForm(): FormGroup {
        return this.generalComponent?.stateForm;
    }

    protected channelPartners$$ = this.store.selectSignal(selectRootChannelPartners);
    protected currentPartner$$: Signal<ChannelPartner> =
        this.store.selectSignal(selectCurrentPartner);
    protected currentPartnerId$$ = this.store.selectSignal(selectCurrentPartnerId);
    protected permissions$$ = computed(() => {
        const {
            canChangeOrganizationState$$,
            canConfigureOrganization$$,
            canChangePartnerState$$,
            canViewPartnerSettings$$,
            canUpdateOrgAccess$$,
        } = this.permissionsStore;
        return {
            canAlterState: canChangeOrganizationState$$() || canChangePartnerState$$(),
            canViewPartnerSettings: canViewPartnerSettings$$(),
            canConfigureOrg: canConfigureOrganization$$(),
            canUpdateAccess: canUpdateOrgAccess$$(),
        };
    });
    protected effectiveState$$ = computed<State>(() => this.currentState$$().item.state);
    protected name$$ = computed<string>(() => this.currentState$$().item.name);
}
