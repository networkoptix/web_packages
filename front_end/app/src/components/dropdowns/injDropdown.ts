import {
    Injectable, OnChanges,
    SimpleChanges, OnDestroy, OnInit
}                                    from '@angular/core';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { ControlValueAccessor }      from '@angular/forms';
import { NxConfigService }           from '../../services/nx-config/nx-config.service';
import { IConfig } from '../../services/nx-config/config-types';
import { LanguageI18NStaticTypes } from '../../../language_i18n_static_types';

const noop = () => {};

@Injectable()
export abstract class BaseDropdown implements OnInit, OnChanges, OnDestroy, ControlValueAccessor {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    message: string;
    show: boolean;

    // internal value
    _selected: any;

    // Placeholders for the callbacks which are later provided
    // by the Control Value Accessor
    public onTouchedCallback: () => void      = noop;
    public onChangeCallback: (_: any) => void = noop;

    constructor(languageService: NxLanguageProviderService,
                configService: NxConfigService,
    ) {
        this.CONFIG  = configService.getConfig();
        this.LANG    = languageService.getTranslations();
        this.message = this.LANG.pleaseSelect;
        this.show    = false;
    }

    ngOnInit() {
    }

    // needed for @AutoUnsubscribe
    ngOnDestroy(): void {
    }

    ngOnChanges(changes: SimpleChanges) {
    }


    trackItem(index, item) {
        if (!item) {
            return undefined;
        }
        return item.value;
    }

    /**
     * Write a new (model) value to the element.
     */
    writeValue(value: any) {
        if (value !== null && typeof value !== 'undefined') {
            this._selected = value;
        }
    }

    /**
     * Set the function to be called
     * when the control receives a change event.
     */
    registerOnChange(fn) {
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
