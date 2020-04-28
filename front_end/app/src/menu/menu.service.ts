import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject }       from 'rxjs';
import { NxUtilsService }        from '../services/utils.service';
import { NxSearchService }       from '../services/search.service';

@Injectable({
    providedIn: 'root'
})
export class NxMenuService implements OnDestroy {
    selectedSectionSubject = new BehaviorSubject([]);
    selectedSubSectionSubject = new BehaviorSubject([]);
    selectedDetailsSection = new BehaviorSubject([]);
    contentSubject = new BehaviorSubject([]);

    private regex: any;

    constructor() {
    }

    set content(content) {
        this.contentSubject.next(content);
    }

    get content() {
        return this.contentSubject.getValue();
    }

    setSection(section) {
        this.selectedSectionSubject.next(section);
    }

    setSubSection(section) {
        this.selectedSubSectionSubject.next(section);
    }

    setDetailsSection(section) {
        this.selectedDetailsSection.next(section);
    }

    ngOnDestroy() {
        this.selectedSectionSubject.unsubscribe();
        this.selectedSubSectionSubject.unsubscribe();
        this.selectedDetailsSection.unsubscribe();
        this.contentSubject.unsubscribe();
    }

    fillerItemsBy(model) {
        let filteredContent = [];
        if (model.query) {
            this.setHighlightPattern(model);

            this.content.forEach((node) => {
                if (node.level3 && node.level3.length) {
                    let haveNode = filteredContent.find((filtered) => filtered.id === node.id);
                    node.level3.forEach((item) => {
                        // TODO: searching currently only by label
                        //  ... need to clarify search fields with APats - menu items have only label and id
                        if (NxSearchService.findMatch(item.label, model)) {
                            if (!haveNode) {
                                haveNode = { ...node };
                                haveNode.level3 = []; // remove items so we can all only matches
                            }
                            const filteredItem = { ...item };
                            filteredItem.query = { search: model.query };
                            haveNode.level3.push(this.highlighted(filteredItem));
                        }
                    });
                    if (haveNode && haveNode.level3 && haveNode.level3.length) {
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
        item.label = item.label.replace(this.regex, (match) => `<span class="highlighted">${match}</span>`);

        return item;
    }
}
