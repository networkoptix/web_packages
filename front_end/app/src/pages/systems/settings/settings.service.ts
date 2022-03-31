import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class NxSettingsService implements OnDestroy {
    footerSubject = new BehaviorSubject(false);
    systemSubject = new BehaviorSubject<any>(false);
    selectedSectionSubject = new BehaviorSubject([]);

    constructor() {}

    get system() {
        return this.systemSubject.getValue();
    }

    set system(system) {
        this.system && system?.id !== this.system?.id && this.system?.stopPoll();
        this.systemSubject.next(system);
    }

    setSection(section) {
        this.selectedSectionSubject.next(section);
    }

    ngOnDestroy(): void {
        this.systemSubject.unsubscribe();
    }
}
