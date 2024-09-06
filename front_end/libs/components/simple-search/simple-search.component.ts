import { CommonModule } from '@angular/common';
import { Component, forwardRef, HostListener, Input, OnChanges, OnInit } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { escape, escapeRegExp } from 'lodash-es';
import { NgxTranslateCutModule } from 'ngx-translate-cut';

import { NxSearchHighlightComponent } from '@components/search-highlight/search-highlight.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import staticLang from '@language_static';
import { icons } from '@static-variables';
import { spaceSplitSearch } from '@utils/general';
import { NgChanges } from '@utils/ng-changes';

import type { SuggestionList, Suggestions } from './simple-search.types';

@Component({
    selector: 'nx-simple-search',
    templateUrl: 'simple-search.component.html',
    styleUrls: ['simple-search.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        AngularSvgIconModule,
        NgxTranslateCutModule,
        TranslateModule,
        NxSearchHighlightComponent,
        NxAddSvgSrcDirective,
    ],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => NxSimpleSearchComponent),
            multi: true,
        },
    ],
})
export class NxSimpleSearchComponent implements ControlValueAccessor, OnInit, OnChanges {
    @Input() placeholder: string;
    @Input() suggestions?: Suggestions;
    @Input() noMatchMsg?: string;

    search: string = '';
    searchRegex: RegExp;

    LANG = staticLang;
    icons = icons;

    escapeHTML = escape;

    dropdownOpen: boolean = false;
    matchList: SuggestionList;
    matchSections: [string, string[]][];
    matchIndexes: [number, number | undefined];

    private _matchSections(): this['matchSections'] | undefined {
        if (!this.suggestions || Array.isArray(this.suggestions)) {
            return;
        }
        const matches: this['matchSections'] = [];
        Object.entries(this.suggestions).forEach(([sectionName, sectionList]) => {
            const sectionMatches = spaceSplitSearch(sectionList, this.search);
            if (sectionMatches.length) {
                matches.push([sectionName, sectionMatches]);
            }
        });

        return matches;
    }

    private _matchList(): SuggestionList | undefined {
        if (!this.suggestions || !Array.isArray(this.suggestions)) {
            return;
        }
        return spaceSplitSearch(this.suggestions, this.search);
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
        if (!suggestions) {
            return;
        }
        if (suggestions.currentValue) {
            this.matchIndexes = undefined;
            this.matchList = this._matchList();
            this.matchSections = this._matchSections();
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
            this.searchRegex = undefined;
        } else {
            // Close before updating and update before opening to avoid
            // content change flashes
            if (!open) {
                this.dropdownOpen = false;
                this.matchIndexes = undefined;
            }
            if (this.suggestions) {
                this.matchList = this._matchList();
                this.matchSections = this._matchSections();
                const searches = this.search
                    .trim()
                    .split(/\s+/)
                    .map(s => `(?:${escapeRegExp(s)})`)
                    .join('|');
                this.searchRegex = new RegExp(`(${searches})`, 'i');
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
                    this.matchIndexes = [matchesLen - 1, lastSection.length - 1];
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
                    this.matchIndexes = [matchesLen - 1, lastSection.length - 1];
                    // Loop back to end
                }
            }
        }
    }

    keyboardSelect(): void {
        this.dropdownOpen = false;
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
