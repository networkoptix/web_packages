import { Injectable, signal, WritableSignal } from '@angular/core';
import { cloneDeep } from 'lodash-es';

import { NxSearchService } from '@services/search.service';
import type { SearchModel } from '@services/search.service.types';

import type { Level1Item, Level3Item } from './menu.types';

@Injectable({
    providedIn: 'root',
})
export class NxMenuService {
    content: WritableSignal<Level1Item[]> = signal([]);
    hoverItemId: WritableSignal<string> = signal('');
    navItemId: WritableSignal<string> = signal('');

    searchRegex = signal<string | RegExp>('');

    selectedSection: WritableSignal<string> = signal('');
    selectedSubSection: WritableSignal<string> = signal('');
    selectedDetailsSection: WritableSignal<string> = signal('');

    constructor(private searchService: NxSearchService) {}

    getItemBy(id: string): Level3Item | undefined {
        for (const node of this.content()) {
            if (node.level3?.length) {
                const match = node.level3.find(item => item.id === id);
                if (match) {
                    return match;
                }
            }
        }
    }

    filterMenu(model: SearchModel): Level1Item[] {
        const content = cloneDeep(this.content());
        if (!model.query) {
            this.searchRegex.set('');
            return content;
        }
        this.setHighlightPattern(model);
        return content.reduce(
            (menu, level1) => {
                level1.level3 = level1.level3?.filter(item => {
                    const { additionalLabel } = item;

                    let searchAggregate = item.label || '';
                    searchAggregate += additionalLabel ? ` ${additionalLabel}` : '';
                    searchAggregate += model.query.length > 10 && item.id ? ` ${item.id}` : '';

                    return this.searchService.findMatch(searchAggregate, model);
                });
                if (level1.level3?.length) {
                    menu.push(level1);
                }
                return menu;
            },
            <Level1Item[]>[],
        );
    }

    /**
     * Deletes toggle property on level 1 items for deep equality comparisons
     */
    cleanMenuContent(content: Level1Item[]): Level1Item[] {
        const clean = cloneDeep(content);
        return clean.map(node => {
            delete node.toggle;
            return node;
        });
    }

    /**
     * Generates regex for highlighting labels.
     *
     * Should only be used after `NxSearchService.getMatchPatterns()`,
     * which will always make one of the search model matches type `string[]`.
     *
     * @param model Search model
     */
    private setHighlightPattern(model: SearchModel): void {
        const match = [
            model.queryExactMatch,
            model.queryEndsWith,
            model.queryStartsWith,
            model.queryOrMatch,
            model.queryAndMatch,
        ].find(m => Array.isArray(m)) as string[];

        this.searchRegex.set(new RegExp(`(${match.join('|')})`, 'i'));
    }
}
