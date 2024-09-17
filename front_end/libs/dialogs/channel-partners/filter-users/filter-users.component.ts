import { DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';

import { NxFormFieldModule } from '@components/forms/forms.module';
import { NxInputComponent } from '@components/forms/input/input.component';
import { NxValidators } from '@components/forms/validators';
import { NxSelectV2ItemComponent } from '@components/select-v2/items/select-item/select-item.component';
import { NxSelectV2Component } from '@components/select-v2/select-v2.component';
import { UserFilter } from '@dialogs/channel-partners/filter-users/filter-users.types';
import { NxOrgTreeSelectorComponent } from '@dialogs/channel-partners/org-tree-selector/org-tree-selector.component';
import type { FilterUsers as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import staticLang from '@language_static';
import { GroupsStore } from '@pages/home/store/groups/groups.store';
import { PipesModule } from '@pipes/pipes.module';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import { selectCurrentOrganization } from '@store/channel-partners/channel-partners.selectors';
import { formControlValueSignal } from '@utils/nx';

@Component({
    selector: 'nx-modal-filter-users-content',
    templateUrl: 'filter-users.component.html',
    styleUrls: ['filter-users.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        NxSelectV2Component,
        NxSelectV2ItemComponent,
        ReactiveFormsModule,
        NxOrgTreeSelectorComponent,
        NxFormFieldModule,
        NxInputComponent,
        PipesModule,
    ],
})
export class NxFilterUsersModalContent extends ModalBase<DT['return']> {
    protected readonly LANG = staticLang;

    private store = inject(Store);
    private cpService = inject(NxChannelPartnersService);
    private groupsStore = inject(GroupsStore);
    private groupFlatMap$$ = this.groupsStore.groupFlatMap$$;
    groups$$ = this.groupsStore.sortedGroups$$;
    orgRoles$$ = this.cpService.organizationRoles$$;
    organization$$ = this.store.selectSignal(selectCurrentOrganization);
    treeValue$$ = signal<string | null>(null);
    filterByFolderName$$ = computed(() => {
        const folderId = this.treeValue$$();
        if (folderId) {
            return this.groupFlatMap$$()[folderId]?.name;
        }
        return '';
    });

    roleIdControl = new FormControl<string | null>(null);
    // roleDescription$$ = computed<string>(() => {
    //     const filteredRoleId = this.filterByRoleId$$();
    //     if (!filteredRoleId) {
    //         return '';
    //     }
    //     return this.LANG.channelPartners.orgs.orgRoleInfo[filteredRoleId].description;
    // });

    filterByRoleName$$ = computed<string>(() => {
        const [orgRoles, roleId] = [this.orgRoles$$(), this.filterByRoleId$$()];
        if (!roleId) {
            return '';
        }
        return orgRoles.find(role => role.id === roleId)!.name;
    });

    nameControl = new FormControl('', { nonNullable: true });

    emailControl = new FormControl('', {
        validators: NxValidators.email(),
        nonNullable: true,
    });

    filterByRoleId$$ = formControlValueSignal(this.roleIdControl);

    folderControl = new FormControl<string | null>(null);

    formGroup = new FormGroup({
        email: this.emailControl,
        name: this.nameControl,
        roleId: this.roleIdControl,
        folder: this.folderControl,
    });

    values$$ = computed<UserFilter[]>(() => {
        const name = this.nameControl.value;
        const email = this.emailControl.value;
        const roleId = this.roleIdControl.value || '';
        const folderId = this.treeValue$$() || '';

        return [
            {
                group: 'email',
                id: email,
                value: email,
                selected: !!email,
            },
            {
                group: 'name',
                id: name,
                value: name,
                selected: !!name,
            },
            {
                group: 'role',
                id: roleId,
                value: this.filterByRoleName$$(),
                selected: !!roleId,
            },
            {
                group: 'folder',
                id: folderId,
                value: this.filterByFolderName$$(),
                selected: !!folderId,
            },
        ];
    });

    constructor(dialogRef: DialogRef<DT['return']>) {
        super(dialogRef);
    }

    setFilters(): void {
        this.close(this.values$$());
    }
}
