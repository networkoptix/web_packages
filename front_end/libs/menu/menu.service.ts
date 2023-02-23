import { Injectable, OnDestroy } from '@angular/core';
import { cloneDeep } from 'lodash-es';
import { BehaviorSubject } from 'rxjs';

import { NxSearchService } from '@services/search.service';
import type { SearchModel } from '@services/search.service.types';

import type { Level1Item, Level2Item, Level3Item } from './menu.types';

@Injectable({
    providedIn: 'root',
})
export class NxMenuService implements OnDestroy {
    selectedSectionSubject = new BehaviorSubject<string>('');
    selectedSubSectionSubject = new BehaviorSubject<string>('');
    selectedDetailsSection = new BehaviorSubject<string>('');
    contentSubject = new BehaviorSubject<Level1Item[]>([]);
    navItemSubject = new BehaviorSubject<string>('');
    searchRegexSubject = new BehaviorSubject<RegExp>(null);

    private _hoverItemId: string;

    constructor(private searchService: NxSearchService) {}

    set content(content: Level1Item[]) {
        this.contentSubject.next(content);
    }

    get content(): Level1Item[] {
        return this.contentSubject.getValue();
    }

    set navItemId(id: string) {
        this.navItemSubject.next(id);
    }

    get navItemId(): string {
        return this.navItemSubject.getValue();
    }

    set hoverItemId(id: string) {
        this._hoverItemId = id;
    }

    get hoverItemId(): string {
        return this._hoverItemId;
    }

    get section(): string {
        return this.selectedSectionSubject.getValue();
    }

    set section(section: string) {
        this.selectedSectionSubject.next(section);
    }

    get detail(): string {
        return this.selectedDetailsSection.getValue();
    }

    set detail(section: string) {
        this.selectedDetailsSection.next(section);
    }

    set subSection(section: string) {
        this.selectedSubSectionSubject.next(section);
    }

    get subSection(): string {
        return this.selectedSubSectionSubject.getValue();
    }

    ngOnDestroy(): void {
        this.selectedSectionSubject.complete();
        this.selectedSubSectionSubject.complete();
        this.selectedDetailsSection.complete();
        this.contentSubject.complete();
    }

    getItemBy(id: string): Level3Item | undefined {
        for (const node of this.content) {
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

            this.content.forEach(node => {
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
            this.searchRegexSubject.next(null);
            filteredContent = [...this.content];
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

        this.searchRegexSubject.next(new RegExp(`(${match.join('|')})`, 'i'));
    }
}
