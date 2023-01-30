import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, Inject } from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';

import type { MoreTags as DT } from '../../dialogs.types';
import { NxMoreFiltersBaseModalContent } from '../more-filters-base/more-filters-base.component';

@Component({
    selector: 'nx-more-tags',
    templateUrl: 'more-tags.component.html',
    styleUrls: ['more-tags.component.scss'],
})
export class NxMoreTagsModalContent extends NxMoreFiltersBaseModalContent<DT> {
    LANG = staticLang;

    constructor(
        public dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) public dialogData: DT['data'],
    ) {
        super(dialogRef);
        this.items = dialogData.tags;
    }
}
