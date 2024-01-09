import { CommonModule } from '@angular/common';
import { Component, ElementRef, forwardRef, Input, OnChanges, ViewChild } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { escape, escapeRegExp } from 'lodash-es';
import { NgxTranslateCutModule } from 'ngx-translate-cut';

import { NxSearchHighlightComponent } from '@components/search-highlight/search-highlight.component';
import staticLang from '@language_static';
import { icons } from '@static-variables';
import { NgChanges } from '@utils/ng-changes';

/*
https://material.angular.io/components/autocomplete/overview
Behavior borrowed from Material Components:
- Open dropdown on input element focus
- Empty search displays all options
- Focus stays on input element during keyboard nav
- Keyboard nav is trapped in dropdown once entered
- Highlight index is unset on input typing
- Esc key closes the dropdown
- Clicking on the input while dropdown is open does nothing
- Clicking on the input while dropdown is closed opens the dropdown
- Up or down key on the input while dropdown is closed opens the dropdown
- Clicking an element or Enter key while highlighted will select it and close the dropdown
- Clicking outside the the autocomplete element will close the dropdown
- Focus escaping from the input by keyboard (Shift+Tab, Tab) will close the dropdown
    - The X button is "inside" the input visually so <input> <=> <button> doesn't count

Custom behavior:
- Display a no matching results message if no results
- Clear the search and focus input when clicking on the X button
    - This also unsets highlight
- Enter with one match selects it even without highlight
- In Material, there's padding between the first option and the top of the dropdown
    - Clicking on this does not close the dropdown, and neither does focus going outside afterwards
    - We're going to avoid the complexity the X button adds to this
      by having the options be flush with the dropdown
*/

@Component({
    selector: 'nx-autocomplete',
    templateUrl: 'autocomplete.component.html',
    styleUrls: ['autocomplete.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        AngularSvgIconModule,
        NgxTranslateCutModule,
        TranslateModule,
        NxSearchHighlightComponent,
    ],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => NxAutocompleteComponent),
            multi: true,
        },
    ],
})
export class NxAutocompleteComponent implements ControlValueAccessor, OnChanges {
    @Input({ required: true }) suggestions: string[];
    @Input() placeholder: string = this.translate.instant(staticLang.search.Search);
    @Input() noMatchMsg?: string;

    @ViewChild('autocompleteInput') private autocompleteInput: ElementRef<HTMLInputElement>;
    @ViewChild('closeBtn') private closeBtn?: ElementRef<HTMLButtonElement>;
    @ViewChild('suggestionsList') private suggestionsList?: ElementRef<HTMLUListElement>;

    value: string = '';
    searchRegex: RegExp | undefined;

    LANG = staticLang;
    icons = icons;

    escapeHTML = escape;

    dropdownOpen: boolean = false;
    matchList: string[] = [];
    highlightIndex: number | undefined;

    // Fixed limit for now and see if anybody complains
    private readonly RESULT_LIMIT = 50;

    private search(): void {
        if (!this.value) {
            this.searchRegex = undefined;
            this.matchList = this.suggestions;
            return;
        }
        const searches = this.value
            .trim()
            .split(/\s+/)
            .map(s => `(?:${escapeRegExp(s)})`)
            .join('|');
        this.searchRegex = new RegExp(`(${searches})`, 'i');
        const matches: string[] = [];
        for (const item of this.suggestions) {
            if (matches.length === this.RESULT_LIMIT) {
                break;
            }
            if (this.searchRegex.test(item)) {
                matches.push(item);
            }
        }
        this.matchList = matches;
    }

    constructor(private translate: TranslateService) {}

    ngOnChanges({ suggestions }: NgChanges<NxAutocompleteComponent>): void {
        if (suggestions.firstChange) {
            this.matchList = suggestions.currentValue;
        }
        if (!suggestions.firstChange) {
            this.highlightIndex = undefined;
            this.search();
        }
    }

    // ControlValueAccessor
    private onChange = (_: string): void => {};
    private onTouched = (): void => {};

    writeValue(value: string, updateSearch = false): void {
        this.value = value;
        if (updateSearch) {
            this.search();
        }
        this.onChange(value);
        this.onTouched();
    }

    registerOnChange(fn: (value: string) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    openDropdown(): void {
        this.dropdownOpen = true;
    }

    closeDropdown(): void {
        this.dropdownOpen = false;
        this.unsetHighlightIndex();
    }

    private unsetHighlightIndex(): void {
        this.highlightIndex = undefined;
    }

    onInputEsc(event: Event): void {
        if (this.dropdownOpen) {
            event.stopPropagation();
        }
        this.closeDropdown();
    }

    onInputBlur(event: FocusEvent): void {
        const relatedTarget = event.relatedTarget as HTMLElement | null;
        if (
            !relatedTarget ||
            !(
                relatedTarget === this.autocompleteInput.nativeElement ||
                (this.closeBtn && relatedTarget === this.closeBtn.nativeElement) ||
                (this.suggestionsList && relatedTarget === this.suggestionsList.nativeElement)
            )
        ) {
            this.closeDropdown();
        }
    }

    onInputModelChange(event: string): void {
        this.writeValue(event, true);
        this.unsetHighlightIndex();
        this.openDropdown();
    }

    clear(): void {
        this.writeValue('', true);
        this.unsetHighlightIndex();
        this.autocompleteInput.nativeElement.focus();
    }

    incrementHighlightIndex(): void {
        if (!this.dropdownOpen) {
            this.openDropdown();
            return;
        }

        if (this.highlightIndex === undefined) {
            if (this.matchList.length) {
                this.highlightIndex = 0;
            } else {
                // Do nothing if no matches
            }
        } else if (this.highlightIndex === this.matchList.length - 1) {
            this.highlightIndex = 0;
            // Loop back to beginning
        } else {
            this.highlightIndex += 1;
        }
    }

    decrementHighlightIndex(): void {
        if (!this.dropdownOpen) {
            this.openDropdown();
            return;
        }

        if (this.highlightIndex === undefined) {
            if (this.matchList.length) {
                this.highlightIndex = this.matchList.length - 1;
            } else {
                // Do nothing if no matches
            }
        } else if (this.highlightIndex === 0) {
            this.highlightIndex = this.matchList.length - 1;
        } else {
            this.highlightIndex -= 1;
        }
    }

    select(item: string): void {
        this.writeValue(item);
        this.closeDropdown();
    }

    onInputEnter(event: Event): void {
        event.preventDefault();
        if (!this.dropdownOpen) {
            return;
        }
        event.stopPropagation();
        if (this.matchList.length === 1) {
            this.select(this.matchList[0]);
        } else if (this.highlightIndex === undefined) {
            // Pass
        } else {
            this.select(this.matchList[this.highlightIndex]);
        }
    }

    protected wrapStrong(query: string): string {
        return `<strong>${query}</query>`;
    }
}
