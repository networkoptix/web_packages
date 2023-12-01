import { Injectable, OnChanges, OnInit } from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';
import { UntilDestroy } from '@ngneat/until-destroy';

import staticLang from '@language_static';
import { Watcher } from '@services/apply.service/watcher';
import { nxConfig } from '@services/nx-config/config';
import { NgChanges } from '@utils/ng-changes';

const noop = () => {};

@UntilDestroy()
@Injectable()
export abstract class BaseDropdown implements OnInit, OnChanges, ControlValueAccessor {
    CONFIG = nxConfig;
    LANG = staticLang;
    message: string;
    show: boolean;

    // internal value
    _selectedItem;

    // Placeholders for the callbacks which are later provided
    // by the Control Value Accessor
    public onTouchedCallback: () => void = noop;
    public onChangeCallback: (_: any) => void = noop;

    constructor() {
        this.message = this.LANG.pleaseSelect;
        this.show = false;
    }

    ngOnInit(): void {}

    ngOnChanges(changes: NgChanges<BaseDropdown>): void {}

    trackItem(index, item) {
        return item ? item.value : undefined;
    }

    /**
     * Write a new (model) value to the element.
     */
    writeValue(value: any): void {
        let _value = value;
        if (value instanceof Watcher) {
            _value = value.value;
        }

        if (_value !== null && _value !== undefined && !(value instanceof Watcher)) {
            this._selectedItem = _value;
        }
    }

    /**
     * Set the function to be called
     * when the control receives a change event.
     */
    registerOnChange(fn): void {
        this.onChangeCallback = fn;
    }

    /**
     * Set the function to be called
     * when the control receives a touch event.
     */
    registerOnTouched(fn: any): void {
        this.onTouchedCallback = fn;
    }
}
