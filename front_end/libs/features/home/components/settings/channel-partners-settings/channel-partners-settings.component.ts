import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { catchError, map, of } from 'rxjs';

import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { BaseApplyV3Page } from '@components/forms/apply-v3/apply-v3-page';
import { NxApplyV3Module } from '@components/forms/apply-v3/apply-v3.module';
import { NxFormFieldModule } from '@components/forms/forms.module';
import { NxInputComponent } from '@components/forms/input/input.component';
import { NxValidators } from '@components/forms/validators';
import { createAsyncAction } from '@dialogs/async-action-button/create-async-action';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxThemeAttributeDirective } from '@directives/theme-attribute.directive';
import LANG from '@language_static';
import { PermissionsStore } from '@pages/home/store/permissions/permissions.store';
import { NxAccountService } from '@services/account.service';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import {
    ChannelPartnerRoleIds,
    State,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
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
        NxContentBlockSectionComponent,
    ],
    hostDirectives: [NxThemeAttributeDirective],
})
export class NxChannelPartnersSettingsComponent extends BaseApplyV3Page {
    LANG = LANG;
    icons = icons;
    State = State;

    private cpService = inject(NxChannelPartnersService);

    private store = inject(Store);
    private permissionsStore = inject(PermissionsStore);
    private dialogServce = inject(NxDialogsService);
    private accountService = inject(NxAccountService);
    private translateService = inject(TranslateService);
    private router = inject(Router);

    canConfigureChannelPartner = this.permissionsStore.canConfigureChannelPartner$$;
    canChangePartnerState = this.permissionsStore.canChangePartnerState$$;
    private channelPartner = computed(() => this.store.selectSignal(selectCurrentPartner)()!);
    private parentPartner = this.store.selectSignal(selectCurrentPartnerParent);
    canDisconnectFromPartner = toSignal(
        this.cpService.getChannelPartnerUsers(this.channelPartner().id).pipe(
            catchError(() => of(null)),
            map(users => {
                if (
                    !users ||
                    this.channelPartner().ownRolesIds[0] !== ChannelPartnerRoleIds.ADMINISTRATOR
                ) {
                    return true;
                }
                let admins = 0;
                for (const user of users) {
                    if (user.rolesIds[0] === ChannelPartnerRoleIds.ADMINISTRATOR) {
                        admins += 1;
                        if (admins > 1) {
                            return true;
                        }
                    }
                }
                return false;
            }),
        ),
    );

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
    openDisconnectDialog = (): void => {
        const { id, name } = this.channelPartner();
        const {
            partnerTitle: title,
            message,
            footer,
        } = this.LANG.dialogs.channelPartners.disconnectEntity;
        const { actionLabel, cancelLabel } = footer;
        this.dialogServce
            .confirm({
                title,
                message: this.translateService.instant(message, { entityName: name }),
                footer: {
                    actionLabel,
                    cancelLabel,
                    buttonClass: 'nx-button--danger',
                },
            })
            .then(confirm => {
                if (confirm) {
                    this.cpService
                        .deleteChannelPartnerUser(id, this.accountService.email)
                        .subscribe({
                            next: () => {
                                this.router.navigate(['/']).then(() => {
                                    this.store.dispatch(
                                        cpActions.removePartner({ id: this.channelPartner().id }),
                                    );
                                });
                            },
                            error: () => {
                                this.store.dispatch(
                                    cpActions.showBannerAction({
                                        banner: {
                                            message:
                                                this.LANG.channelPartners.settings.adminWarning,
                                            icon: 'error.svg',
                                            type: 'error',
                                            page: 'channel-partner',
                                        },
                                    }),
                                );
                            },
                        });
                }
            });
    };
}
