import { SelectionModel } from '@angular/cdk/collections';
import { Component } from '@angular/core';

import { NxDialogsService } from '@dialogs/dialogs.service';
import { icons } from '@lib/variables/static-variables';

import { SearchBaseComponent } from '../search-base.component';

@Component({
    selector: 'nx-device-filter',
    templateUrl: 'device-filter.component.html',
    styleUrls: ['device-filter.component.scss'],
})
export class NxDeviceFilterComponent extends SearchBaseComponent {
    icons = icons;
    selectionModel = new SelectionModel<string>(true, []);

    constructor(private dialogs: NxDialogsService) {
        super();
    }

    selectionChange(device: string, state: boolean): void {
        if (state) {
            this.selectionModel.select(device);
        } else {
            this.selectionModel.deselect(device);
        }
    }

    moreDevicesDialog(): void {
        this.dialogs.moreDevices(this.items);
    }
}
