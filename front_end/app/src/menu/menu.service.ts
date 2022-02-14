import { Injectable, OnDestroy } from '@angular/core';
import { isEqual, cloneDeep } from 'lodash-es';
import { BehaviorSubject } from 'rxjs';
import { isArray } from 'rxjs/internal-compatibility';

import { NxSearchService, SearchModel } from '@services/search.service';
import { htmlToEntity } from '@utils/general';

import type {
    Level1Item,
    SanitizedLevel1Item,
    Level2Item,
    SanitizedLevel3Item,
} from './menu.types';

@Injectable({
    providedIn: 'root'
})
export class NxMenuService implements OnDestroy {
    selectedSectionSubject = new BehaviorSubject<string>('');
    selectedSubSectionSubject = new BehaviorSubject<string>('');
    selectedDetailsSection = new BehaviorSubject<string>('');
    contentSubject = new BehaviorSubject<SanitizedLevel1Item[]>([]);
    navItemSubject = new BehaviorSubject<string>('');

    private regex: RegExp;
    private _hoverItemId: string;

    constructor(private searchService: NxSearchService) {
    }

    set content(content: SanitizedLevel1Item[]) {
        this.contentSubject.next(content);
    }

    get content(): SanitizedLevel1Item[] {
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
        this.selectedSectionSubject.unsubscribe();
        this.selectedSubSectionSubject.unsubscribe();
        this.selectedDetailsSection.unsubscribe();
        this.contentSubject.unsubscribe();
    }

    getItemBy(id: string): SanitizedLevel3Item | void {
        for (const node of this.content) {
            if (node.level3?.length) {
                const match = node.level3.find(item => item.id === id);
                if (match) {
                    return match;
                }
            }
        }
    }

    getAdditionalText<T = any>(label: unknown): T {
        if (typeof label === 'function') {
            return label();
        } else if (isArray(label)) {
            return label[0];
        } else {
            return label as T;
        }
    }

    isEqual(
        currentContent: Level1Item[],
        newContent: Level1Item[],
        nodeGroup: string
    ): boolean {
        return isEqual(
            currentContent.filter(node => node.id === nodeGroup),
            newContent.filter(node => node.id === nodeGroup)
        );
    }

    hasUpdatedContent(content: Level1Item[]): boolean {
        const cleanedContent = this.cleanUpAdditionalTextIfNeeded(content);
        return !isEqual(cleanedContent, content) ||
            !this.isEqual(cleanedContent, content, 'cameras') ||
            !this.isEqual(cleanedContent, content, 'users') ||
            !this.isEqual(cleanedContent, content, 'servers');
    }

    // level-3-item adds additionalText if it doesn't exist
    // cleaning that up if it was added for hasUpdatedContent comparison
    cleanUpAdditionalTextIfNeeded(
        newContent: Level1Item[]
    ): Omit<Level1Item, 'additionalText'>[] {
        return this.content.map(c => {
            const node = newContent.find(nC => nC.id === c.id)?.level3;
            if (!node?.[0]?.additionalText && c?.level3?.[0]?.additionalText) {
                c.level3.forEach(menuItem => delete menuItem.additionalText);
            }
            return c;
        });
    }

    filterItemsBy(
        model: SearchModel,
        searchSubMenus: boolean = false
    ): SanitizedLevel1Item[] {
        let filteredContent: SanitizedLevel1Item[] = [];
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
                                subNode
                            );
                            if (haveNode?.level3?.length) {
                                this.addHaveNodeToFilteredContent(
                                    haveNode,
                                    filteredContent
                                );
                            }
                        }
                    });
                }
                if (node.level3?.length) {
                    const haveNode = this.filterNodesIntoHaveNode(
                        model,
                        filteredContent,
                        node
                    );
                    if (haveNode?.level3?.length) {
                        this.addHaveNodeToFilteredContent(
                            haveNode,
                            filteredContent
                        );
                    }
                }
            });
        } else {
            filteredContent = [...this.content];
        }

        return filteredContent;
    }

    addHaveNodeToFilteredContent(
        haveNode: Level1Item,
        filteredContent: Level1Item[]
    ): void {
        // remove separator if last in search result
        if (haveNode.level3[haveNode.level3.length - 1].horizontal) {
            haveNode.level3.pop();
        }
        filteredContent.push(haveNode);
    }

    filterNodesIntoHaveNode(
        model: SearchModel,
        filteredContent: SanitizedLevel1Item[],
        node: SanitizedLevel1Item,
        subNode?: Level2Item
    ): SanitizedLevel1Item {
        let haveNode = filteredContent.find(filtered =>
            filtered.id === (subNode || node).id
        );

        (subNode || node).level3.forEach(item => {
            if (item.id) {
                const additional = this.getAdditionalText<string>(
                    item.additionalLabel
                );

                let searchAggregate = item.label || '';
                searchAggregate += additional ? ' ' + additional : '';
                searchAggregate += (model.query.length > 10 && item.id)
                    ? ' ' + item.id
                    : '';

                if (this.searchService.findMatch(searchAggregate, model)) {
                    if (!haveNode) {
                        haveNode = { ...node };
                        haveNode.level3 = []; // remove items so we can all only matches
                    }
                    const filteredItem = cloneDeep(item);
                    filteredItem.additionalText = additional;
                    filteredItem.subNode = subNode || node;
                    filteredItem.query = { search: model.query };
                    haveNode.level3.push(this.highlighted(filteredItem));
                }
            } else {
                haveNode?.level3.push(item);
            }
        });
        if (haveNode && subNode) {
            haveNode.label = haveNode.label + ' - ' + subNode.label;
        }
        return haveNode;
    }

    sanitizeContent(content: Level1Item[]): SanitizedLevel1Item[] {
        const clean = cloneDeep(content);
        return clean.map(node => {
            if (node.level3?.length) {
                node.level3.forEach(item => {
                    if (item.label) {
                        item.label = htmlToEntity(item.label);
                    }
                    if (item.additionalLabel) {
                        item.additionalLabel = htmlToEntity(
                            item.additionalLabel
                        );
                    }
                    if (item.additionalText) {
                        item.additionalText = htmlToEntity(
                            item.additionalText
                        );
                    }
                });
            }
            return node as SanitizedLevel1Item;
        });
    }

    cleanMenuContent(content: Level1Item[]): Level1Item[] {
        const clean = cloneDeep(content);
        return clean.map(node => {
            delete node.toggle;
            return node;
        });
    }

    private setHighlightPattern(model: SearchModel): void {
        const pattern = (
            model.queryExactMatch ||
            model.queryEndsWith ||
            model.queryStartsWith ||
            model.queryOrMatch ||
            model.queryAndMatch
        /* Assuming that NxMenuService.setHighlightPattern() is only called
        after NxSearchService.getMatchPatterns(), which will always make
        one of the above type string[] */
        // @ts-ignore
        ).join('|');

        this.regex = new RegExp(pattern, 'gi');
    }

    private highlighted(item: SanitizedLevel3Item): SanitizedLevel3Item {
        if (item.label) {
            item.label = item.label.replace(
                this.regex,
                match => `<span class="highlighted">${match}</span>`
            );
        }

        if (item.additionalText) {
            item.additionalText = item.additionalText.replace(
                this.regex,
                match => `<span class="highlighted">${match}</span>`
            );
        }

        return item;
    }
}
