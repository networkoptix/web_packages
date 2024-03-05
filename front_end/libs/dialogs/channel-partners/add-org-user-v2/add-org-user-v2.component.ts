import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, Inject, WritableSignal, computed, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LetDirective } from '@ngrx/component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { firstValueFrom } from 'rxjs';

import { NxDropdownModule } from '@components/dropdownV2/dropdown.module';
import { NxEmailComponent } from '@components/email-input/email.component';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import type { AddOrgUserV2 as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import { NxFocusMeDirective } from '@directives/nx-focus-me';
import staticLang from '@language_static';
import { OrgUsersStore } from '@pages/home/store/org-users/org-users.store';
import { NxAccountService } from '@services/account.service';
import {
    OrgRoleIds,
    type GroupItem,
    type Organization,
    type OrganizationRole,
    type OrganizationUser,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxProcessService } from '@services/process.service';
import type { Process } from '@services/process.service/process';
import { icons } from '@static-variables';

import { NxOrgTreeSelectorComponent } from './org-tree-selector/org-tree-selector.component';
import { OrgTreeStatuses } from './org-tree-selector/org-tree-selector.types';

@Component({
    selector: 'nx-add-org-user-v2',
    templateUrl: 'add-org-user-v2.component.html',
    styleUrls: ['add-org-user-v2.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,

        TranslateModule,
        AngularSvgIconModule,
        LetDirective,

        NxFocusMeDirective,
        NxEmailComponent,
        NxDropdownModule,
        NxOrgTreeSelectorComponent,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
    ],
})
export class NxAddOrgUserV2ModalContent extends ModalBase<DT['return']> {
    orgUserStore = inject(OrgUsersStore);
    icons = icons;
    emailDisabled = false;

    userEmail$$ = signal('');
    roles: OrganizationRole[];
    users: OrganizationUser[];
    /* Key  : User email
     * Value: Key  : Org/group id
     *        Value: Role name
     */
    /** Roles existing users have, not roles for users */
    userRoles = new Map<string, Map<string, string>>();
    selectedRole$$: WritableSignal<string>;

    addOrgUserProcess: Process;

    organization: Organization;
    groups: GroupItem[];

    selectedFolder$$: WritableSignal<string>;

    private selfAddMsg = this.translate.instant(staticLang.dialogs.channelPartners.selfAdd);
    private parentAccessMsg = this.translate.instant(
        staticLang.dialogs.channelPartners.parentAccess,
    );
    private restrictedRoleMsg: string;

    orgTreeStatuses$$ = computed<OrgTreeStatuses>(() => {
        const [email, role] = [this.userEmail$$(), this.selectedRole$$()];

        const statuses: OrgTreeStatuses = new Map();

        function cascadeGroupErrors(group: GroupItem, msg: string): void {
            statuses.set(group.id, {
                type: 'error',
                msg,
            });
            group.children.forEach(group => cascadeGroupErrors(group, msg));
        }

        if (this.account.email === email) {
            statuses.set(this.organization.id, {
                type: 'error',
                msg: this.selfAddMsg,
            });

            this.groups.forEach(group => cascadeGroupErrors(group, this.selfAddMsg));
            return statuses;
        }

        const existingUserRoles = this.userRoles.get(email);
        if (existingUserRoles) {
            if (existingUserRoles.has(this.organization.id)) {
                statuses.set(this.organization.id, {
                    type: 'warn',
                    msg: this.translate.instant(staticLang.dialogs.channelPartners.directAccess, {
                        role: existingUserRoles.get(this.organization.id),
                    }),
                });
                this.groups.forEach(group => cascadeGroupErrors(group, this.parentAccessMsg));
            } else if (role !== OrgRoleIds.OrgAdmin) {
                const findDirectAccessGroups = (groups: GroupItem[]): void => {
                    for (const group of groups) {
                        if (existingUserRoles.has(group.id)) {
                            statuses.set(group.id, {
                                type: 'warn',
                                msg: this.translate.instant(
                                    staticLang.dialogs.channelPartners.directAccess,
                                    {
                                        role: existingUserRoles.get(group.id),
                                    },
                                ),
                            });
                            group.children.forEach(group =>
                                cascadeGroupErrors(group, this.parentAccessMsg),
                            );
                        } else {
                            findDirectAccessGroups(group.children);
                        }
                    }
                };
                findDirectAccessGroups(this.groups);
            }
        }

        if (role === OrgRoleIds.OrgAdmin) {
            this.groups.forEach(group => cascadeGroupErrors(group, this.restrictedRoleMsg));
        }

        return statuses;
    });
    selectedFolderError$$ = computed(() => {
        const [orgTreeErrors, folder] = [this.orgTreeStatuses$$(), this.selectedFolder$$()];
        return orgTreeErrors.get(folder)?.type === 'error';
    });

    constructor(
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) { organization, roles, users, groups, email }: DT['data'],
        processService: NxProcessService,
        private translate: TranslateService,
        private account: NxAccountService,
    ) {
        super(dialogRef);
        this.organization = organization;
        this.roles = roles;
        this.selectedRole$$ = signal(roles[0].id);
        this.users = users as OrganizationUser[];
        this.groups = groups;
        if (email) {
            this.userEmail$$.set(email);
            this.emailDisabled = true;
        }
        users.forEach(user => {
            if (user.groupRoles?.length) {
                // Otherwise, group user
                this.userRoles.set(
                    user.email,
                    new Map(user.groupRoles.map(r => [r.groupId, r.roles[0]])),
                );
            } else if (user.roles?.length) {
                // Has org role, is org user
                this.userRoles.set(user.email, new Map([[organization.id, user.roles[0]]]));
            }
        });

        this.restrictedRoleMsg = translate.instant(
            staticLang.dialogs.channelPartners.restrictedRole,
            {
                roleName: 'Organization Administrator',
                orgName: organization.name,
            },
        );

        this.selectedFolder$$ = signal(organization.id);

        this.addOrgUserProcess = processService.createProcess(
            () => {
                const newUser = {
                    email: this.userEmail$$(),
                    roleId: this.selectedRole$$(),
                };
                const folder = this.selectedFolder$$();
                return firstValueFrom(
                    this.orgUserStore.addUser(this.organization, folder, newUser),
                );
            },
            {},
            user => {
                this.close(user);
            },
            () => {},
        );
    }
}
