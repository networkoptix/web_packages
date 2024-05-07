import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, Inject, WritableSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { NxAsyncActionButtonComponent } from '@dialogs/async-action-button/async-action-button.component';
import { AsyncAction, createAsyncAction } from '@dialogs/async-action-button/create-async-action';
import type { MoveGroupItem as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import LANG from '@language_static';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import {
    Group,
    GroupItem,
    Organization,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

import { NxOrgTreeSelectorV0Component } from '../org-tree-selector-v0/org-tree-selector.component';
import type { OrgTreeStatuses } from '../org-tree-selector-v0/org-tree-selector.types';

@Component({
    selector: 'nx-modal-move-group-item-content',
    templateUrl: 'move-group-item.component.html',
    standalone: true,
    imports: [
        NxOrgTreeSelectorV0Component,
        NxAsyncActionButtonComponent,
        FormsModule,
        TranslateModule,
    ],
})
export class MoveGroupItemModalContent extends ModalBase<DT['return']> {
    moveGroupItemAction: AsyncAction<Group>;

    organization: Organization;
    groups: GroupItem[];
    orgTreeStatuses: OrgTreeStatuses;
    selectedFolder: WritableSignal<string>;

    constructor(
        cpService: NxChannelPartnersService,
        translate: TranslateService,
        public override dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) { organization, groups, item }: DT['data'],
    ) {
        super(dialogRef);
        this.organization = organization;
        this.groups = groups;
        this.selectedFolder = signal(organization.id);

        const orgTreeStatuses: OrgTreeStatuses = new Map();
        const msg = translate.instant(LANG.dialogs.channelPartners.cannotMoveIntoSelf);
        const status = { type: 'error' as const, msg };
        orgTreeStatuses.set(item.id, status);
        function recursivelySetChildren(groups: GroupItem[]): void {
            groups.forEach(g => {
                orgTreeStatuses.set(g.id, status);
                recursivelySetChildren(g.children);
            });
        }
        recursivelySetChildren(item.children);
        this.orgTreeStatuses = orgTreeStatuses;

        this.moveGroupItemAction = createAsyncAction({
            action: () => {
                const parentId =
                    this.selectedFolder() === organization.id ? null : this.selectedFolder();
                return firstValueFrom(cpService.patchGroup(item.id, { parentId }));
            },
            success: res => this.close(res),
        });
    }
}
