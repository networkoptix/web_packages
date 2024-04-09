import {
    Component,
    ContentChildren,
    QueryList,
    Signal,
    WritableSignal,
    input,
} from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';
import { noop } from 'lodash-es';

import { BaseFilterItem } from './filter-items/base-filter-item.component';

type SelectedType<Value, Multiple extends boolean> = Multiple extends true
    ? Value[]
    : Value | undefined;
@Component({ template: '' })
export abstract class BaseFilterComponent<T, M extends boolean> implements ControlValueAccessor {
    abstract selectedValue: WritableSignal<SelectedType<T, M>>;
    // TODO: Search is not implemented yet
    search = input(false);

    @ContentChildren(BaseFilterItem) filterItems = new QueryList<BaseFilterItem<T>>();

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

    abstract handleSelectionChange(newSelectedValue: T): void;

    abstract clearSelectedValue(): void;

    abstract selectedValueExists: Signal<boolean>;

    abstract isFilterItemSelected(value: T): boolean;
}
