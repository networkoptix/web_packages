import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, inject, Inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { NxAsyncSubmitButtonModule } from '@components/forms/buttons/async-submit-button/async-submit-button.module';
import { NxFormFieldModule } from '@components/forms/forms.module';
import { AsyncAction, createAsyncAction } from '@dialogs/async-action-button/create-async-action';
import type { MoveGroupItem as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import LANG from '@language_static';
import { GroupsStore } from '@pages/home/store/groups/groups.store';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import {
    Group,
    GroupItem,
    Organization,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

import { NxOrgTreeSelectorComponent } from '../org-tree-selector/org-tree-selector.component';
import { OrgTreeStatusMap } from '../org-tree-selector/org-tree-selector.types';

@Component({
    selector: 'nx-modal-move-group-item-content',
    templateUrl: 'move-group-item.component.html',
    styleUrl: 'move-group-item.component.scss',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        TranslateModule,
        NxOrgTreeSelectorComponent,
        NxFormFieldModule,
        NxAsyncSubmitButtonModule,
    ],
})
export class MoveGroupItemModalContent extends ModalBase<DT['return']> {
    moveItemAction: AsyncAction<Group>;

    private groupsStore = inject(GroupsStore);

    organization: Organization;
    groups: GroupItem[] = this.groupsStore.sortedGroups$$();
    orgTreeStatuses: OrgTreeStatusMap;
    folderControl = new FormControl<string | null>(null);
    formGroup = new FormGroup({ folder: this.folderControl });

    constructor(
        cpService: NxChannelPartnersService,
        translate: TranslateService,
        public dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) { organization, item }: DT['data'],
    ) {
        super(dialogRef);
        this.organization = organization;

        const orgTreeStatuses: OrgTreeStatusMap = new Map();
        const msg = translate.instant(LANG.dialogs.channelPartners.cannotMoveIntoSelf);
        const status = { status: 'disable' as const, msg };
        orgTreeStatuses.set(item.id, status);
        function recursivelySetChildren(groups: GroupItem[]): void {
            groups.forEach(g => {
                orgTreeStatuses.set(g.id, status);
                recursivelySetChildren(g.children);
            });
        }
        recursivelySetChildren(item.children);
        this.orgTreeStatuses = orgTreeStatuses;

        this.moveItemAction = createAsyncAction({
            action: () => {
                const parentId =
                    this.folderControl.value === organization.id ? null : this.folderControl.value;
                return firstValueFrom(cpService.patchGroup(item.id, { parentId }));
            },
            success: res => this.close(res),
        });
    }
}
