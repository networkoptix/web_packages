import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';

import { BaseApplyV3Page } from '@components/forms/apply-v3/apply-v3-page';
import { createAsyncAction } from '@dialogs/async-action-button/create-async-action';
import { PermissionsStore } from '@pages/home/store/permissions/permissions.store';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import { State } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import * as cpActions from '@store/channel-partners/channel-partners.actions';
import {
    selectCurrentPartnerParent,
    selectCurrentSubChannel,
} from '@store/channel-partners/channel-partners.selectors';

import { NxStateSettingBlockComponent } from '../state-setting-block/state-setting-block.component';

@Component({
    selector: 'nx-subchannel-settings',
    templateUrl: 'subchannel-settings.component.html',
    styleUrls: ['subchannel-settings.component.scss'],
    standalone: true,
    imports: [CommonModule, NxStateSettingBlockComponent],
})
export class NxSubchannelSettingsComponent extends BaseApplyV3Page {
    private cpService = inject(NxChannelPartnersService);

    private store = inject(Store);
    private permissionsStore = inject(PermissionsStore);
    private subChannel = computed(() => this.store.selectSignal(selectCurrentSubChannel)()!);
    private parentPartner = this.store.selectSignal(selectCurrentPartnerParent);
    canChangePartnerState = this.permissionsStore.canChangePartnerState$$;

    inactiveParentPartner = computed<boolean>(() => {
        /* Special case: root partner is always active, but we might not
        have permission to access it */
        const parent = this.parentPartner();
        return !!(parent && parent.state !== State.Active);
    });
    selectedState = signal<State>(this.subChannel().state);
    saveStateAction = createAsyncAction({
        action: () => {
            return this.cpService.updateChannelPartner(this.subChannel().id, {
                state: this.selectedState(),
            });
        },
        success: patch => {
            this.store.dispatch(cpActions.patchSubChannel({ patch }));
        },
    });
}
