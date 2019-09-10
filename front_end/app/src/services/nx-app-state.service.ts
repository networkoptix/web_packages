import { Injectable }                from '@angular/core';
import { NxConfigService}            from './nx-config';
import { BehaviorSubject }           from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class NxAppStateService {
    config: any;
    footerVisibleObservable = new BehaviorSubject(true);

    constructor(private _config: NxConfigService) {
        this.config = this._config.getConfig();
    }

    setFooterVisibility(visibile) {
        this.footerVisibleObservable.next(visibile);
    }
}
