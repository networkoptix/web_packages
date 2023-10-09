import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, firstValueFrom, of } from 'rxjs';

import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import { settingsViews } from '@pages/home/home.types';
import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';
import {
    selectCurrentOrganization,
    selectCurrentPartner,
    selectCurrentPartnerId,
} from '@pages/home/store/channel-partners/channel-partners.selectors';
import {
    ChannelPartner,
    Organization,
    State,
    UpdateChannelPartner,
    UpdateOrganization,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';

import { NxSettingsGeneralComponent } from './components/general/general.component';
import { NxSettingsStateComponent } from './components/state/state.component';

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
    settingsViews = settingsViews;
    currentPartner$$ = this.store.selectSignal(selectCurrentPartner);
    currentPartnerId$$ = this.store.selectSignal(selectCurrentPartnerId);
    currentOrg$$ = this.store.selectSignal(selectCurrentOrganization);
    updatedName = new BehaviorSubject<string>(null);
    updatedExtId = new BehaviorSubject<string>(null);
    updatedPartnerAccess = new BehaviorSubject<boolean>(null);
    updatedState = new BehaviorSubject<State>(null);
    updatedChangeService = new BehaviorSubject<boolean>(null);
    updateStateProcess: Process;

    @Input() cpSettings: boolean;
    @Input() orgSettings: boolean;
    @Input() subchannelSettings: boolean;
    currentView: string;
    currentItem: ChannelPartner | Organization;
    canUpdateStatus: boolean;
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
                switch (this.currentView) {
                    case this.settingsViews.CHANNEL_PARTNERS:
                        const cpBody: UpdateChannelPartner = {};
                        cpBody.name = this.updatedName.value;
                        // Todo: add extId to body when API is ready
                        return firstValueFrom(
                            this.cpService.updateChannelPartner(this.currentPartnerId$$(), cpBody),
                        );
                    case this.settingsViews.ORGANIZATIONS:
                        // Todo: add handler to compare updated values to current values to avoid unnecessary API call
                        const orgBody: UpdateOrganization = {};
                        const currOrg = this.currentOrg$$();
                        orgBody.state = this.updatedState.value || currOrg.effectiveState;
                        orgBody.channelPartnerCanAdminister =
                            this.updatedPartnerAccess.value !== null
                                ? this.updatedPartnerAccess.value
                                : currOrg.channelPartnerCanAdminister;
                        orgBody.name = this.updatedName.value || currOrg.name;
                        return firstValueFrom(
                            this.cpService.updateOrganization(currOrg.id, orgBody),
                        );
                    case this.settingsViews.SUBCHANNELS:
                        break;
                    default:
                        console.error('Invalid current view');
                }
                return firstValueFrom(of(true));
            },
            {},
            () => {},
            () => {},
        );
        if (this.cpSettings) {
            this.currentView = this.settingsViews.CHANNEL_PARTNERS;
            this.currentItem = this.currentPartner$$();
        } else if (this.orgSettings) {
            this.currentView = this.settingsViews.ORGANIZATIONS;
            this.currentItem = this.currentOrg$$();
            // Todo: update this from API?
            this.canUpdateStatus = true;
        } else if (this.subchannelSettings) {
            this.currentView = this.settingsViews.SUBCHANNELS;
            this.canUpdateStatus = true;
        }
    }

    handleUpdate = (
        subject: BehaviorSubject<string | State | boolean>,
        val: string | boolean | State,
    ): void => {
        this.hasUpdate = true;
        subject.next(val);
    };
}
