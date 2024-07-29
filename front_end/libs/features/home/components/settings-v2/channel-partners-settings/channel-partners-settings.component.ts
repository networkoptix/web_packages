import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { LetDirective } from '@ngrx/component';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NgxTranslateCutModule } from 'ngx-translate-cut';
import { distinctUntilChanged, firstValueFrom, map, of } from 'rxjs';

import * as cpActions from '@common/store/channel-partners/channel-partners.actions';
import {
    selectCurrentPartnerParent,
    selectCurrentSubChannelPartners,
} from '@common/store/channel-partners/channel-partners.selectors';
import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import { NxFocusMeDirective } from '@directives/nx-focus-me';
import { SettingsBase } from '@pages/home/components/settings-v2/settings-base/settings-base';
import { settingsViews } from '@pages/home/home.types';
import {
    ChannelPartner,
    State,
    UpdateChannelPartner,
    CPSettingsState,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { Process } from '@services/process.service/process';

import { NxSettingsGeneralV2Component } from '../../settings-v2/components/general/general.component';

/** @deprecated */
@Component({
    selector: 'nx-channel-partners-settings',
    templateUrl: 'channel-partners-settings.component.html',
    styleUrls: ['channel-partners-settings.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        NxSettingsGeneralV2Component,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
        TranslateModule,
        AngularSvgIconModule,
        FormsModule,
        LetDirective,
        MatButtonToggle,
        MatButtonToggleGroup,
        NgxTranslateCutModule,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        NxFocusMeDirective,
        NxGenericDropdownModule,
    ],
})
export class NxChannelPartnersSettingsComponent extends SettingsBase implements OnInit {
    parentPartner$$ = this.store.selectSignal(selectCurrentPartnerParent);
    subchannelPartners$$ = this.store.selectSignal(selectCurrentSubChannelPartners);
    updateStateProcess: Process;
    updateCPProcess: Process;
    // eslint-disable-next-line nx/signal-naming-convention
    subchannelSettings = input<boolean>();

    subChannelId$$ = toSignal(
        this.cpService.paramStateHandler.state$.pipe(
            map(({ params: { subChannelId } }) => subChannelId),
            distinctUntilChanged(),
        ),
    );

    currentState$$ = computed<CPSettingsState>(() => {
        const currentPartner = this.currentPartner$$();
        const parentPartner = this.parentPartner$$();
        const state: CPSettingsState = {
            canUpdateStatus: parentPartner?.effectiveState === 'active',
        };

        // Leaving subChannels in this component for now because they will be removed altogether later on.

        if (this.subchannelSettings()) {
            const subchannelsMap = new Map<string, ChannelPartner>(
                this.subchannelPartners$$().map(partner => [partner.id, partner]),
            );
            state.item = subchannelsMap.get(this.subChannelId$$());
            state.view = settingsViews.SUBCHANNELS;
        } else {
            state.item = currentPartner;
            state.view = settingsViews.CHANNEL_PARTNERS;
        }
        return state;
    });

    State = State;
    ngOnInit(): void {
        this.initProcesses();
    }

    initProcesses(): void {
        this.updateStateProcess = this.processService.createProcess(
            () => {
                const currentState = this.currentState$$();
                switch (currentState.view) {
                    case this.settingsViews.CHANNEL_PARTNERS:
                        return this.updateCPState();
                    case this.settingsViews.SUBCHANNELS:
                        return this.updateSubchannelState(currentState);
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
                }
                this.resetStateUpdates();
            },
            () => {},
        );
        this.updateCPProcess = this.processService.createProcess(
            () => {
                const currentState = this.currentState$$();
                switch (currentState.view) {
                    case this.settingsViews.CHANNEL_PARTNERS:
                        return this.updateChannelPartner();
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
                }
                this.resetStateUpdates();
            },
            () => {},
        );
    }

    override resetGeneralUpdates = (): void => {
        this.generalForm.reset({
            name: this.name$$(),
        });
    };

    override resetStateUpdates = (): void => {
        this.stateForm.reset({
            stateToggle: this.effectiveState$$(),
        });
    };

    // Process helper functions
    updateChannelPartner(): Promise<ChannelPartner> {
        const cpBody: UpdateChannelPartner = {};
        if (this.name$$() !== this.generalForm?.get('name')?.value) {
            cpBody.name = this.generalForm?.get('name')?.value;
        }
        // Todo: add extId to body when API is ready
        return firstValueFrom(
            this.cpService.updateChannelPartner(this.currentPartnerId$$(), cpBody),
        );
    }

    updateCPState(): Promise<ChannelPartner> {
        const cpBody: UpdateChannelPartner = {};
        if (this.effectiveState$$() !== this.stateForm?.get('stateToggle')?.value) {
            cpBody.state = this.stateForm?.get('stateToggle')?.value;
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

    updateSubchannel(currentState: CPSettingsState): Promise<ChannelPartner> {
        const subchannelBody: UpdateChannelPartner = {};
        if (this.name$$() !== this.generalForm?.get('name')?.value) {
            subchannelBody.name = this.generalForm?.get('name')?.value;
        }
        return firstValueFrom(
            this.cpService.updateChannelPartner(currentState.item?.id, subchannelBody),
        );
    }

    updateSubchannelState(currentState: CPSettingsState): Promise<ChannelPartner> {
        const subchannelBody: UpdateChannelPartner = {};
        if (this.effectiveState$$() !== this.stateForm?.get('stateToggle')?.value) {
            subchannelBody.state = this.stateForm?.get('stateToggle')?.value;
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
            cpActions.setCurrentSubChannelPartners({
                currentSubchannels: subchannelPartners,
            }),
        );
    }
}
