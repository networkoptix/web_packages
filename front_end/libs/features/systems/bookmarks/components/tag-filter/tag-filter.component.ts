import { SelectionModel } from '@angular/cdk/collections';
import { Component, OnInit, Input } from '@angular/core';

import { NxDialogsService } from '@dialogs/dialogs.service';
import { icons } from '@src/app/variables/static-variables';

@Component({
    selector: 'nx-tag-filter',
    templateUrl: 'tag-filter.component.html',
    styleUrls: ['tag-filter.component.scss'],
})
export class NxTagFilterComponent implements OnInit {
    @Input() tags: string[];

    icons = icons;

    selectionModel = new SelectionModel<string>(true, []);

    constructor(private dialogs: NxDialogsService) {}

    ngOnInit(): void {}

    moreTagsDialog(): void {
        this.dialogs.moreTags(this.tags);
    }
}
