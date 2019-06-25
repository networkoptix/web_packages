import { Injectable, OnDestroy }       from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { NxCloudApiService }           from '../../../services/nx-cloud-api';
import { NxConfigService }             from '../../../services/nx-config';

@Injectable({
    providedIn: 'root'
})
export class NxSettingsService implements OnDestroy {
    config: any = {};
    systemSubject = new BehaviorSubject(undefined);
    selectedSectionSubject = new BehaviorSubject([]);
    plugin: any = {};
    inReview: boolean;

    constructor(private api: NxCloudApiService,
                private configService: NxConfigService) {

        this.config = this.configService.getConfig();
    }

    setSystem(system) {
        this.systemSubject.next(system);
    }

    setSection(section) {
        this.selectedSectionSubject.next(section);
    }

    ngOnDestroy() {
        this.systemSubject.unsubscribe();
    }
}
