import {
    Component,
    OnInit,
    forwardRef,
    Input,
    OnChanges,
    HostListener,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { escape } from 'lodash-es';

import staticLang from '@common/language/language_i18n_static.json';
import { icons } from '@lib/variables/static-variables';
import { caseInsenstiveSearch } from '@utils/general';
import { NgChanges } from '@utils/ng-changes';

import type { SuggestionList, Suggestions } from './simple-search.types';

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
export class NxSimpleSearchComponent implements ControlValueAccessor, OnInit, OnChanges {
    @Input() placeholder: string;
    @Input() suggestions?: Suggestions;
    @Input() noMatchMsg?: string;

    search: string = '';

    LANG = staticLang;
    icons = icons;

    escapeHTML = escape;

    dropdownOpen: boolean = false;
    matchList: SuggestionList;
    matchSections: [string, string[]][];
    matchIndexes: [number, number | undefined];

    private _matchSections(search: string): this['matchSections'] | undefined {
        if (!this.suggestions || Array.isArray(this.suggestions)) {
            return;
        }
        const matches: this['matchSections'] = [];
        Object.entries(this.suggestions).forEach(([sectionName, sectionList]) => {
            const sectionMatches = sectionList.filter(sg =>
                caseInsenstiveSearch(sg, search)
            );
            if (sectionMatches.length) {
                matches.push([sectionName, sectionMatches]);
            }
        });

        return matches;
    }

    private _matchList(search: string): SuggestionList | undefined {
        if (!this.suggestions || !Array.isArray(this.suggestions)) {
            return;
        }
        return this.suggestions.filter(sg =>
            caseInsenstiveSearch(sg, search)
        );
    }

    @HostListener('document:click', ['$event.target'])
    onDocumentClick(target: HTMLElement): void {
        if (!this.suggestions) {
            return;
        }
        if (!target.closest('nx-simple-search')) {
            this.dropdownOpen = false;
            this.matchIndexes = undefined;
            // Close dropdown on click outside
        }
    }

    ngOnInit(): void {
        this.placeholder ??= this.LANG.search.Search;
    }

    ngOnChanges({ suggestions }: NgChanges<NxSimpleSearchComponent>): void {
        if (suggestions.currentValue) {
            this.matchIndexes = undefined;
            this.matchList = this._matchList(this.search);
            this.matchSections = this._matchSections(this.search);
        } else {
            this.matchIndexes = undefined;
            this.matchList = undefined;
            this.matchSections = undefined;
        }
    }

    // ControlValueAccessor
    private onChange = (_: string): void => {};
    private onTouched = (): void => {};

    writeValue(value: string, open: boolean = false): void {
        this.search = value;
        if (!value) {
            this.dropdownOpen = false;
            this.matchList = undefined;
            this.matchSections = undefined;
        } else {
            // Close before updating and update before opening to avoid
            // content change flashes
            if (!open) {
                this.dropdownOpen = false;
                this.matchIndexes = undefined;
            }
            if (this.suggestions) {
                this.matchList = this._matchList(value);
                this.matchSections = this._matchSections(value);
            }
            if (open) {
                this.matchIndexes = undefined;
                this.dropdownOpen = true;
            }
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

    incrementMatchIndex(): void {
        if (!this.search || !this.suggestions) {
            return;
        }
        if (!this.dropdownOpen) {
            this.dropdownOpen = true;
        }
        if (Array.isArray(this.suggestions)) {
            if (!this.matchIndexes) {
                if (this.matchList.length) {
                    this.matchIndexes = [0, undefined];
                }
                // Do nothing if no matches
            } else if (this.matchIndexes[0] === this.matchList.length - 1) {
                this.matchIndexes = [0, undefined];
                // Loop back to beginning
            } else {
                this.matchIndexes[0] += 1;
            }
        } else {
            if (!this.matchIndexes) {
                if (this.matchSections.length) {
                    this.matchIndexes = [0, 0];
                }
            } else {
                const lastSection = this.matchIndexes[0] === this.matchSections.length - 1;
                const sectionLen = this.matchSections[this.matchIndexes[0]][1].length;
                const endOfSection = this.matchIndexes[1] === sectionLen - 1;
                if (!endOfSection) {
                    this.matchIndexes[1] += 1;
                    // Increment inside section
                } else if (endOfSection && !lastSection) {
                    this.matchIndexes[0] += 1;
                    this.matchIndexes[1] = 0;
                    // Increment to start of next section
                } else if (endOfSection && lastSection) {
                    this.matchIndexes = [0, 0];
                    // Loop back to beginning
                }
            }
        }
    }

    decrementMatchIndex(): void {
        if (!this.search || !this.suggestions || !this.dropdownOpen) {
            return;
        }
        if (Array.isArray(this.suggestions)) {
            if (!this.matchIndexes) {
                this.matchIndexes = [this.matchList.length - 1, undefined];
            } else if (this.matchIndexes[0] === 0) {
                this.matchIndexes = [this.matchList.length - 1, undefined];
            } else {
                this.matchIndexes[0] -= 1;
            }
        } else {
            // Up doesn't open dropdown, so if dropdown is open
            // matchSections have already been determined
            const matchesLen = this.matchSections.length;
            if (!this.matchIndexes) {
                if (matchesLen) {
                    const lastSection = this.matchSections[matchesLen - 1][1];
                    this.matchIndexes = [
                        matchesLen - 1,
                        lastSection.length - 1
                    ];
                }
            } else {
                const startOfSection = this.matchIndexes[1] === 0;
                const firstSection = this.matchIndexes[0] === 0;

                if (!startOfSection) {
                    this.matchIndexes[1] -= 1;
                    // Decrement inside section
                } else if (startOfSection && !firstSection) {
                    this.matchIndexes[0] -= 1;
                    const prevSection = this.matchSections[this.matchIndexes[0]][1];
                    this.matchIndexes[1] = prevSection.length - 1;
                    // Decrement to end of prev section
                } else if (startOfSection && firstSection) {
                    const lastSection = this.matchSections[matchesLen - 1][1];
                    this.matchIndexes = [
                        matchesLen - 1,
                        lastSection.length - 1
                    ];
                    // Loop back to end
                }
            }
        }
    }

    keyboardSelect(): void {
        if (!this.matchIndexes) {
            return;
        }
        if (Array.isArray(this.suggestions)) {
            this.writeValue(this.matchList[this.matchIndexes[0]]);
        } else {
            this.writeValue(this.matchSections[this.matchIndexes[0]][1][this.matchIndexes[1]]);
        }
    }

    // Default behavior of up/down keys is to navigate to input start/end
    preventUpDownDefault(event: Event): void {
        if (this.suggestions) {
            event.preventDefault();
        }
    }

    protected wrapStrong(query: string): string {
        return `<strong>${query}</query>`;
    }
}
