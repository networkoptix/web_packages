import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject }       from 'rxjs';
import { NxUtilsService }        from '../services/utils.service';

@Injectable({
    providedIn: 'root'
})
export class NxMenuService implements OnDestroy {
    selectedSectionSubject = new BehaviorSubject([]);
    selectedSubSectionSubject = new BehaviorSubject([]);
    selectedDetailsSection = new BehaviorSubject([]);
    contentSubject = new BehaviorSubject([]);

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

    fillerItems(filter) {
        let filteredContent = [];
        if (filter) {
            const _filter = filter.toLowerCase();
            // eslint-disable-next-line no-useless-escape
            let pattern = _filter.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
            pattern = pattern.split(',').filter((t) => {
                return t.length > 0;
            }).join('|');
            this.content.forEach((node) => {
                if (node.level3 && node.level3.length) {
                    let haveNode = filteredContent.find((filtered) => filtered.id === node.id);
                    node.level3.forEach((item) => {
                        if (item.label && item.label.toLowerCase().includes(_filter)) {
                            if (!haveNode) {
                                haveNode = { ...node };
                                haveNode.level3 = []; // remove items so we can all only matches
                            }
                            const filteredItem = { ...item };
                            filteredItem.query = { search: _filter };
                            haveNode.level3.push(NxMenuService.highlighted(filteredItem, pattern));
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

    private static highlighted(item, pattern) {
        const regex = new RegExp(pattern, 'gi');
        item.label = item.label.replace(regex, (match) => `<span class="highlighted">${match}</span>`);

        return item;
    }
}
