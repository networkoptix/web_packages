import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
import { NxSimpleSearchComponent } from '@components/simple-search/simple-search.component';
import staticLang from '@language_static';
import { BookmarksDevice } from '@pages/systems/bookmarks/bookmarks.types';
import { caseInsensitiveSearch } from '@utils/general';

import type { MoreDevices as DT } from '../../dialogs.types';
import { NxMoreFiltersBaseModalContent } from '../more-filters-base/more-filters-base.component';

@Component({
    selector: 'nx-more-devices',
    templateUrl: 'more-devices.component.html',
    styleUrls: ['more-devices.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        // AngularSvgIconModule,
        TranslateModule,

        NxMoreFiltersBaseModalContent,
        NxCheckboxComponent,
        NxSimpleSearchComponent,
    ],
})
export class NxMoreDevicesModalContent extends NxMoreFiltersBaseModalContent<DT, BookmarksDevice> {
    LANG = staticLang;
    override get searchMatches(): BookmarksDevice[] {
        const searches = this.search.trim().split(/\s+/);
        return !this.search
            ? this.items
            : this.items.filter(({ name }) =>
                  searches.some(search => caseInsensitiveSearch(name, search)),
              );
    }

    constructor(
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) public dialogData: DT['data'],
    ) {
        super(dialogRef);
        this.items = dialogData.devices;
    }

    selectionChange(device: BookmarksDevice, state: boolean): void {
        if (state) {
            this.dialogData.selection.select(device.id);
        } else {
            this.dialogData.selection.deselect(device.id);
        }
        this.dialogData.emitter.emit();
    }
}
