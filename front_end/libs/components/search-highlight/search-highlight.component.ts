import { Component, Input, OnChanges } from '@angular/core';
import { escapeRegExp } from 'lodash-es';

import { CoercedBoolInput, IBool } from '@decorators/ibool';
import type { NgChanges } from '@utils/ng-changes';

/**
 * Component to highlight text matching a search without using `innerHTML`.
 *
 * `String.prototype.split()` including captured groups when a regular expression
 * is used as the separator allows us to split a string such that odd-indexed
 * substrings are the matches to highlight.
 *
 * IMPORTANT: When creating the search expression, the entire expression should
 * be one capturing group, with no other capturing groups inside e.g. `/(searchterm)/`
 * (non-capturing groups are okay).
 *
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/split#splitting_with_a_regexp_to_include_parts_of_the_separator_in_the_result
 */
@Component({
    selector: 'nx-search-highlight',
    templateUrl: 'search-highlight.component.html',
    styleUrls: ['search-highlight.component.scss'],
})
export class NxSearchHighlightComponent implements OnChanges {
    @Input() text: string;
    @Input() search: string | RegExp;
    @Input() flags: string = 'i';
    @Input() @IBool() bold: CoercedBoolInput = false;

    subStrings: string[] = [];

    trackBy(index: number, _item: string): number {
        return index;
    }

    ngOnChanges({ text, search, flags }: NgChanges<NxSearchHighlightComponent>): void {
        const textValue = text ? text.currentValue : this.text;
        const searchValue = search ? search.currentValue : this.search;
        const flagsValue = flags ? flags.currentValue : this.flags;
        // Use current value when only one changes

        if (!textValue || !searchValue) {
            this.subStrings = textValue ? [textValue] : [];
        }

        this.subStrings = textValue.split(
            typeof searchValue === 'string'
                ? new RegExp(`(${escapeRegExp(searchValue)})`, flagsValue)
                : searchValue,
        );
    }
}
