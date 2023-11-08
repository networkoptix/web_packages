import { DialogRef } from '@angular/cdk/dialog';
import { Component } from '@angular/core';

import { SearchBaseComponent } from '@pages/systems/bookmarks/components/search-base.component';

import { type DialogType } from '../../dialogs.types';

@Component({
    selector: 'nx-more-filters-base',
    templateUrl: 'more-filters-base.component.html',
    styleUrls: ['more-filters-base.component.scss'],
})
export class NxMoreFiltersBaseModalContent<DT extends DialogType, T> extends SearchBaseComponent<T> {
    constructor(public dialogRef: DialogRef<DT['return']>) {
        super();
    }

    close = (value?: DT['return']): void => {
        this.dialogRef.close(value);
    };

    get searchMatches(): T[] {
        return [];
    }
}
