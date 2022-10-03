import {
    Component,
    EventEmitter,
    Input,
    Output,
    SimpleChanges
} from '@angular/core';

import {
    AdditionalFilter
} from '@components/console-table/console-table.component.types';
import {
    DataStructureFilter,
    GroupingOptions,
    SortOptions
} from '@pages/developer-console/console/edit/console-edit.component.types';

export enum FilterSort {
    ASC='asc',
    DESC='desc',
    NONE=''
}

export interface Selection {
    name: string,
    value: boolean
}

export interface FilterState {
    sort: FilterSort,
    selections: Selection[]
}

export interface FilterUpdatePayload {
    filter: AdditionalFilter,
    state: FilterState
}

@Component({
    selector: 'nx-advanced-filter',
    templateUrl: 'advanced-filter.component.html',
    styleUrls: ['advanced-filter.component.scss']
})
export class NxAdvancedFilterComponent {
    @Output() onClose = new EventEmitter();
    @Output() updateFilter = new EventEmitter<FilterUpdatePayload>()
    @Input() filter: DataStructureFilter;
    @Input() field: string;
    @Input() data: Record<string, string>[] = []
    @Input() initialState: FilterState;
    @Input() activeFilter: string | false = false;

    show = false;

    dateFormats = {
        [GroupingOptions.DATE_DAY]: 'shortDate',
        [GroupingOptions.DATE_AUTO]: 'shortDate',
        [GroupingOptions.DATE_MONTH]: 'MMMM, y',
        default: 'short'
    }

    currentState: FilterState = {
        sort: FilterSort.NONE,
        selections: []
    }

    FILTER_SORT = FilterSort;
    GROUPING_OPTIONS = GroupingOptions;

    initialized = false;

    close() {
        if (this.initialized) {
            this.onClose.emit(true);
        } else {
            this.initialized = true;
        }
    }

    reset() {
        const value = !!this.filter.multiSelect;
        this.updateState({
            sort: FilterSort.NONE,
            selections: this.currentState.selections.map(({ name }) => ({ name, value }))
        });
    }

    updateState(updateState: Partial<FilterState>) {
        this.currentState = { ...this.currentState, ...updateState };
        this.updateFilter.emit({ state: this.currentState, filter: this.generateFilter() });
    }

    updateSelection(updatedName, updatedValue, event: MouseEvent) {
        event.stopPropagation();
        const selections = this.currentState.selections.map(({
            name, value
        }) => ({
            name,
            value: name === updatedName
                ? updatedValue
                : this.filter.multiSelect
                    ? value
                    : false
        })).sort(
            this.sortCallbackFactory()
        );

        this.updateState({ selections });
    }

    sortCallbackFactory = (forceAsc = false) => (a, b) => {
        const sanitizeSortValue = (value) => {
            if (this.filter.sortable === SortOptions.TEXT) {
                return value.toLowerCase();
            }

            return value;
        };

        const sortValue = (forceAsc || this.currentState.sort !== FilterSort.DESC) ? 1 : -1;
        const aValue = sanitizeSortValue(a[this.field]);
        const bValue = sanitizeSortValue(b[this.field]);

        return aValue === bValue ? 0 : aValue > bValue ? sortValue : -sortValue;
    }

    groupCompare(a, b) {
        if (!this.filter.grouping || this.filter.grouping === GroupingOptions.TEXT) {
            return a === b;
        }

        const aDate = new Date(a);
        const bDate = new Date(b);

        if (aDate.getFullYear() !== bDate.getFullYear()) {
            return false;
        }

        if (aDate.getMonth() !== bDate.getMonth()) {
            return false;
        }

        if (this.filter.grouping === GroupingOptions.DATE_MONTH) {
            return true;
        }

        if (aDate.getDate() !== bDate.getDate()) {
            return false;
        }

        if ([GroupingOptions.DATE_DAY, GroupingOptions.DATE_AUTO].includes(this.filter.grouping)) {
            return true;
        }

        return aDate.getTime() === bDate.getTime();
    }

    generateFilter = (): AdditionalFilter => (data) => {
        if (this.filter.sortable && this.currentState.sort) {
            data = data.sort(this.sortCallbackFactory());
        }

        if (this.currentState.selections.some(({ value })  => value)) {
            data = data.filter((
                values
            ) => this.currentState.selections.find(({
                name, value
            }) => value && this.groupCompare(name, values[this.field])));
        }

        return data;
    }

    ngOnChanges(changes: SimpleChanges) {
        if (
            changes.initialState &&
            changes.initialState.previousValue === undefined &&
            changes.initialState.currentValue
        ) {
            this.currentState = { ...this.currentState, ...this.initialState };
        }
        if (
            changes.data &&
            changes.data.previousValue?.length !== changes.data.currentValue.length
        ) {
            this.currentState.selections = this.data.reduce((
                selections, values
            ) =>  {
                const name = values[this.field];
                const previousSelection = selections.find(
                    ({ name: existingName }) =>
                        this.groupCompare(existingName, name)
                );
                const value = previousSelection
                    ? previousSelection.value
                    : !!this.filter.multiSelect;

                if (!previousSelection) {
                    selections.push({ name, value });
                }

                return selections;
            }, this.currentState.selections).sort(
                this.sortCallbackFactory(true)
            );
        }

        if (
            changes.activeFilter &&
            changes.activeFilter.previousValue !== changes.activeFilter.currentValue
        ) {
            this.initialized = false;
            this.show = this.activeFilter === this.field;
        }
    }
}
