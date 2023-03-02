import { Component, Input } from '@angular/core';

import { spaceSplitSearch } from '@utils/general';

@Component({
    standalone: true,
    template: '',
})
export class SearchBaseComponent {
    @Input() items: string[];
    search: string = '';

    get searchMatches(): string[] {
        return !this.search
            ? this.items
            : spaceSplitSearch(this.items, this.search);
    }
}
