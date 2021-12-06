import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

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

    preloaderHeight = DEFAULT_EDITOR_CONFIG.min_height;
    editorSettings;
    valueLoaded = false;
    #value = '';

    ngOnInit() {
        this.editorSettings = {
            ...DEFAULT_EDITOR_CONFIG,
            ...(this.editorOverrides || {})
        };
    }

    #onChangeCallback

    get value () {
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
