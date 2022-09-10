import {
    Injectable,
    OnChanges,
    OnDestroy,
    OnInit
} from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';

import { Watcher } from '@services/apply.service/watcher';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { LanguageI18NStaticTypes } from '@src/language_i18n_static_types';
import { NgChanges } from '@utils/ng-changes';

const noop = () => {};

@Injectable()
export abstract class BaseDropdown implements OnInit, OnChanges, OnDestroy, ControlValueAccessor {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    message: string;
    show: boolean;

    // internal value
    _selectedItem;

    // Placeholders for the callbacks which are later provided
    // by the Control Value Accessor
    public onTouchedCallback: () => void = noop;
    public onChangeCallback: (_: any) => void = noop;

    constructor(
        languageService: NxLanguageProviderService,
        configService: NxConfigService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;
        this.message = this.LANG.pleaseSelect();
        this.show = false;
    }

    ngOnInit(): void {
    }

    // needed for @UntilDestroy
    ngOnDestroy(): void {
    }

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

        if (
            _value !== null &&
            _value !== undefined &&
            !(value instanceof Watcher)
        ) {
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
