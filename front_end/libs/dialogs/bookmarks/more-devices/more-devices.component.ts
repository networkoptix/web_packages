import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import staticLang from '@common/language/language_i18n_static.json';
import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
import { NxSimpleSearchComponent } from '@components/simple-search/simple-search.component';

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
export class NxMoreDevicesModalContent extends NxMoreFiltersBaseModalContent<DT> {
    LANG = staticLang;

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
        this.dialogData.emitter.emit();
    }
}
