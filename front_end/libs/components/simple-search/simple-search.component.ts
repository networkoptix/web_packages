import {
    Component,
    OnInit,
    forwardRef,
    Input,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import staticLang from '@common/language/language_i18n_static.json';
import { icons } from '@lib/variables/static-variables';

@Component({
    selector: 'nx-simple-search',
    templateUrl: 'simple-search.component.html',
    styleUrls: ['simple-search.component.scss'],
    providers: [{
        provide: NG_VALUE_ACCESSOR,
        useExisting: forwardRef(() => NxSimpleSearchComponent),
        multi: true,
    }],
})
export class NxSimpleSearchComponent implements ControlValueAccessor, OnInit {
    @Input() placeholder: string;

    search: string = '';

    LANG = staticLang;
    icons = icons;

    ngOnInit(): void {
        this.placeholder ??= this.LANG.search.Search;
    }

    private onChange = (_: string): void => {};
    // @ts-expect-error: ControlValueAccessor
    private onTouched = (): void => {};

    writeValue(value: string): void {
        this.search = value;
        this.onChange(value);
    }

    registerOnChange(fn: (value: string) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }
}
