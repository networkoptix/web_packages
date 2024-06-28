import { CommonModule } from '@angular/common';
import { Component, effect, EventEmitter, inject, input, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { NxTagComponent } from '@components/tag/tag.component';
import { UserFilter } from '@dialogs/channel-partners/filter-users/filter-users.types';

/* Usage
 <nx-filter-tags
    [filters]="filters"
    (filterChange)="updateFilters($event)"
 >
 </nx-filter-tags>
 */

@Component({
    selector: 'nx-filter-tags',
    templateUrl: 'tag.component.html',
    styleUrls: ['tag.component.scss'],
    standalone: true,
    imports: [CommonModule, NxTagComponent],
})
export class NxFilterTagsComponent {
    router = inject(Router);
    route = inject(ActivatedRoute);

    filters$$ = input.required<UserFilter[]>({
        alias: 'filters',
    });

    _changeFiltersEffect = effect(() => {
        this.filters$$();
        this.updateUri();
    });

    @Output() filterChange = new EventEmitter<{
        idx: number;
        value: boolean;
        remove?: boolean;
    }>();

    removeFilter(value: boolean, filterIdx: number): void {
        this.filterChange.emit({ idx: filterIdx, value });
    }

    updateUri(): void {
        const queryParams: Record<string, string | string[] | undefined> = {};
        this.filters$$()
            .filter(filter => filter.selected)
            .forEach(filter => {
                queryParams[filter.group] = filter.id as string;
            });

        this.router.navigate([], {
            relativeTo: this.route,
            queryParams,
            queryParamsHandling: '',
        });
    }
}
