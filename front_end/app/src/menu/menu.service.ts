import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject }       from 'rxjs';

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
            this.content.forEach((node) => {
                if (node.level3 && node.level3.length) {
                    let haveNode = filteredContent.find((filtered) => filtered.id === node.id);
                    node.level3.forEach((item) => {
                        if (item.label && item.label.toLowerCase().includes(_filter)) {
                            if (!haveNode) {
                                haveNode = { ...node };
                                haveNode.level3 = []; // remove items so we can all only matches
                            }
                            haveNode.level3.push(...item);
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
}
