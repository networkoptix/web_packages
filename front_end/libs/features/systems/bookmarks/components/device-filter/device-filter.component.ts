import { SelectionModel } from '@angular/cdk/collections';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';

import { NxDialogsService } from '@dialogs/dialogs.service';
import { BookmarksDevice } from '@pages/systems/bookmarks/bookmarks.types';
import { icons } from '@static-variables';
import { caseInsenstiveSearch } from '@utils/general';

import { SearchBaseComponent } from '../search-base.component';

@Component({
    selector: 'nx-device-filter',
    templateUrl: 'device-filter.component.html',
    styleUrls: ['device-filter.component.scss'],
})
export class NxDeviceFilterComponent extends SearchBaseComponent<BookmarksDevice> {
    @Input() selection: SelectionModel<string>;
    @Output() selectionChange = new EventEmitter<void>();

    private dialogs = inject(NxDialogsService);

    icons = icons;
    displayLimit = 7;

    get searchMatches(): BookmarksDevice[] {
        const searches = this.search.trim().split(/\s+/);
        return !this.search
            ? this.items
            : this.items.filter(({ name }) =>
                  searches.some(search => caseInsenstiveSearch(name, search)),
              );
    }

    updateSelection(device: BookmarksDevice, state: boolean): void {
        // Don't emit change for setting initial values
        if (state === this.selection.isSelected(device.id)) {
            return;
        }

        if (state) {
            this.selection.select(device.id);
        } else {
            this.selection.deselect(device.id);
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
