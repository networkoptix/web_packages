import { SelectionModel } from '@angular/cdk/collections';
import { Component, Input, Output, EventEmitter } from '@angular/core';

import { NxDialogsService } from '@dialogs/dialogs.service';
import { icons } from '@variables/static-variables';

@Component({
    selector: 'nx-tag-filter',
    templateUrl: 'tag-filter.component.html',
    styleUrls: ['tag-filter.component.scss'],
})
export class NxTagFilterComponent {
    @Input() tags: string[];
    @Input() selection: SelectionModel<string>;
    @Output() selectionChange = new EventEmitter<void>();

    icons = icons;
    displayLimit = 15;

    constructor(private dialogs: NxDialogsService) {}

    moreTagsDialog(): void {
        this.dialogs.moreTags({
            tags: this.tags,
            selection: this.selection,
            emitter: this.selectionChange,
        });
    }
}
