import { SelectionModel } from '@angular/cdk/collections';
import { Component, EventEmitter, Input, Output } from '@angular/core';

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
    @Output() selectionChange = new EventEmitter<void>();

    icons = icons;
    displayLimit = 7;

    constructor(private dialogs: NxDialogsService) {
        super();
    }

    updateSelection(device: string, state: boolean): void {
        // Don't emit change for setting initial values
        if (state === this.selection.isSelected(device)) {
            return;
        }

        if (state) {
            this.selection.select(device);
        } else {
            this.selection.deselect(device);
        }
        this.selectionChange.emit();
    }

    moreDevicesDialog(): void {
        this.dialogs.moreDevices({
            devices: this.items,
            selection: this.selection,
            emitter: this.selectionChange,
        });
    }
}
