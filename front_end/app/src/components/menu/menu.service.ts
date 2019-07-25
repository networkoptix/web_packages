import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject }       from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class NxMenuService implements OnDestroy {
    selectedSectionSubject = new BehaviorSubject([]);

    constructor() {
    }

    setSection(section) {
        this.selectedSectionSubject.next(section);
    }

    ngOnDestroy() {
        this.selectedSectionSubject.unsubscribe();
    }
}