import { SelectionModel } from '@angular/cdk/collections';
import { Component, Input } from '@angular/core';

import { NxDialogsService } from '@dialogs/dialogs.service';
import { icons } from '@lib/variables/static-variables';

import { SearchBaseComponent } from '../search-base.component';

@Component({
    selector: 'nx-device-filter',
    templateUrl: 'device-filter.component.html',
    styleUrls: ['device-filter.component.scss'],
})
export class NxDeviceFilterComponent extends SearchBaseComponent {
    @Input() selection: SelectionModel<string>;

    icons = icons;

    constructor(private dialogs: NxDialogsService) {
        super();
    }

    selectionChange(device: string, state: boolean): void {
        if (state) {
            this.selection.select(device);
        } else {
            this.selection.deselect(device);
        }
    }

    moreDevicesDialog(): void {
        this.dialogs.moreDevices({
            devices: this.items,
            selection: this.selection
        });
    }
}
