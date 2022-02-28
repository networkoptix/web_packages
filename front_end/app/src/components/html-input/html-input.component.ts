import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';

import { DEFAULT_EDITOR_CONFIG } from './editor-config';

@Component({
    selector: 'nx-html',
    templateUrl: 'html-input.component.html',
    styleUrls: ['html-input.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => NxHTMLComponent),
            multi: true
        }
    ]
})
export class NxHTMLComponent implements ControlValueAccessor {
    @Input() editorOverrides: Record<any, any>;

    CONFIG: IConfig;
    preloaderHeight = DEFAULT_EDITOR_CONFIG.min_height;
    editorSettings;
    valueLoaded = false;
    #value = '';

    constructor(
        configService: NxConfigService,
    ) {
        this.CONFIG = configService.getConfig();
    }

    ngOnInit() {
        this.editorSettings = {
            ...DEFAULT_EDITOR_CONFIG,
            ...(this.editorOverrides || {}),
            ...{
                skin: this.CONFIG.isDarkTheme ? 'oxide-dark' : '',
                content_css: this.CONFIG.isDarkTheme ? 'dark' : ''
            }
        };
    }

    #onChangeCallback

    get value() {
        return this.#value;
    }

    set value(value) {
        this.#value = value;
        this.#onChangeCallback?.(value);
    }

    writeValue(value: any) {
        // Handles a weird edge case where value is null which prevents editor from rendering
        this.valueLoaded = value !== null;
        this.#value = value;
    }

    registerOnChange(fn) {
        this.#onChangeCallback = fn;
    }

    registerOnTouched() {}
}
