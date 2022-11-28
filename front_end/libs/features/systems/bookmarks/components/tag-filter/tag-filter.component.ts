import { SelectionModel } from '@angular/cdk/collections';
import { Component, Input } from '@angular/core';

import { NxDialogsService } from '@dialogs/dialogs.service';
import { icons } from '@src/app/variables/static-variables';

@Component({
    selector: 'nx-tag-filter',
    templateUrl: 'tag-filter.component.html',
    styleUrls: ['tag-filter.component.scss'],
})
export class NxTagFilterComponent {
    @Input() tags: string[];
    @Input() selection: SelectionModel<string>;

    icons = icons;

    selectionModel = new SelectionModel<string>(true, []);

    constructor(private dialogs: NxDialogsService) {}

    moreTagsDialog(): void {
        this.dialogs.moreTags({ tags: this.tags, selection: this.selection });
    }
}
