import { Component, computed, inject, Signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';

import { NxDialogsService } from '@dialogs/dialogs.service';
import staticLang from '@language_static';
import { settingsViews } from '@pages/home/home.types';
import { PermissionsStore } from '@pages/home/store/permissions/permissions.store';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import {
    ChannelPartner,
    State,
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
    protected abstract initProcesses(): void;
    protected store = inject(Store);
    protected processService = inject(NxProcessService);
    protected cpService = inject(NxChannelPartnersService);
    protected dialogsService = inject(NxDialogsService);
    protected translateService = inject(TranslateService);

    readonly LANG = staticLang;
    readonly icons = icons;
    readonly canChangeStateUI = nxConfig.featureFlags.channelPartnersChangeStateUI;
    readonly settingsViews = settingsViews;

    currentName$ = new BehaviorSubject<string | null>(null);
    currentState$ = new BehaviorSubject<State | null>(null);
    permissionsStore = inject(PermissionsStore);

    // Abstract methods
    abstract effectState$$(): State;
    abstract name$$(): string;

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
        } = this.permissionsStore;
        return {
            canAlterState: canChangeOrganizationState$$() || canChangePartnerState$$(),
            canConfigure: canConfigureOrganization$$() || canViewPartnerSettings$$(),
        };
    });

    onNameChange(value: string): void {
        this.currentName$.next(value);
    }

    handleStateUpdate = (state: State): void => {
        this.currentState$.next(state);
    };

    get generalHasChange(): boolean {
        return this.currentName$.value !== this.name$$();
    }

    get stateHasChange(): boolean {
        return this.currentState$.value !== this.effectState$$();
    }

    resetUpdates = (): void => {
        this.currentState$.next(this.effectState$$());
        this.currentName$.next(this.name$$());
    };
}
