import { Component, effect, forwardRef } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
    ControlValueAccessor,
    FormControl,
    FormGroup,
    NG_VALUE_ACCESSOR,
    ReactiveFormsModule,
} from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'nx-basic-search-input',
    templateUrl: './basic-search-input.component.html',
    styleUrls: ['./basic-search-input.component.scss'],
    standalone: true,
    imports: [TranslateModule, ReactiveFormsModule],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => SearchInputComponent),
            multi: true,
        },
    ],
})
export class SearchInputComponent implements ControlValueAccessor {
    searchForm = new FormGroup({
        search: new FormControl<string>(''),
    });

    sub$$ = toSignal(this.searchForm.controls.search.valueChanges);
    e = effect(() => {
        this.writeValue(this.sub$$() ?? '');
    });

    value: string = '';

    private onChangeCallback = (_: string): void => {};

    writeValue(value: string): void {
        this.value = value;
        this.onChangeCallback(value);
    }

    registerOnChange(fn: (_: string) => void): void {
        this.onChangeCallback = fn;
    }

    registerOnTouched(fn: () => void): void {}
}
