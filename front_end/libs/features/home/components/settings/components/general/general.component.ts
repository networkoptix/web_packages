import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { settingsViews } from '@pages/home/home.types';
import {
    ChannelPartner,
    Organization,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

const partnerAccess: DropdownItem<boolean>[] = [
    {
        name: 'Yes',
        value: true,
    },
    {
        name: 'No',
        value: false,
    },
];

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
    @Input() item: Organization | ChannelPartner;
    @Output() updateName = new EventEmitter<string>();
    @Output() updateAccess = new EventEmitter<boolean>();
    @Output() updateExtId = new EventEmitter<string>();
    @Output() updateChangeService = new EventEmitter<boolean>();
    extId: string;
    name: string;
    currAccess: DropdownItem<boolean>;
    changeService: boolean;
    // Todo: update can change service to value from item
    canChangeService: boolean = true;

    ngOnInit(): void {
        // this.currRole = this.roles.find(role => role.value === this.CProle);
        // For dev purposes. curr access isn't set up yet so default to Yes/true
        this.currAccess = partnerAccess[0];
    }
}
