import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { settingsViews } from '@pages/home/home.types';
import {
    ChannelPartner,
    OrgRoleIds,
    Organization,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

const partnerAccess: DropdownItem<string>[] = [
    {
        name: 'Organization Administrator',
        value: OrgRoleIds.OrgAdmin,
    },
    {
        name: 'System Health Viewer',
        value: OrgRoleIds.SysHealthViewer,
    },
    {
        name: 'Service Management Only',
        value: 'serviceManagementOnly',
    },
];

const accessMap: { [key: string]: DropdownItem<string> } = {
    [OrgRoleIds.OrgAdmin]: partnerAccess[0],
    [OrgRoleIds.SysHealthViewer]: partnerAccess[1],
    serviceManagementOnly: partnerAccess[2],
};

@Component({
    selector: 'nx-settings-general',
    templateUrl: 'general.component.html',
    styleUrls: ['../../settings.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        NxGenericDropdownModule,
        NxCheckboxComponent,
        FormsModule,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
    ],
})
export class NxSettingsGeneralComponent implements OnInit {
    partnerAccess = partnerAccess;
    settingsViews = settingsViews;
    @Input() canAccess: string;
    @Input() view: string;
    @Input() item: Organization | ChannelPartner | undefined;
    @Output() updateName = new EventEmitter<string>();
    @Output() updateAccess = new EventEmitter<string>();
    extId: string;
    name: string;
    initialName: string;
    currAccess: DropdownItem<string>;
    changeService: boolean;

    ngOnInit(): void {
        if ('channelPartnerAccessLevel' in this.item) {
            this.currAccess = accessMap[this.item.channelPartnerAccessLevel];
        }
        this.name = this.item?.name;
        this.initialName = this.item?.name;
    }
}
