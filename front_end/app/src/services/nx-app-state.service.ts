import { Injectable }                from '@angular/core';
import { NxConfigService }            from './nx-config/nx-config.service';
import { BehaviorSubject }           from 'rxjs';
import { IConfig } from './nx-config/config-types';

@Injectable({
    providedIn : 'root'
})
export class NxAppStateService {
    CONFIG: IConfig;

    footerVisibleSubject = new BehaviorSubject(true);
    headerVisibleSubject = new BehaviorSubject(true);
    readySubject = new BehaviorSubject(false);

    constructor(configService: NxConfigService) {
        this.CONFIG = configService.getConfig();
    }

    setFooterVisibility(visible: boolean) {
        this.footerVisibleSubject.next(visible);
    }

    setHeaderVisibility(visible: boolean) {
        this.headerVisibleSubject.next(visible);
    }

    set ready(ready: boolean) {
        this.readySubject.next(ready);
    }

    get ready() {
        return this.readySubject.getValue();
    }
}
