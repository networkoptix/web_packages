import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, Inject } from '@angular/core';

import type { MoreTags as DT } from '../../dialogs.types';
import { NxMoreFiltersBaseModalContent } from '../more-filters-base/more-filters-base.component';

@Component({
    selector: 'nx-more-tags',
    templateUrl: 'more-tags.component.html',
    styleUrls: ['more-tags.component.scss'],
})
export class NxMoreTagsModalContent extends NxMoreFiltersBaseModalContent<DT> {
    constructor(
        public dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) public tags: DT['data'],
    ) {
        super(dialogRef);
        this.items = tags;
    }
    // TODO: Use store for state
}
