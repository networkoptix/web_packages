import { Component, OnDestroy, Input, Inject } from '@angular/core';

import { WINDOW } from '@services/window-provider';

import type { Bookmark } from '../bookmark.types';

@Component({
    selector: 'nx-bookmarks-list-component',
    templateUrl: 'list.component.html',
    styleUrls: ['list.component.scss']
})
export class NxBookmarksListComponent implements OnDestroy {
    @Input() list: Bookmark[];
    @Input() restError: boolean;

    gridColumnLookup: { [key: string]: string } = {};

    constructor(
        @Inject(WINDOW) public window: Window
    ) {}

    ngOnDestroy(): void {}

    updateTagSize(tagName: string, { width }: { width: number, height: number }): void {
        if (this.gridColumnLookup[tagName]) return;
        const gridGap = 5;
        const columns = Math.round(width / gridGap);
        this.gridColumnLookup[tagName] = `span ${columns}`;
    }

    reloadWindow(): void {
        this.window.location.reload();
    }
}
