import { Component, Input } from '@angular/core';

import { caseInsenstiveSearch } from '@utils/general';

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
            : this.items.filter(item => caseInsenstiveSearch(item, this.search));
    }
}
