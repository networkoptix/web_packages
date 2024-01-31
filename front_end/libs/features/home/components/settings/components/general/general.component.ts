import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
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
        name: 'Administrator',
        value: OrgRoleIds.Admin,
    },
    {
        name: 'Organization Administrator',
        value: OrgRoleIds.OrgAdmin,
    },
    {
        name: 'Advanced Viewer',
        value: OrgRoleIds.AdvancedViewer,
    },
    {
        name: 'Live Viewer',
        value: OrgRoleIds.LiveViewer,
    },
    {
        name: 'Power User',
        value: OrgRoleIds.PowerUser,
    },
    {
        name: 'System Health Viewer',
        value: OrgRoleIds.SysHealthViewer,
    },
    {
        name: 'Viewer',
        value: OrgRoleIds.Viewer,
    },
];

const accessMap: { [key: string]: DropdownItem<string> } = {
    [OrgRoleIds.Admin]: partnerAccess[0],
    [OrgRoleIds.OrgAdmin]: partnerAccess[1],
    [OrgRoleIds.AdvancedViewer]: partnerAccess[2],
    [OrgRoleIds.LiveViewer]: partnerAccess[3],
    [OrgRoleIds.PowerUser]: partnerAccess[4],
    [OrgRoleIds.SysHealthViewer]: partnerAccess[5],
    [OrgRoleIds.Viewer]: partnerAccess[6],
};

@Component({
    selector: 'nx-settings-general',
    templateUrl: 'general.component.html',
    styleUrls: ['../../settings.component.scss'],
    standalone: true,
    imports: [CommonModule, NxGenericDropdownModule, NxCheckboxComponent, FormsModule],
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
