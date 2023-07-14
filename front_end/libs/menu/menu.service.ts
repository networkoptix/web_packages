import { Injectable, signal, WritableSignal } from '@angular/core';
import { cloneDeep } from 'lodash-es';

import { NxSearchService } from '@services/search.service';
import type { SearchModel } from '@services/search.service.types';

import type { Level1Item, Level2Item, Level3Item } from './menu.types';

@Injectable({
    providedIn: 'root',
})
export class NxMenuService {
    content: WritableSignal<Level1Item[]> = signal([]);
    hoverItemId: WritableSignal<string> = signal('');
    navItemId: WritableSignal<string> = signal('');

    searchRegex: WritableSignal<RegExp> = signal(null);

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

    filterItemsBy(model: SearchModel, searchSubMenus: boolean = false): Level1Item[] {
        let filteredContent: Level1Item[] = [];
        if (model.query) {
            this.setHighlightPattern(model);

            this.content().forEach(node => {
                if (searchSubMenus && node.level2?.length) {
                    node.level2.forEach(subNode => {
                        if (subNode.level3?.length) {
                            const haveNode = this.filterNodesIntoHaveNode(
                                model,
                                filteredContent,
                                node,
                                subNode,
                            );
                            if (haveNode?.level3?.length) {
                                this.addHaveNodeToFilteredContent(haveNode, filteredContent);
                            }
                        }
                    });
                }
                if (node.level3?.length) {
                    const haveNode = this.filterNodesIntoHaveNode(model, filteredContent, node);
                    if (haveNode?.level3?.length) {
                        this.addHaveNodeToFilteredContent(haveNode, filteredContent);
                    }
                }
            });
        } else {
            this.searchRegex.set(null);
            filteredContent = [...this.content()];
        }

        return filteredContent;
    }

    addHaveNodeToFilteredContent(haveNode: Level1Item, filteredContent: Level1Item[]): void {
        // remove separator if last in search result
        if (haveNode.level3[haveNode.level3.length - 1].horizontal) {
            haveNode.level3.pop();
        }
        filteredContent.push(haveNode);
    }

    filterNodesIntoHaveNode(
        model: SearchModel,
        filteredContent: Level1Item[],
        node: Level1Item,
        subNode?: Level2Item,
    ): Level1Item {
        let haveNode = filteredContent.find(filtered => filtered.id === (subNode || node).id);

        (subNode || node).level3.forEach(item => {
            if (item.id) {
                const { additionalLabel } = item;

                let searchAggregate = item.label || '';
                searchAggregate += additionalLabel ? ` ${additionalLabel}` : '';
                searchAggregate += model.query.length > 10 && item.id ? ` ${item.id}` : '';

                if (this.searchService.findMatch(searchAggregate, model)) {
                    if (!haveNode) {
                        haveNode = { ...node };
                        haveNode.level3 = []; // remove items so we can all only matches
                    }
                    const filteredItem = cloneDeep(item);
                    filteredItem.subNode = subNode || node;
                    filteredItem.query = { search: model.query };
                    haveNode.level3.push(filteredItem);
                }
            } else {
                haveNode?.level3.push(item);
            }
        });
        if (haveNode && subNode) {
            haveNode.label = `${haveNode.label} - ${subNode.label}`;
        }
        return haveNode;
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
