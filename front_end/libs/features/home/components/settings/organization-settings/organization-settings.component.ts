import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LetDirective } from '@ngrx/component';
import { Store } from '@ngrx/store';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NgxTranslateCutModule } from 'ngx-translate-cut';
import { firstValueFrom } from 'rxjs';

import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxApplyV3Module } from '@components/forms/apply-v3/apply-v3.module';
import {
    errorMatcherFactory,
    type ControlState,
} from '@components/forms/form-field/error-state-matcher';
import { NxFormFieldModule } from '@components/forms/forms.module';
import { NxInputComponent } from '@components/forms/input/input.component';
import { NxValidators } from '@components/forms/validators';
import { NxSelectV2ItemComponent } from '@components/select-v2/items/select-item/select-item.component';
import { NxSelectV2Component } from '@components/select-v2/select-v2.component';
import { createAsyncAction } from '@dialogs/async-action-button/create-async-action';
import { NxDialogsService } from '@dialogs/dialogs.service';
import LANG from '@language_static';
import { OrgUsersStore } from '@pages/home/store/org-users/org-users.store';
import { PermissionsStore } from '@pages/home/store/permissions/permissions.store';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import {
    OrgRoleIds,
    State,
    UpdateOrganization,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { icons } from '@static-variables';
import { selectCurrentUser } from '@store/account/account.selectors';
import * as cpActions from '@store/channel-partners/channel-partners.actions';
import {
    selectCurrentOrganization,
    selectCurrentPartner,
} from '@store/channel-partners/channel-partners.selectors';
import { formControlValueSignal, keyValueNoSort } from '@utils/nx';

import { NxStateSettingBlockComponent } from '../state-setting-block/state-setting-block.component';

@Component({
    selector: 'nx-organization-settings',
    templateUrl: 'organization-settings.component.html',
    styleUrls: ['organization-settings.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,

        AngularSvgIconModule,
        LetDirective,
        NgxTranslateCutModule,
        TranslateModule,

        NxContentBlockComponent,
        NxFormFieldModule,
        NxInputComponent,
        NxSelectV2Component,
        NxSelectV2ItemComponent,
        NxStateSettingBlockComponent,
        NxApplyV3Module,
    ],
})
export class NxOrganizationSettingsComponent {
    LANG = LANG;
    icons = icons;
    State = State;

    private router = inject(Router);
    protected translateService = inject(TranslateService);
    private cpService = inject(NxChannelPartnersService);
    private dialogsService = inject(NxDialogsService);

    private store = inject(Store);
    private orgUserStore = inject(OrgUsersStore);
    private permissionsStore = inject(PermissionsStore);
    private account = this.store.selectSignal(selectCurrentUser);
    canConfigureOrg = this.permissionsStore.canConfigureOrganization$$;
    canUpdateOrgAccess = this.permissionsStore.canUpdateOrgAccess$$;
    canChangeOrgState = this.permissionsStore.canChangeOrganizationState$$;

    // Flag/permission not yet implemented
    disconnectAccountFlag = false;
    canDisconnectAccount = signal(false);

    private organization = computed(() => this.store.selectSignal(selectCurrentOrganization)()!);

    private nameControl = new FormControl(this.organization().name, {
        validators: NxValidators.text(),
        nonNullable: true,
    });

    private hasAdminUsers = computed<boolean>(() =>
        this.orgUserStore
            .currentGroupUsersEntities()
            .some(u => u.rolesIds.includes(OrgRoleIds.OrgAdmin)),
    );

    private accessLevelControl = new FormControl<string>(
        String(this.organization().channelPartnerAccessLevel), // Convert null to "null" for indexing
        {
            nonNullable: true,
            validators: [
                ({ value }: { value: string }) => {
                    if (value !== OrgRoleIds.OrgAdmin && !this.hasAdminUsers()) {
                        this.store.dispatch(
                            cpActions.showBannerAction({
                                banner: {
                                    message: this.LANG.channelPartners.orgs.adminWarning,
                                    icon: 'error.svg',
                                    type: 'error',
                                    page: 'organization',
                                },
                            }),
                        );
                        return { willRemoveAllAdmins: true };
                    } else {
                        this.store.dispatch(cpActions.hideBannerAction());
                        return null;
                    }
                },
            ],
        },
    );
    accessLevel = formControlValueSignal(this.accessLevelControl);

    accessLevelErrorMatcher = errorMatcherFactory({ onChange: ['willRemoveAllAdmins'] });
    // No error messages, design wants an error banner instead

    accessItems2 = LANG.channelPartners.orgs.channelPartnerAccessInfo;
    nosort = keyValueNoSort;
    accessLevelMessageKey = computed<ControlState>(() => ({ key: this.accessLevel() }));

    generalFormGroup = new FormGroup({
        name: this.nameControl,
        accessLevel: this.accessLevelControl,
    });

    private confirmAccessLevelChange(): Promise<boolean> {
        const { title, message, footer } =
            this.LANG.dialogs.channelPartners.confirmAccessLevelChange;
        return this.dialogsService.confirm({
            title: this.translateService.instant(title),
            message: {
                value: this.translateService.instant(message),
            },
            footer,
        });
    }

    saveGeneralAction = createAsyncAction({
        action: async () => {
            const isPartnerUser = !!this.store.selectSignal(selectCurrentPartner)();
            const confirm = await (isPartnerUser && this.accessLevel() !== OrgRoleIds.OrgAdmin
                ? this.confirmAccessLevelChange()
                : Promise.resolve(true));
            if (confirm) {
                const updateBody: UpdateOrganization = {};
                const { id, name, channelPartnerAccessLevel } = this.organization();
                if (name !== this.nameControl.value) {
                    updateBody.name = this.nameControl.value;
                }
                if (channelPartnerAccessLevel !== this.accessLevelControl.value) {
                    const accessLevel = this.accessLevelControl.value;
                    updateBody.channelPartnerAccessLevel =
                        accessLevel === 'null' ? null : accessLevel;
                }
                return firstValueFrom(this.cpService.updateOrganization(id, updateBody));
            } else {
                return Promise.reject();
            }
        },
        success: patch => {
            this.store.dispatch(cpActions.patchOrganization({ patch }));
        },
        error: () => {},
    });

    inactiveChannelPartner = computed(
        () => this.store.selectSignal(selectCurrentPartner)()!.state !== State.Active,
    );
    selectedState = signal<State>(this.organization().state);

    saveStateAction = createAsyncAction({
        action: () =>
            this.cpService.updateOrganization(this.organization().id, {
                state: this.selectedState(),
            }),
        success: patch => {
            this.store.dispatch(cpActions.patchOrganization({ patch }));
        },
    });

    disconnect(): void {
        const { title, message, footer } = this.LANG.dialogs.channelPartners.disconnectOrganization;
        const { id } = this.organization();
        const { email } = this.account();
        this.dialogsService
            .confirm({
                title,
                message,
                footer: {
                    actionLabel: footer.actionLabel,
                    cancelLabel: footer.cancelLabel,
                    buttonClass: 'btn-danger',
                },
            })
            .then(confirm => {
                if (confirm) {
                    this.cpService.deleteOrganizationUser(id, email).subscribe({
                        next: () => {
                            this.store.dispatch(cpActions.removeRootOrganization({ id }));
                            this.router.navigateByUrl('');
                        },
                        error: () => {
                            this.store.dispatch(
                                cpActions.showBannerAction({
                                    banner: {
                                        message: this.LANG.channelPartners.orgs.adminWarning,
                                        icon: 'error.svg',
                                        type: 'error',
                                        page: 'organization',
                                    },
                                }),
                            );
                        },
                    });
                }
            });
    }
}
