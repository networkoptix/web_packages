import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';

import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxApplyV3Module } from '@components/forms/apply-v3/apply-v3.module';
import { NxFormFieldModule } from '@components/forms/forms.module';
import { NxInputComponent } from '@components/forms/input/input.component';
import { NxValidators } from '@components/forms/validators';
import { createAsyncAction } from '@dialogs/async-action-button/create-async-action';
import LANG from '@language_static';
import { PermissionsStore } from '@pages/home/store/permissions/permissions.store';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import { State } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { icons } from '@static-variables';
import * as cpActions from '@store/channel-partners/channel-partners.actions';
import {
    selectCurrentPartner,
    selectCurrentPartnerParent,
} from '@store/channel-partners/channel-partners.selectors';

import { NxStateSettingBlockComponent } from '../state-setting-block/state-setting-block.component';

@Component({
    selector: 'nx-channel-partners-settings',
    templateUrl: 'channel-partners-settings.component.html',
    styleUrls: ['channel-partners-settings.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        TranslateModule,
        NxContentBlockComponent,
        NxFormFieldModule,
        NxInputComponent,
        NxApplyV3Module,
        NxStateSettingBlockComponent,
    ],
})
export class NxChannelPartnersSettingsComponent {
    LANG = LANG;
    icons = icons;
    State = State;

    private cpService = inject(NxChannelPartnersService);

    private store = inject(Store);
    private permissionsStore = inject(PermissionsStore);
    canConfigureChannelPartner = this.permissionsStore.canConfigureChannelPartner$$;
    canChangePartnerState = this.permissionsStore.canChangePartnerState$$;
    private channelPartner = computed(() => this.store.selectSignal(selectCurrentPartner)()!);
    private parentPartner = this.store.selectSignal(selectCurrentPartnerParent);

    private nameControl = new FormControl(this.channelPartner().name, {
        validators: NxValidators.text(),
        nonNullable: true,
    });
    generalFormGroup = new FormGroup({
        name: this.nameControl,
    });
    saveGeneralAction = createAsyncAction({
        action: () => {
            const name = this.nameControl.value;
            return this.cpService.updateChannelPartner(this.channelPartner().id, { name });
        },
        success: patch => {
            this.store.dispatch(cpActions.patchPartner({ patch }));
        },
    });

    inactiveParentPartner = computed<boolean>(() => {
        /* Special case: root partner is always active, but we might not
        have permission to access it */
        const parent = this.parentPartner();
        return !!(parent && parent.state !== State.Active);
    });
    selectedState = signal<State>(this.channelPartner().state);
    saveStateAction = createAsyncAction({
        action: () => {
            return this.cpService.updateChannelPartner(this.channelPartner().id, {
                state: this.selectedState(),
            });
        },
        success: patch => {
            this.store.dispatch(cpActions.patchPartner({ patch }));
        },
    });
}
