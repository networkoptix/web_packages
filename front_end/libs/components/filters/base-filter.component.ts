import {
    Component,
    ElementRef,
    HostListener,
    Signal,
    TemplateRef,
    WritableSignal,
    contentChildren,
    effect,
    inject,
    input,
    signal,
    untracked,
    viewChild,
} from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';
import { noop } from 'lodash-es';

import { NxDialogsService } from '@dialogs/dialogs.service';

import { NxFilterContainerComponent } from './filter-container/filter-container.component';
import { BaseFilterItem } from './filter-items/base-filter-item.component';

type SelectedType<Value, Multiple extends boolean> = Multiple extends true
    ? Value[]
    : Value | undefined;
@Component({ template: '' })
export abstract class BaseFilterComponent<T, M extends boolean> implements ControlValueAccessor {
    abstract selectedValue: WritableSignal<SelectedType<T, M>>;

    displayLimit = input(7);
    searchable = input(true);

    showMoreDialogOpen = signal(false);

    filterItems = contentChildren(BaseFilterItem);

    // ControlValueAccessor methods
    writeValue(updatedSelected: SelectedType<T, M>): void {
        this.selectedValue.set(updatedSelected);
    }
    _onChangeCallback: (newSelectedValue: SelectedType<T, M>) => void = noop;
    registerOnChange(onChange: (newSelectedValue: SelectedType<T, M>) => void): void {
        this._onChangeCallback = onChange;
    }
    _onTouchedCallback: () => void = noop;
    registerOnTouched(onTouched: () => void): void {
        this._onTouchedCallback = onTouched;
    }

    updateSelected(selected: SelectedType<T, M>): void {
        this.selectedValue.set(selected);
        this._onChangeCallback(selected);
    }

    // Show more dialog
    parentFilterContainer = inject(NxFilterContainerComponent);
    dialogService = inject(NxDialogsService);
    onShowMoreClick(filterContent: TemplateRef<Element>): void {
        this.showMoreDialogOpen.set(true);
        this.searchInputText.set('');
        this.dialogService
            .filterShowMore({
                template: filterContent,
                header: this.parentFilterContainer.header(),
            })
            .then(() => {
                this.searchInputText.set('');
                this.showMoreDialogOpen.set(false);
            });
    }

    abstract handleSelectionChange(newSelectedValue: T): void;

    abstract clearSelectedValue(): void;

    abstract selectedValueExists: Signal<boolean>;

    abstract isFilterItemSelected(value: T): boolean;

    // Search functionality
    searchInputText = signal('');
    showAndHideItems = effect(() => {
        const searchText = this.searchInputText().toLowerCase();
        let numberOfItemsShowing = 0;
        this.filterItems().forEach(item => {
            if (!this.showMoreDialogOpen() && numberOfItemsShowing >= this.displayLimit()) {
                item.hide();
                return;
            }
            const itemSearchableString = item.searchableValue();
            if (itemSearchableString && itemSearchableString.includes(searchText)) {
                item.show();
                numberOfItemsShowing++;
            } else {
                item.hide();
            }
        });
    });

    // Lock the height of the content once it is initially loaded
    filterContainer = viewChild.required<ElementRef<HTMLDivElement>>('filterContainer');
    filterContainerHeight = signal<number | undefined>(undefined);
    ngAfterViewInit(): void {
        this.syncFilterContainerHeight();
    }
    @HostListener('window:resize')
    onWinResize(): void {
        if (this.showMoreDialogOpen() || this.searchInputText()) {
            return;
        }
        this.filterContainerHeight.set(undefined);
        this.syncFilterContainerHeight();
    }
    // If filter items change we need to resize. This happens for async items
    syncHeightOnItemsChange = effect(() => {
        this.filterItems();
        untracked(() => {
            this.filterContainerHeight.set(undefined);
            this.syncFilterContainerHeight();
        });
    });
    syncFilterContainerHeight(): void {
        // The height is not finally set until after all the effects have run, but there is no lifecycle hook that runs after all effects
        setTimeout(() => {
            this.filterContainerHeight.set(this.filterContainer().nativeElement.clientHeight);
        });
    }
}
