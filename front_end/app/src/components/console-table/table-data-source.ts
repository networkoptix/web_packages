import { DataSource } from '@angular/cdk/collections';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import type {
    FilterState,
} from '@components/advanced-filter/advanced-filter.component.types';
import type {
    AdditionalFilter,
} from '@components/console-table/console-table.component.types';

export class TableDataSource extends DataSource<any> {
    #baseData$: BehaviorSubject<any[]> = new BehaviorSubject([]);
    #itemsPerPage$: BehaviorSubject<number> = new BehaviorSubject(null);
    #currentPage$: BehaviorSubject<number> = new BehaviorSubject(null);
    #displayedColumns$: BehaviorSubject<string[]> = new BehaviorSubject([]);
    #numberOfItems$ = new BehaviorSubject(0);
    #additionalFilters$: BehaviorSubject<Record<string, AdditionalFilter>> = new BehaviorSubject({});
    search$: BehaviorSubject<string> = new BehaviorSubject(null);
    noSearchMatches$ = new BehaviorSubject(false);
    numberOfPages$ = new BehaviorSubject(0);
    showAdvanced$ = this.#baseData$.pipe(map(data => data.length > this.minItemsAdvanced));
    minItemsAdvanced = 0;
    filterStates: Map<string, FilterState> = new Map();

    perPage$ = combineLatest([
        this.#numberOfItems$,
        this.#itemsPerPage$
    ]).pipe(
        map(([items, perPage]) => Math.min(items, perPage))
    );

    updateFilters(filtersToUpdate: Record<string, AdditionalFilter>, fieldName: string, filterState: FilterState): void {
        if (this.filterStates.get(fieldName)?.sort !== filterState.sort) {
            this.filterStates.delete(fieldName);
        }

        this.filterStates.set(fieldName, filterState);

        this.#additionalFilters$.next({ ...this.#additionalFilters$.value, ...filtersToUpdate });
    }

    data$ = combineLatest([
        this.#baseData$, this.#itemsPerPage$, this.#currentPage$, this.#displayedColumns$, this.search$, this.#additionalFilters$
    ]).pipe(
        map(([data, perPage, currentPage, displayedColumns, search, additionalFilters]) => {
            if (!data.length) {
                return data;
            }
            let noSearchMatches = false;
            if (search && displayedColumns.length) {
                const filteredData = data.filter(data => {
                    return displayedColumns.some(key => (data[key]?.toLowerCase?.() || '').includes(search.toLowerCase()));
                });
                noSearchMatches = !filteredData.length;
                if (!noSearchMatches) {
                    data = filteredData;
                } else {
                    this.noSearchMatches$.next(true);
                    return filteredData;
                }
            }

            const sortOrder = [...this.filterStates].map(([fieldName]) => fieldName);

            data = Object.entries(additionalFilters)
                .sort(([a], [b]) => {
                    const aIndex = sortOrder.indexOf(a);
                    const bIndex = sortOrder.indexOf(b);
                    return aIndex - bIndex;
                })
                .reduce((
                    filtered, [_, filterFunc]
                ) => filterFunc(filtered), data);
            // for (const field of sortOrder) {
            //     const sortBy = this.filterStates.get(field)?.sort;
            //     if (sortBy) {
            //         const sortValue = sortBy === FilterSort.ASC ? 1 : -1;
            //         data = data.sort((a, b) =>  a[field] === b[field] ? 0 : a[field] > b[field] ? sortValue : -sortValue);
            //     }
            // }
            this.noSearchMatches$.next(false);
            const numberOfPages = Math.ceil(data.length / perPage);
            this.numberOfPages$.next(numberOfPages);
            const end = Math.min(currentPage, this.numberOfPages$.value) * perPage;
            const start = Math.min(end - perPage, data.length);

            if (currentPage > numberOfPages) {
                this.updatePageParam(numberOfPages);
                this.#currentPage$.next(numberOfPages);
            } else if (isNaN(currentPage) || currentPage < 1) {
                this.updatePageParam(1);
                this.#currentPage$.next(1);
            }

            this.#numberOfItems$.next(data.length);

            return data.slice(start, end);
        }));

    constructor(
        data,
        itemsPerPage = 3,
        minItemsAdvanced = 15,
        currentPage = 1,
        search = '',
        displayedColumns = [],
      private updatePageParam = page => console.error(`Missing param handler ${page}`)
    ) {
        super();
        this.minItemsAdvanced = minItemsAdvanced;
        this.updateBaseData(data);
        this.#itemsPerPage$.next(itemsPerPage);
        this.#currentPage$.next(currentPage);
        this.#displayedColumns$.next(displayedColumns);
        this.#numberOfItems$.next(data.length);
        this.search$.next(search);
    }

    connect(): Observable<any[]> {
        return this.data$;
    }

    disconnect(): void {}

    updateBaseData(data): void {
        this.#baseData$.next(data);
    }

    updateState({ page, search, perPage }): void {
        this.#currentPage$.next(page || 1);
        this.search$.next(search || '');
        if (page > this.numberOfPages$.value && this.updatePageParam) {
            this.updatePageParam(this.numberOfPages$.value);
        }

        if (perPage) {
            this.#itemsPerPage$.next(Math.min(perPage, this.#numberOfItems$.value));
        }
    }

    findElementIndex(id: number): { index: number, value: any } {
        const index = this.#baseData$.value.findIndex(item => item.id === id);
        return { index, value: this.#baseData$.value[index] };
    }

    indexToPage(index: number): number {
        return Math.floor(index / this.#itemsPerPage$.value) + 1;
    }
}
