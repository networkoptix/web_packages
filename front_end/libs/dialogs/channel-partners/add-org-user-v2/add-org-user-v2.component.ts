import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, Inject, WritableSignal, computed, signal } from '@angular/core';
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
import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';
import type {
    GroupItem,
    Organization,
    OrganizationRole,
    OrganizationUser,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxProcessService } from '@services/process.service';
import type { Process } from '@services/process.service/process';
import { icons } from '@static-variables';

import { NxOrgTreeSelectorComponent } from './org-tree-selector/org-tree-selector.component';
import { SelectedFolder } from './org-tree-selector/org-tree-selector.types';

// Potential TODO: Move if needed elsewhere
enum OrgRoleIds {
    OrgAdmin = '00000000-0000-4000-8000-000000000001',
    Admin = '00000000-0000-4000-8000-000000000002',
    PowerUser = '00000000-0000-4000-8000-000000000003',
    SysHealthViewer = '00000000-0000-4000-8000-000000000004',
    AdvancedViewer = '00000000-0000-4000-8000-000000000005',
    Viewer = '00000000-0000-4000-8000-000000000006',
    LiveViewer = '00000000-0000-4000-8000-000000000007',
}

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
    icons = icons;

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

    selectedFolder$$: WritableSignal<SelectedFolder>;

    errorState$$ = computed<{ warning?: string; error?: string }>(() => {
        const [email, role, _folder] = [
            this.userEmail$$(),
            this.selectedRole$$(),
            this.selectedFolder$$(),
        ];
        const { folder, parents } = _folder;

        const state: { warning?: string; error?: string } = {};

        if (folder !== this.organization.id && role === OrgRoleIds.OrgAdmin) {
            state.error = this.translate.instant(
                staticLang.dialogs.channelPartners.restrictedRole,
                {
                    roleName: 'Organization Administrator',
                    orgName: this.organization.name,
                },
            );
        }

        if (!email || !this.userRoles.has(email)) {
            return state;
        }
        const existingUserRoles = this.userRoles.get(email) as Map<string, string>;
        if (existingUserRoles.has(folder)) {
            // User is already in folder
            state.warning = this.translate.instant(
                staticLang.dialogs.channelPartners.directAccess,
                {
                    role: existingUserRoles.get(folder),
                },
            );
        } else if (existingUserRoles.has(this.organization.id)) {
            // User in parent org
            state.error = this.translate.instant(staticLang.dialogs.channelPartners.parentAccess);
        } else if (folder !== this.organization.id) {
            // Check if user in any parent groups
            for (const parent of parents as string[]) {
                if (existingUserRoles.has(parent)) {
                    state.error = this.translate.instant(
                        staticLang.dialogs.channelPartners.parentAccess,
                    );
                    break;
                }
            }
        }

        return state;
    });

    constructor(
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) { organization, roles, users, groups }: DT['data'],
        processService: NxProcessService,
        private translate: TranslateService,
        private cpService: NxChannelPartnersService,
    ) {
        super(dialogRef);
        this.organization = organization;
        this.roles = roles;
        this.selectedRole$$ = signal(roles[0].id);
        this.groups = groups;
        this.users = users as OrganizationUser[];
        this.groups = groups;
        users.forEach(user => {
            if (user.roles[0]) {
                // Has org role, is org user
                this.userRoles.set(user.email, new Map([[organization.id, user.roles[0]]]));
            } else {
                // Otherwise, group user
                this.userRoles.set(
                    user.email,
                    new Map(user.groupRoles.map(r => [r.groupId, r.roles[0]])),
                );
            }
        });

        this.selectedFolder$$ = signal({ folder: organization.id, parents: null });

        this.addOrgUserProcess = processService.createProcess(
            () => {
                const newUser = {
                    email: this.userEmail$$(),
                    roleId: this.selectedRole$$(),
                };
                const { folder } = this.selectedFolder$$();
                if (folder === this.organization.id) {
                    return firstValueFrom(this.cpService.createOrganizationUser(folder, newUser));
                } else {
                    return firstValueFrom(this.cpService.updateGroupUser(folder, newUser));
                }
            },
            {},
            user => {
                this.close(user);
            },
            () => {},
        );
    }
}
