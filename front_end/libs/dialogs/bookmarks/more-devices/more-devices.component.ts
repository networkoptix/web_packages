import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, Inject } from '@angular/core';

import type { MoreDevices as DT } from '../../dialogs.types';
import { NxMoreFiltersBaseModalContent } from '../more-filters-base/more-filters-base.component';

@Component({
    selector: 'nx-more-devices',
    templateUrl: 'more-devices.component.html',
    styleUrls: ['more-devices.component.scss'],
})
export class NxMoreDevicesModalContent extends NxMoreFiltersBaseModalContent<DT> {
    constructor(
        public dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) public dialogData: DT['data'],
    ) {
        super(dialogRef);
        this.items = dialogData.devices;
    }

    selectionChange(device: string, state: boolean): void {
        if (state) {
            this.dialogData.selection.select(device);
        } else {
            this.dialogData.selection.deselect(device);
        }
    }
}
