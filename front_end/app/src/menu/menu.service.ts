import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject }       from 'rxjs';
import { NxUtilsService }        from '../services/utils.service';
import { NxSearchService }       from '../services/search.service';
import { isArray }               from 'rxjs/internal-compatibility';

@Injectable({
    providedIn: 'root'
})
export class NxMenuService implements OnDestroy {
    selectedSectionSubject = new BehaviorSubject('');
    selectedSubSectionSubject = new BehaviorSubject([]);
    selectedDetailsSection = new BehaviorSubject('');
    contentSubject = new BehaviorSubject([]);
    navItemSubject = new BehaviorSubject('');

    private regex;

    constructor() {
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

    setSubSection(section) {
        this.selectedSubSectionSubject.next(section);
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

    fillerItemsBy(model) {
        let filteredContent = [];
        if (model.query) {
            this.setHighlightPattern(model);

            this.content.forEach((node) => {
                if (node.level3?.length) {
                    let haveNode = filteredContent.find((filtered) => filtered.id === node.id);
                    node.level3.forEach((item) => {
                        let searchAggregate = item.label;
                        searchAggregate += (item.additionalLabel) ? ' ' + item.additionalLabel : '';
                        searchAggregate += (model.query.length > 10 && item.id) ? ' ' + item.id : '';

                        if (NxSearchService.findMatch(searchAggregate, model)) {
                            if (!haveNode) {
                                haveNode = { ...node };
                                haveNode.level3 = []; // remove items so we can all only matches
                            }
                            const filteredItem = NxUtilsService.deepCopy(item);
                            filteredItem.query = { search: model.query };
                            haveNode.level3.push(this.highlighted(filteredItem));
                        }
                    });
                    if (haveNode?.level3?.length) {
                        filteredContent.push(haveNode);
                    }
                }
            });
        } else {
            filteredContent = [...this.content];
        }

        return filteredContent;
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

        this.regex = new RegExp(pattern, 'gi');
    }

    private highlighted(item) {
        if (item.label) {
            item.label = item.label.replace(this.regex, (match) => `<span class="highlighted">${match}</span>`);
        }

        if (item.additionalLabel) {
            if (isArray(item.additionalLabel)) {
                item.additionalLabel[0] = item.additionalLabel[0].replace(this.regex, (match) => `<span class="highlighted">${match}</span>`);
            } else {
                item.additionalLabel = item.additionalLabel.replace(this.regex, (match) => `<span class="highlighted">${match}</span>`);
            }
        }

        return item;
    }
}
