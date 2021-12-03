import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { isArray } from 'rxjs/internal-compatibility';

import { NxSearchService } from '@services/search.service';
import { NxUtilsService } from '@services/utils.service';

@Injectable({
    providedIn: 'root'
})
export class NxMenuService implements OnDestroy {
    selectedSectionSubject = new BehaviorSubject('');
    selectedSubSectionSubject = new BehaviorSubject([]);
    selectedDetailsSection = new BehaviorSubject<string>('');
    contentSubject = new BehaviorSubject([]);
    navItemSubject = new BehaviorSubject('');

    private regex;
    private _hoverItemId;

    constructor(private searchService: NxSearchService) {
    }

    set content(content) {
        this.contentSubject.next(content);
    }

    get content() {
        return this.contentSubject.getValue();
    }

    set navItemId(id) {
        this.navItemSubject.next(id);
    }

    get navItemId() {
        return this.navItemSubject.getValue();
    }

    set hoverItemId(id) {
        this._hoverItemId = id;
    }

    get hoverItemId() {
        return this._hoverItemId;
    }

    get section() {
        return this.selectedSectionSubject.getValue();
    }

    set section(section) {
        this.selectedSectionSubject.next(section);
    }

    get detail() {
        return this.selectedDetailsSection.getValue();
    }

    set detail(section) {
        this.selectedDetailsSection.next(section);
    }

    set subSection(section) {
        this.selectedSubSectionSubject.next(section);
    }

    get subSection() {
        return this.selectedSubSectionSubject.getValue();
    }

    ngOnDestroy() {
        this.selectedSectionSubject.unsubscribe();
        this.selectedSubSectionSubject.unsubscribe();
        this.selectedDetailsSection.unsubscribe();
        this.contentSubject.unsubscribe();
    }

    getItemBy(id) {
        for (const node of this.content) {
            if (node.level3?.length) {
                const match = node.level3.filter((item) => {
                    return item.id === id;
                });

                if (match.length) {
                    return match[0];
                }
            }
        }

        return undefined;
    }

    getAdditionalText(label) {
        if (typeof label === 'function') {
            return label();
        } else if (isArray(label)) {
            return label[0];
        } else {
            return label;
        }
    }

    isEqual(currentContent, newContent, nodeGroup) {
        return NxUtilsService.isEqual(
            currentContent.filter(node => node.id === nodeGroup),
            newContent.filter(node => node.id === nodeGroup)
        );
    }

    hasUpdatedContent(content) {
        const cleanedContent = this.cleanUpAdditionalTextIfNeeded(content);
        return !NxUtilsService.isEqual(cleanedContent, content) ||
            !this.isEqual(cleanedContent, content, 'cameras') ||
            !this.isEqual(cleanedContent, content, 'users') ||
            !this.isEqual(cleanedContent, content, 'servers');
    }

    // level-3-item adds additionalText if it doesn't exist
    // cleaning that up if it was added for hasUpdatedContent comparison
    cleanUpAdditionalTextIfNeeded(newContent) {
        return this.content.map(c => {
            const node = newContent.find(nC => nC.id === c.id)?.level3;
            if (!node?.[0]?.additionalText && c?.level3?.[0]?.additionalText) {
                c.level3 = c.level3.map(menuItem => {
                    const { additionalText, ...item } = menuItem;
                    return item;
                });
            }
            return c;
        });
    }

    filterItemsBy(model, searchSubMenus = false) {
        let filteredContent = [];
        if (model.query) {
            this.setHighlightPattern(model);

            this.content.forEach((node) => {
                if (searchSubMenus && node.level2?.length) {
                    node.level2.forEach(subNode => {
                        if (subNode.level3?.length) {
                            const haveNode = this.filterNodesIntoHaveNode(
                                model, filteredContent, node, subNode
                            );
                            if (haveNode?.level3?.length) {
                                this.addHaveNodeToFilteredContent(
                                    haveNode, filteredContent
                                );
                            }
                        }
                    });
                }
                if (node.level3?.length) {
                    const haveNode = this.filterNodesIntoHaveNode(
                        model, filteredContent, node
                    );
                    if (haveNode?.level3?.length) {
                        this.addHaveNodeToFilteredContent(
                            haveNode, filteredContent
                        );
                    }
                }
            });
        } else {
            filteredContent = [...this.content];
        }

        return filteredContent;
    }

    addHaveNodeToFilteredContent(haveNode, filteredContent) {
        // remove separator if last in search result
        if (haveNode.level3[haveNode.level3.length - 1].horizontal) {
            haveNode.level3.pop();
        }
        filteredContent.push(haveNode);
    }

    filterNodesIntoHaveNode(model, filteredContent, node, subNode = undefined) {
        let haveNode = filteredContent.find((filtered) => filtered.id === (subNode || node).id);
        (subNode || node).level3.forEach(item => {
            if (item.id) {
                const additional: string = this.getAdditionalText(item.additionalLabel);

                let searchAggregate = item.label || '';
                searchAggregate += (additional) ? ' ' + additional : '';
                searchAggregate += (model.query.length > 10 && item.id) ? ' ' + item.id : '';

                if (this.searchService.findMatch(searchAggregate, model)) {
                    if (!haveNode) {
                        haveNode = { ...node };
                        haveNode.level3 = []; // remove items so we can all only matches
                    }
                    const filteredItem = NxUtilsService.deepCopy(item);
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

    sanitizeContent(content) {
        const clean = NxUtilsService.deepCopy(content);
        return clean.map((node) => {
            if (node.level3?.length) {
                node.level3.forEach(item => {
                    if (item.label) {
                        item.label = NxUtilsService.htmlToEntity(item.label);
                    }
                    if (item.additionalLabel) {
                        item.additionalLabel = NxUtilsService.htmlToEntity(
                            item.additionalLabel
                        );
                    }
                    if (item.additionalText) {
                        item.additionalText = NxUtilsService.htmlToEntity(
                            item.additionalText
                        );
                    }
                });
            }
            return node;
        });
    }

    cleanMenuContent(content) {
        const clean = NxUtilsService.deepCopy(content);
        return clean.map((node) => {
            delete node.toggle;
            return node;
        });
    }

    private setHighlightPattern(model) {
        const pattern = (model.queryExactMatch ||
            model.queryEndsWith ||
            model.queryStartsWith ||
            model.queryOrMatch ||
            model.queryAndMatch).join('|');

        // query will be broken in tokens so attempted html/js injection will fail
        // pattern = NxUtilsService.escapeRegExp(pattern);

        this.regex = new RegExp(pattern, 'gi');
    }

    private highlighted(item) {
        if (item.label) {
            item.label = item.label.replace(
                this.regex,
                (match) => `<span class="highlighted">${match}</span>`
            );
        }

        if (item.additionalText) {
            item.additionalText = item.additionalText.replace(
                this.regex,
                (match) => `<span class="highlighted">${match}</span>`
            );
        }

        return item;
    }
}
