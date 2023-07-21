import { DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { SearchBaseComponent } from '@pages/systems/bookmarks/components/search-base.component';

import { type DialogType } from '../../dialogs.types';

@Component({
    selector: 'nx-more-filters-base',
    templateUrl: 'more-filters-base.component.html',
    styleUrls: ['more-filters-base.component.scss'],
    standalone: true,
    imports: [CommonModule],
})
export class NxMoreFiltersBaseModalContent<DT extends DialogType> extends SearchBaseComponent {
    constructor(public dialogRef: DialogRef<DT['return']>) {
        super();
    }

    close = (value?: DT['return']): void => {
        this.dialogRef.close(value);
    };
}
