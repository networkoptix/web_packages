import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, Inject } from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';
import { DeviceFilter } from '@pages/systems/bookmarks/bookmarks.types';
import { caseInsenstiveSearch } from '@utils/general';

import type { MoreDevices as DT } from '../../dialogs.types';
import { NxMoreFiltersBaseModalContent } from '../more-filters-base/more-filters-base.component';

@Component({
    selector: 'nx-more-devices',
    templateUrl: 'more-devices.component.html',
    styleUrls: ['more-devices.component.scss'],
})
export class NxMoreDevicesModalContent extends NxMoreFiltersBaseModalContent<DT, DeviceFilter> {
    LANG = staticLang;
    override get searchMatches(): DeviceFilter[] {
        const searches = this.search.trim().split(/\s+/);
        return !this.search
            ? this.items
            : this.items.filter(({ name }) =>
                searches.some(search => caseInsenstiveSearch(name, search)),
            );
    }

    constructor(
        public dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) public dialogData: DT['data'],
    ) {
        super(dialogRef);
        this.items = dialogData.devices;
    }

    selectionChange(device: DeviceFilter, state: boolean): void {
        if (state) {
            this.dialogData.selection.select(device.id);
        } else {
            this.dialogData.selection.deselect(device.id);
        }
        this.dialogData.emitter.emit();
    }
}
