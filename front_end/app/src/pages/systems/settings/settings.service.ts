import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject }       from 'rxjs';
import { NxRibbonService } from '@components/ribbon';
import { NxLanguageProviderService } from '@services/nx-language-provider';

@Injectable({
    providedIn: 'root'
})
export class NxSettingsService implements OnDestroy {
    footerSubject = new BehaviorSubject(false);
    systemSubject = new BehaviorSubject<any>(false);
    selectedSectionSubject = new BehaviorSubject([]);

    constructor(
        private ribbonService: NxRibbonService,
        private languageService: NxLanguageProviderService
    ) {}

    get system() {
        return this.systemSubject.getValue();
    }

    set system(system) {
        system?.id !== this.system?.id && this.system?.stopPoll();
        this.systemSubject.next(system);
    }

    setSection(section) {
        this.selectedSectionSubject.next(section);
    }

    ngOnDestroy() {
        this.systemSubject.unsubscribe();
    }
}
