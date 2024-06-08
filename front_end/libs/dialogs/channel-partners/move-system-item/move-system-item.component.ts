import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, Inject, WritableSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { NxAsyncActionButtonComponent } from '@dialogs/async-action-button/async-action-button.component';
import { AsyncAction, createAsyncAction } from '@dialogs/async-action-button/create-async-action';
import type { MoveSystemItem as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import LANG from '@language_static';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import {
    CloudSystem,
    GroupItem,
    Organization,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

import { NxOrgTreeSelectorComponent } from '../org-tree-selector/org-tree-selector.component';
import { OrgTreeStatusMap } from '../org-tree-selector/org-tree-selector.types';

@Component({
    selector: 'nx-modal-move-system-item-content',
    templateUrl: 'move-system-item.component.html',
    standalone: true,
    imports: [
        NxAsyncActionButtonComponent,
        FormsModule,
        TranslateModule,
        NxOrgTreeSelectorComponent,
    ],
})
export class MoveSystemItemModalContent extends ModalBase<DT['return']> {
    moveSystemItemAction: AsyncAction<CloudSystem>;

    organization: Organization;
    groups: GroupItem[];
    orgTreeStatuses: OrgTreeStatusMap;
    selectedFolder: WritableSignal<string>;

    constructor(
        cpService: NxChannelPartnersService,
        translate: TranslateService,
        public dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) { organization, groups, item }: DT['data'],
    ) {
        super(dialogRef);
        this.organization = organization;
        this.groups = groups;
        this.selectedFolder = signal(
            item.groupId === null && groups.length ? groups[0].id : organization.id,
        );
        const itemId = item.groupId ?? item.organizationId;
        // Try to avoid starting with error state

        this.orgTreeStatuses = new Map([
            [
                itemId,
                {
                    status: 'disable',
                    msg: translate.instant(LANG.dialogs.channelPartners.systemAlreadyInFolder),
                },
            ],
        ]);

        this.moveSystemItemAction = createAsyncAction({
            action: () => {
                const groupId =
                    this.selectedFolder() === organization.id ? null : this.selectedFolder();
                return firstValueFrom(cpService.updateSystemGroup(item.systemId, { groupId }));
            },
            success: res => this.close(res),
        });
    }
}
